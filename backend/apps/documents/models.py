from django.db import models
from apps.accounts.models import User


# ============================================================
# APP: documents
# Quản lý tài liệu học tập (file PDF, Word,...) và hệ thống bình luận.
# Phiên bản 2.0 bổ sung:
#   - Comment: bình luận 2 cấp dùng chung cho video lẫn document
# Video đã được chuyển sang app riêng: apps.videos
# ============================================================


class Document(models.Model):
    """
    Bảng: documents
    Tài liệu học tập dạng file (PDF, Word,...).
    File lưu trong MEDIA_ROOT/documents/, truy cập qua /media/documents/.
    """
    title       = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)

    # Lưu đường dẫn tương đối trong MEDIA_ROOT (cột DB: file_url)
    file        = models.FileField(
        upload_to="documents/",
        db_column="file_url",
        max_length=500
    )

    uploaded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, db_column="uploaded_by", null=True, blank=True
    )

    is_deleted  = models.BooleanField(default=False)  # Soft delete
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'documents'
        managed  = False  # Schema tạo từ script_db_create.sql

    def __str__(self):
        return self.title


class Comment(models.Model):
    """
    Bảng: comments  (BỔ SUNG PHIÊN BẢN 2.0)
    Hệ thống bình luận 2 cấp dùng chung cho video và document.

    Cấp 1 (comment gốc): parent_id IS NULL
    Cấp 2 (reply):       parent_id trỏ đến comment cấp 1

    Trigger trg_comments_depth trong DB ngăn reply của reply (cấp 3+).
    Trigger trg_comments_updated tự cập nhật updated_at khi sửa content.

    target_type + target_id xác định đối tượng được bình luận:
      - target_type='video',    target_id = videos.id
      - target_type='document', target_id = documents.id
    Không dùng FK cứng để tránh phức tạp khi có 2 loại target.
    """
    TARGET_TYPES = [
        ('video',    'Binh luan video bai giang'),
        ('document', 'Binh luan tai lieu'),
    ]

    user        = models.ForeignKey(User, on_delete=models.CASCADE)

    # Loại nội dung được bình luận: 'video' hoặc 'document'
    target_type = models.CharField(max_length=10, choices=TARGET_TYPES)

    # ID của video hoặc document (validate ở application layer)
    target_id   = models.IntegerField()

    # NULL = comment cấp 1; NOT NULL = reply, trỏ đến comment cấp 1
    parent      = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        db_column='parent_id',
        related_name='replies'
    )

    # Nội dung plain text (1-2000 ký tự, CHECK constraint trong DB)
    content     = models.TextField()

    is_deleted  = models.BooleanField(default=False)  # Soft delete
    created_at  = models.DateTimeField(auto_now_add=True)

    # NULL nếu chưa từng sửa; tự cập nhật qua trigger trg_comments_updated
    updated_at  = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'comments'
        managed  = False  # Schema tạo từ script_db_create.sql

    def __str__(self):
        return f"Comment#{self.id} [{self.target_type}:{self.target_id}]"
