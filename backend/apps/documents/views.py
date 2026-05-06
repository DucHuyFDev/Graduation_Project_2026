import os
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import default_storage
from django.conf import settings
from config.permissions import require_auth
from apps.documents.models import Document


# ─────────────────────────────────────────────
# /api/documents/ — GET (public) | POST (teacher)
# ─────────────────────────────────────────────
@csrf_exempt
def document_list(request):
    """GET: list tài liệu (public, ẩn file_url). POST: upload (teacher)."""
    if request.method == 'GET':
        return _list_documents(request)
    if request.method == 'POST':
        return _create_document(request)
    return JsonResponse({"error": "Method not allowed"}, status=405)


def _list_documents(request):
    """Trả list tài liệu kèm file_url — public."""
    try:
        docs = Document.objects.filter(is_deleted=False).order_by('-created_at')
        results = []
        for d in docs:
            file_url = None
            if d.file:
                file_url = request.build_absolute_uri(settings.MEDIA_URL + str(d.file))
            results.append({
                "id": d.id,
                "title": d.title,
                "description": d.description,
                "file_url": file_url,
                "created_at": d.created_at.isoformat(),
            })
        return JsonResponse({"total": len(results), "results": results})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@require_auth(roles=["teacher"])
def _create_document(request):
    """Upload tài liệu mới, lưu vào media/documents/ (teacher)."""
    title = request.POST.get('title', '').strip()
    description = request.POST.get('description', '').strip()
    file = request.FILES.get('file')

    if not title:
        return JsonResponse({"error": "Thiếu title"}, status=400)
    if not file:
        return JsonResponse({"error": "Thiếu file"}, status=400)

    # Lưu file vào media/documents/
    safe_name = os.path.basename(file.name)
    relative_path = default_storage.save(f"documents/{safe_name}", file)

    doc = Document.objects.create(
        title=title,
        description=description if description else None,
        file=relative_path,
        uploaded_by_id=request.user_id,
    )

    file_url = request.build_absolute_uri(settings.MEDIA_URL + str(doc.file))
    return JsonResponse({
        "id": doc.id,
        "title": doc.title,
        "file_url": file_url,
        "created_at": doc.created_at.isoformat(),
    }, status=201)


# ─────────────────────────────────────────────
# /api/documents/<id>/ — GET (auth) | DELETE (teacher)
# ─────────────────────────────────────────────
@csrf_exempt
def document_detail(request, doc_id):
    """GET: chi tiết kèm file_url (cần auth). DELETE: soft delete (teacher)."""
    if request.method == 'GET':
        return _get_document(request, doc_id)
    if request.method == 'DELETE':
        return _delete_document(request, doc_id)
    return JsonResponse({"error": "Method not allowed"}, status=405)


@require_auth()
def _get_document(request, doc_id):
    """Chi tiết tài liệu kèm file_url (cần đăng nhập)."""
    try:
        doc = Document.objects.get(id=doc_id, is_deleted=False)
    except Document.DoesNotExist:
        return JsonResponse({"error": "Không tìm thấy tài liệu"}, status=404)

    file_url = None
    if doc.file:
        file_url = request.build_absolute_uri(settings.MEDIA_URL + str(doc.file))

    return JsonResponse({
        "id": doc.id,
        "title": doc.title,
        "description": doc.description,
        "file_url": file_url,
        "created_at": doc.created_at.isoformat(),
    })


@require_auth(roles=["teacher"])
def _delete_document(request, doc_id):
    """Soft delete tài liệu (teacher)."""
    try:
        doc = Document.objects.get(id=doc_id, is_deleted=False)
    except Document.DoesNotExist:
        return JsonResponse({"error": "Không tìm thấy tài liệu"}, status=404)

    doc.is_deleted = True
    doc.save(update_fields=['is_deleted'])
    return JsonResponse({"message": "Đã xóa tài liệu"})
