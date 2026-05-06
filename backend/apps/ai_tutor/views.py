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
    Upload PDF đề thi, dùng PyMuPDF extract text + Gemini để trích xuất câu hỏi.
    Trả JSON array các câu hỏi đã parse với image.url luôn là null.
    """
    import json as _json
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        # Nhận file PDF qua request.FILES["file"]
        pdf_file = request.FILES.get('file')
        if not pdf_file:
            return JsonResponse({"error": "Thiếu file PDF (field: file)", "code": "MISSING_FILE"}, status=400)

        if not pdf_file.name.lower().endswith('.pdf'):
            return JsonResponse({"error": "Chỉ chấp nhận file PDF", "code": "INVALID_TYPE"}, status=400)

        # Đọc PDF bằng PyMuPDF — chỉ extract text, KHÔNG extract ảnh
        pdf_bytes = pdf_file.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        extracted_text = "".join(page.get_text() for page in doc)
        doc.close()

        if not extracted_text.strip():
            return JsonResponse({"error": "Không đọc được nội dung text từ PDF", "code": "EMPTY_TEXT"}, status=400)

        # Gọi Gemini để parse câu hỏi (text-only, không ảnh)
        try:
            questions = gemini_service.parse_pdf_with_gemini(text_content=extracted_text)
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

        return JsonResponse({"questions": questions, "total": len(questions)})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
