import re
import json
from django.http import JsonResponse
from django.utils import timezone
from config.permissions import require_auth
from .models import Video


# Regex validate youtube_id: đúng 11 ký tự, chỉ gồm a-z A-Z 0-9 _ -
YOUTUBE_ID_PATTERN = re.compile(r'^[a-zA-Z0-9_-]{11}$')


def serialize_video(video, topic_name=None):
    """Chuyển Video object thành dict JSON-safe. embed_url tính động, không lưu DB."""
    return {
        "id":          video.id,
        "title":       video.title,
        "description": video.description,
        "youtube_id":  video.youtube_id,
        "embed_url":   f"https://www.youtube.com/embed/{video.youtube_id}",
        "category":    video.category,
        "topic_id":    video.topic_id,
        "topic_name":  topic_name if topic_name is not None else (
            video.topic.name if video.topic_id else None
        ),
        "order_index": video.order_index,
        "created_by":  video.created_by_id,
        "created_at":  video.created_at.isoformat() if video.created_at else None,
        "updated_at":  video.updated_at.isoformat() if video.updated_at else None,
    }


def video_list(request):
    """
    GET  /api/videos/ — Public. Danh sách video chưa xóa.
    POST /api/videos/ — Teacher only. Tạo video mới.
    GET params: ?topic_id=&category=topic_lesson|live_session
    """
    if request.method == 'GET':
        return _get_video_list(request)
    if request.method == 'POST':
        return _create_video(request)
    return JsonResponse({"error": "Method not allowed"}, status=405)


def _get_video_list(request):
    """Lấy danh sách video, có thể lọc theo topic_id và category."""
    qs = (
        Video.objects
        .filter(is_deleted=False)
        .select_related('topic')           # Join lấy topic_name, tránh N+1
        .order_by('order_index', 'created_at')
    )

    # Lọc theo chuyên đề (tùy chọn)
    topic_id = request.GET.get('topic_id')
    if topic_id:
        try:
            qs = qs.filter(topic_id=int(topic_id))
        except ValueError:
            return JsonResponse({"error": "topic_id phải là số nguyên"}, status=400)

    # Lọc theo category (tùy chọn, bỏ qua giá trị không hợp lệ)
    category = request.GET.get('category')
    if category in ('topic_lesson', 'live_session'):
        qs = qs.filter(category=category)

    data = [
        serialize_video(v, topic_name=v.topic.name if v.topic_id else None)
        for v in qs
    ]
    return JsonResponse({"results": data, "total": len(data)}, status=200)


@require_auth(roles=["teacher"])
def _create_video(request):
    """POST /api/videos/ — Tạo video mới, chỉ teacher."""
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Body không hợp lệ JSON"}, status=400)

    # Validate các field bắt buộc
    title      = body.get('title', '').strip()
    youtube_id = body.get('youtube_id', '').strip()
    category   = body.get('category', 'topic_lesson')

    if not title:
        return JsonResponse({"error": "title là bắt buộc"}, status=400)

    if not youtube_id:
        return JsonResponse({"error": "youtube_id là bắt buộc"}, status=400)

    # Validate định dạng youtube_id: đúng 11 ký tự, chỉ [a-zA-Z0-9_-]
    if not YOUTUBE_ID_PATTERN.match(youtube_id):
        return JsonResponse({
            "error": "youtube_id không hợp lệ. Phải đúng 11 ký tự, chỉ gồm a-z A-Z 0-9 _ -",
            "code":  "INVALID_YOUTUBE_ID"
        }, status=400)

    if category not in ('topic_lesson', 'live_session'):
        return JsonResponse({
            "error": "category phải là 'topic_lesson' hoặc 'live_session'"
        }, status=400)

    # topic_id nullable (live_session không cần gắn topic)
    topic_id    = body.get('topic_id')
    order_index = body.get('order_index', 0)
    description = body.get('description', '')

    video = Video.objects.create(
        title=title,
        description=description,
        youtube_id=youtube_id,
        topic_id=topic_id,
        category=category,
        order_index=order_index,
        created_by_id=request.user_id,
    )

    return JsonResponse(serialize_video(video), status=201)


def video_detail(request, video_id):
    """
    GET    /api/videos/<id>/ — Public. Chi tiết video.
    PUT    /api/videos/<id>/ — Teacher only. Cập nhật thông tin.
    DELETE /api/videos/<id>/ — Teacher only. Soft delete.
    """
    if request.method == 'GET':
        return _get_video(request, video_id)
    if request.method == 'PUT':
        return _update_video(request, video_id)
    if request.method == 'DELETE':
        return _delete_video(request, video_id)
    return JsonResponse({"error": "Method not allowed"}, status=405)


def _get_video(request, video_id):
    """GET /api/videos/<id>/ — Chi tiết 1 video theo ID."""
    try:
        video = Video.objects.select_related('topic').get(id=video_id, is_deleted=False)
    except Video.DoesNotExist:
        return JsonResponse({"error": "Video không tồn tại", "code": "NOT_FOUND"}, status=404)

    return JsonResponse(serialize_video(
        video,
        topic_name=video.topic.name if video.topic_id else None
    ), status=200)


@require_auth(roles=["teacher"])
def _update_video(request, video_id):
    """PUT /api/videos/<id>/ — Cập nhật thông tin video, chỉ teacher."""
    try:
        video = Video.objects.get(id=video_id, is_deleted=False)
    except Video.DoesNotExist:
        return JsonResponse({"error": "Video không tồn tại", "code": "NOT_FOUND"}, status=404)

    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Body không hợp lệ JSON"}, status=400)

    # Cập nhật từng field nếu có trong request body
    if 'title' in body:
        title = body['title'].strip()
        if not title:
            return JsonResponse({"error": "title không được để trống"}, status=400)
        video.title = title

    if 'youtube_id' in body:
        youtube_id = body['youtube_id'].strip()
        if not YOUTUBE_ID_PATTERN.match(youtube_id):
            return JsonResponse({
                "error": "youtube_id không hợp lệ. Phải đúng 11 ký tự, chỉ gồm a-z A-Z 0-9 _ -",
                "code":  "INVALID_YOUTUBE_ID"
            }, status=400)
        video.youtube_id = youtube_id

    if 'category' in body:
        if body['category'] not in ('topic_lesson', 'live_session'):
            return JsonResponse({
                "error": "category phải là 'topic_lesson' hoặc 'live_session'"
            }, status=400)
        video.category = body['category']

    if 'description' in body:
        video.description = body['description']

    if 'topic_id' in body:
        video.topic_id = body['topic_id']  # Cho phép set None (tách khỏi topic)

    if 'order_index' in body:
        video.order_index = body['order_index']

    video.save()
    return JsonResponse(serialize_video(video), status=200)


@require_auth(roles=["teacher"])
def _delete_video(request, video_id):
    """DELETE /api/videos/<id>/ — Soft delete, chỉ teacher. Không DELETE thật."""
    try:
        video = Video.objects.get(id=video_id, is_deleted=False)
    except Video.DoesNotExist:
        return JsonResponse({"error": "Video không tồn tại", "code": "NOT_FOUND"}, status=404)

    # Soft delete — chỉ đánh dấu is_deleted=True, không xóa row
    video.is_deleted = True
    video.save(update_fields=['is_deleted'])

    return JsonResponse({"message": "Xóa video thành công", "id": video_id}, status=200)


def live_sessions(request):
    """
    GET /api/videos/live-sessions/ — Public.
    Alias lấy toàn bộ video category='live_session', sắp xếp created_at DESC.
    """
    if request.method != 'GET':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    qs = (
        Video.objects
        .filter(category='live_session', is_deleted=False)
        .order_by('-created_at')
    )

    data = [serialize_video(v) for v in qs]
    return JsonResponse({"results": data, "total": len(data)}, status=200)
