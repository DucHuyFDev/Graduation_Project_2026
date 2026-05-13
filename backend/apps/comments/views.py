from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from django.db import connection
from django.conf import settings
from config.permissions import require_auth
from .models import Comment

# Các target_type hợp lệ
VALID_TARGET_TYPES = {'video', 'document'}


def serialize_comment(c, username_map):
    """Serialize 1 comment thành dict trả về client."""
    return {
        'id':          c.id,
        'user_id':     c.user_id,
        'username':    username_map.get(c.user_id, f'user_{c.user_id}'),
        'target_type': c.target_type,
        'target_id':   c.target_id,
        'parent_id':   c.parent_id,
        'content':     c.content,
        'created_at':  c.created_at.isoformat() if c.created_at else None,
        'replies': [],   # replies được gán bên ngoài khi build cây
    }


def build_comment_tree(comments, username_map):
    """
    Xây cây comment 2 cấp: root → replies.
    Trả list các comment gốc, mỗi cái kèm danh sách replies.
    """
    roots   = []
    replies = []

    for c in comments:
        if c.parent_id is None:
            roots.append(c)
        else:
            replies.append(c)

    # Index root theo id để gán replies nhanh
    root_map = {c.id: serialize_comment(c, username_map) for c in roots}

    for r in replies:
        serialized = serialize_comment(r, username_map)
        if r.parent_id in root_map:
            root_map[r.parent_id]['replies'].append(serialized)

    return list(root_map.values())


@require_http_methods(['GET', 'POST'])
def comment_list_create(request):
    """
    GET  /api/comments/?target_type=video&target_id=1 — public
    POST /api/comments/                                — auth required
    """
    if request.method == 'GET':
        return _get_comments(request)
    else:
        return _create_comment(request)


def _get_comments(request):
    """Lấy danh sách comment theo target_type + target_id, kèm username giải mã."""
    target_type = request.GET.get('target_type', '').strip()
    target_id   = request.GET.get('target_id', '').strip()

    if not target_type or not target_id:
        return JsonResponse(
            {'error': 'Cần cung cấp target_type và target_id', 'code': 'MISSING_PARAMS'},
            status=400,
        )

    if target_type not in VALID_TARGET_TYPES:
        return JsonResponse(
            {'error': f'target_type không hợp lệ. Cho phép: {", ".join(VALID_TARGET_TYPES)}'},
            status=400,
        )

    try:
        target_id = int(target_id)
    except ValueError:
        return JsonResponse({'error': 'target_id phải là số nguyên'}, status=400)

    # Raw SQL: JOIN với users để decrypt username_enc bằng pgp_sym_decrypt
    key = settings.PGCRYPTO_KEY
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                c.id,
                c.user_id,
                pgp_sym_decrypt(u.username_enc, %s) AS username,
                c.target_type,
                c.target_id,
                c.parent_id,
                c.content,
                c.is_deleted,
                c.created_at,
                c.updated_at
            FROM comments c
            LEFT JOIN users u ON u.id = c.user_id
            WHERE c.target_type = %s
              AND c.target_id   = %s
              -- Không lọc is_deleted: trả cả comment đã xóa để frontend
              -- hiển thị "[Bình luận đã bị xóa]" (xử lý bằng is_deleted flag)
            ORDER BY c.created_at ASC
        """, [key, target_type, target_id])
        rows = cursor.fetchall()
        cols = [d[0] for d in cursor.description]

    # Chậần thành dict, phân loại roots và replies
    root_map = {}
    pending_replies = []

    for row in rows:
        r = dict(zip(cols, row))
        item = {
            'id':          r['id'],
            'user_id':     r['user_id'],
            'username':    r['username'] or f"user_{r['user_id']}",
            'target_type': r['target_type'],
            'target_id':   r['target_id'],
            'parent_id':   r['parent_id'],
            'content':     r['content'],
            'is_deleted':  r['is_deleted'],
            'created_at':  r['created_at'].isoformat() if r['created_at'] else None,
            'updated_at':  r['updated_at'].isoformat() if r['updated_at'] else None,
            'replies':     [],
        }
        if r['parent_id'] is None:
            root_map[r['id']] = item
        else:
            pending_replies.append(item)

    # Gán replies vào root
    for reply in pending_replies:
        parent_id = reply['parent_id']
        if parent_id in root_map:
            root_map[parent_id]['replies'].append(reply)

    tree = list(root_map.values())
    return JsonResponse({'results': tree, 'total': len(tree)}, status=200)


def _create_comment(request):
    """Tạo comment mới — yêu cầu đăng nhập."""
    # Kiểm tra auth thủ công (middleware đã gắn user_id)
    user_id = getattr(request, 'user_id', None)
    if not user_id:
        return JsonResponse({'error': 'Chưa đăng nhập', 'code': 'UNAUTHORIZED'}, status=401)

    import json
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Request body không hợp lệ'}, status=400)

    # Validate
    target_type = data.get('target_type', '').strip()
    target_id   = data.get('target_id')
    content     = data.get('content', '').strip()
    parent_id   = data.get('parent_id')  # nullable

    if target_type not in VALID_TARGET_TYPES:
        return JsonResponse(
            {'error': f'target_type không hợp lệ. Cho phép: {", ".join(VALID_TARGET_TYPES)}'},
            status=400,
        )
    if not target_id:
        return JsonResponse({'error': 'target_id là bắt buộc'}, status=400)
    if not content:
        return JsonResponse({'error': 'Nội dung bình luận không được để trống'}, status=400)
    if len(content) > 2000:
        return JsonResponse({'error': 'Nội dung tối đa 2000 ký tự'}, status=400)

    # Kiểm tra parent hợp lệ (nếu có)
    parent = None
    if parent_id:
        try:
            parent = Comment.objects.get(id=parent_id, is_deleted=False)
            # Trigger DB sẽ chặn reply của reply, nhưng check thêm ở app level
            if parent.parent_id is not None:
                return JsonResponse(
                    {'error': 'Không thể reply vào một reply (chỉ hỗ trợ 1 cấp)'},
                    status=400,
                )
        except Comment.DoesNotExist:
            return JsonResponse({'error': 'parent_id không tồn tại'}, status=400)

    try:
        comment = Comment.objects.create(
            user_id=user_id,
            target_type=target_type,
            target_id=int(target_id),
            parent=parent,
            content=content,
        )
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({
        'id':          comment.id,
        'user_id':     comment.user_id,
        'target_type': comment.target_type,
        'target_id':   comment.target_id,
        'parent_id':   comment.parent_id,
        'content':     comment.content,
        'created_at':  comment.created_at.isoformat() if comment.created_at else None,
    }, status=201)


@require_http_methods(['PATCH', 'DELETE'])
def comment_detail(request, comment_id):
    """
    PATCH  /api/comments/<id>/ — sửa nội dung comment (chủ comment).
    DELETE /api/comments/<id>/ — soft delete (chủ hoặc teacher).
    """
    user_id   = getattr(request, 'user_id', None)
    user_role = getattr(request, 'user_role', None)

    if not user_id:
        return JsonResponse({'error': 'Chưa đăng nhập', 'code': 'UNAUTHORIZED'}, status=401)

    try:
        comment = Comment.objects.get(id=comment_id, is_deleted=False)
    except Comment.DoesNotExist:
        return JsonResponse({'error': 'Bình luận không tồn tại'}, status=404)

    # ── PATCH: sửa nội dung ──────────────────────────────────────
    if request.method == 'PATCH':
        if comment.user_id != user_id:
            return JsonResponse(
                {'error': 'Chỉ chủ bình luận mới được sửa', 'code': 'FORBIDDEN'},
                status=403,
            )

        import json
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Request body không hợp lệ'}, status=400)

        content = data.get('content', '').strip()
        if not content:
            return JsonResponse({'error': 'Nội dung không được để trống'}, status=400)
        if len(content) > 2000:
            return JsonResponse({'error': 'Nội dung tối đa 2000 ký tự'}, status=400)

        comment.content    = content
        comment.updated_at = timezone.now()
        comment.save(update_fields=['content', 'updated_at'])

        return JsonResponse({
            'id':         comment.id,
            'content':    comment.content,
            'updated_at': comment.updated_at.isoformat(),
        }, status=200)

    # ── DELETE: soft delete ───────────────────────────────────────
    if comment.user_id != user_id and user_role != 'teacher':
        return JsonResponse(
            {'error': 'Không có quyền xóa bình luận này', 'code': 'FORBIDDEN'},
            status=403,
        )

    # Xóa mềm tất cả replies nếu là root comment
    if comment.parent_id is None:
        Comment.objects.filter(parent_id=comment_id).update(
            is_deleted=True, updated_at=timezone.now()
        )

    comment.is_deleted = True
    comment.updated_at = timezone.now()
    comment.save(update_fields=['is_deleted', 'updated_at'])

    return JsonResponse({'message': 'Đã xóa bình luận'}, status=200)
