import json
import fitz  # PyMuPDF
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from config.permissions import require_auth
from apps.ai_tutor.models import AIChatSession, AIChatMessage
from apps.questions.models import Question
from apps.ai_tutor import gemini as gemini_service


# ─────────────────────────────────────────────
# POST /api/ai/sessions/ [student]
# ─────────────────────────────────────────────
@csrf_exempt
@require_auth(roles=["student"])
def create_session(request):
    """Tạo phiên chat AI mới cho student."""
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body) if request.body else {}
        context_type = data.get('context_type', 'general')
        context_id = data.get('context_id')

        session = AIChatSession.objects.create(
            user_id=request.user_id,
            context_type=context_type,
            context_id=context_id if context_id else None
        )

        return JsonResponse({
            "session_id": session.id,
            "context_type": session.context_type,
            "context_id": session.context_id,
            "created_at": session.created_at.isoformat()
        }, status=201)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ─────────────────────────────────────────────
# POST /api/ai/sessions/<id>/chat/ [student]
# ─────────────────────────────────────────────
@csrf_exempt
@require_auth(roles=["student"])
def chat(request, session_id):
    """Gửi tin nhắn, nhận gợi ý từ AI (student)."""
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        # Kiểm tra session thuộc về user này
        session = AIChatSession.objects.get(id=session_id, user_id=request.user_id)
    except AIChatSession.DoesNotExist:
        return JsonResponse({"error": "Session không tồn tại hoặc không có quyền"}, status=403)

    try:
        data = json.loads(request.body)
        user_message = data.get('message', '').strip()

        if not user_message:
            return JsonResponse({"error": "Tin nhắn không được rỗng"}, status=400)

        # Lưu tin nhắn của user
        AIChatMessage.objects.create(
            session=session,
            role='user',
            content=user_message
        )

        # Lấy 10 tin nhắn gần nhất làm history (trừ tin vừa tạo)
        history_qs = AIChatMessage.objects.filter(
            session=session
        ).exclude(
            content=user_message
        ).order_by('-created_at')[:10]

        history = [
            {"role": msg.role, "content": msg.content}
            for msg in reversed(list(history_qs))
        ]

        # Lấy context câu hỏi nếu session gắn với câu hỏi cụ thể
        context_content = None
        if session.context_type == 'question' and session.context_id:
            try:
                q = Question.objects.get(id=session.context_id, is_deleted=False)
                ctx = q.content_json or {}
                context_content = json.dumps(ctx, ensure_ascii=False)
            except Question.DoesNotExist:
                pass

        # Xây system prompt
        system_prompt = gemini_service._build_system_prompt(
            context_type=session.context_type,
            context_content=context_content
        )

        # Gọi Gemini API
        try:
            ai_response = gemini_service.chat_with_gemini(
                messages_history=history,
                user_message=user_message,
                system_prompt=system_prompt
            )
        except Exception as gemini_err:
            err_str = str(gemini_err)
            status_code = 500
            if "503" in err_str or "UNAVAILABLE" in err_str:
                status_code = 503
            return JsonResponse({"error": f"Gemini API error: {err_str}"}, status=status_code)


        # Lưu response của AI với role='assistant' (DB constraint: user|assistant)
        ai_msg = AIChatMessage.objects.create(
            session=session,
            role='assistant',
            content=ai_response
        )

        return JsonResponse({
            "content": ai_response,
            "created_at": ai_msg.created_at.isoformat()
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ─────────────────────────────────────────────
# GET /api/ai/sessions/<id>/messages/ [student]
# ─────────────────────────────────────────────
@csrf_exempt
@require_auth(roles=["student"])
def session_messages(request, session_id):
    """Trả toàn bộ lịch sử chat của session (student)."""
    if request.method != 'GET':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        session = AIChatSession.objects.get(id=session_id, user_id=request.user_id)
    except AIChatSession.DoesNotExist:
        return JsonResponse({"error": "Session không tồn tại hoặc không có quyền"}, status=403)

    try:
        messages = AIChatMessage.objects.filter(session=session).order_by('created_at')
        return JsonResponse({
            "session_id": session.id,
            "context_type": session.context_type,
            "context_id": session.context_id,
            "messages": [
                {
                    "id": msg.id,
                    "role": msg.role,
                    "content": msg.content,
                    "created_at": msg.created_at.isoformat()
                }
                for msg in messages
            ]
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ─────────────────────────────────────────────
# POST /api/ai/parse-pdf/ [teacher]
# ─────────────────────────────────────────────
@csrf_exempt
@require_auth(roles=["teacher"])
def parse_pdf(request):
    """
    Upload PDF đề thi, dùng PyMuPDF render ảnh + Gemini Vision để trích xuất câu hỏi.
    Hỗ trợ câu hỏi có hình vẽ/đồ thị (has_image=True).
    PDF > 5 trang: gọi Gemini nhiều batch, mỗi batch ≤ 5 trang.
    Ảnh embedded trong PDF được lưu vào media/question_images/.
    """
    import base64
    import time
    import json as _json
    from django.core.files.base import ContentFile
    from django.core.files.storage import default_storage
    from django.conf import settings as dj_settings

    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        pdf_file = request.FILES.get('file')
        if not pdf_file:
            return JsonResponse({"error": "Thiếu file PDF (field: file)", "code": "MISSING_FILE"}, status=400)
        if not pdf_file.name.lower().endswith('.pdf'):
            return JsonResponse({"error": "Chỉ chấp nhận file PDF", "code": "INVALID_TYPE"}, status=400)

        pdf_bytes = pdf_file.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")

        # ── Bước 1: Render từng trang thành PNG + extract text ──────────
        pages_data = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            # Render trang thành ảnh PNG (dpi=150)
            pix = page.get_pixmap(dpi=150)
            png_bytes = pix.tobytes("png")
            pages_data.append({
                "page_num":  page_num,
                "image_b64": base64.b64encode(png_bytes).decode("utf-8"),
                "text":      page.get_text(),
            })

        # ── Bước 2: Extract ảnh embedded trong PDF → lưu vào media/ ────
        ts = int(time.time())
        extracted_image_urls = []  # danh sách url ảnh embedded đã lưu
        img_idx = 0
        for page_num in range(len(doc)):
            page = doc[page_num]
            for img_info in page.get_images(full=True):
                xref = img_info[0]
                try:
                    base_img = doc.extract_image(xref)
                    img_bytes = base_img["image"]
                    ext = base_img.get("ext", "png")
                    rel_path = f"question_images/parse_{ts}_{img_idx}.{ext}"
                    saved_path = default_storage.save(rel_path, ContentFile(img_bytes))
                    img_url = request.build_absolute_uri(
                        dj_settings.MEDIA_URL + saved_path
                    )
                    extracted_image_urls.append(img_url)
                    img_idx += 1
                except Exception:
                    # Bỏ qua ảnh không extract được
                    pass

        doc.close()

        if not pages_data:
            return JsonResponse({"error": "PDF không có trang nào", "code": "EMPTY_PDF"}, status=400)

        # ── Bước 3: Gọi Gemini Vision multimodal (batch ≤ 5 trang) ─────
        try:
            questions = gemini_service.parse_pdf_multimodal(pages_data=pages_data)
        except _json.JSONDecodeError as je:
            return JsonResponse(
                {"error": f"Gemini trả về JSON không hợp lệ: {str(je)}", "code": "INVALID_JSON"},
                status=500
            )
        except Exception as gemini_err:
            return JsonResponse(
                {"error": f"Gemini API error: {str(gemini_err)}", "code": "GEMINI_ERROR"},
                status=500
            )

        # ── Bước 4: Gắn image_description vào content_json (block riêng) ─
        for q in questions:
            has_image = q.get("has_image", False)
            img_desc = q.get("image_description", "").strip()
            if has_image and img_desc:
                # Thêm block image_desc vào cuối blocks của question
                blocks = q.get("question", {}).get("blocks", [])
                blocks.append({"type": "image_desc", "value": img_desc})
                if "question" in q:
                    q["question"]["blocks"] = blocks
            # Đảm bảo image.url luôn null (ảnh extracted trả riêng qua extracted_images)
            q["image"] = {"url": None}

        return JsonResponse({
            "questions":        questions,
            "total":            len(questions),
            "extracted_images": extracted_image_urls,
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
