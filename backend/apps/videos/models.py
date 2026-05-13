from django.db import models
from apps.topics.models import Topic
from apps.accounts.models import User


# ============================================================
# APP: videos
# Quản lý bài giảng video nhúng từ YouTube.
# Không lưu file video — chỉ lưu youtube_id để tạo iframe embed.
# Phân loại:
#   topic_lesson = bài giảng gắn theo chuyên đề (topic_id NOT NULL)
#   live_session = buổi học trực tiếp được ghi lại (topic_id nullable)
# ============================================================


class Video(models.Model):
    """
    Bảng: videos
    Bài giảng video nhúng YouTube.
    embed_url không lưu DB — tính động từ youtube_id.
    """
    CATEGORY_CHOICES = [
        ('topic_lesson', 'Bài giảng theo chuyên đề'),
        ('live_session', 'Buổi học trực tiếp (ghi lại)'),
    ]

    title       = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)

    # Chỉ lưu ID video (phần ?v= trong URL YouTube).
    # VD: https://youtu.be/dQw4w9WgXcQ → youtube_id = "dQw4w9WgXcQ"
    youtube_id  = models.CharField(max_length=20)

    # Chuyên đề liên quan (nullable với live_session)
    topic       = models.ForeignKey(
        Topic,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='topic_id'
    )

    # Phân loại video: bài giảng topic hoặc buổi học live
    category    = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default='topic_lesson'
    )

    # Thứ tự hiển thị trong danh sách video của topic
    order_index = models.SmallIntegerField(default=0)

    is_deleted  = models.BooleanField(default=False)  # Soft delete — không DELETE thật

    created_by  = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='created_by',
        related_name='created_videos'
    )

    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)  # Cập nhật tự động qua trigger trg_videos_updated

    class Meta:
        db_table = 'videos'
        managed  = False  # Schema tạo từ script_db_create.sql, không dùng migrations

    @property
    def embed_url(self):
        """Trả về URL embed YouTube để dùng trong src của iframe."""
        return f"https://www.youtube.com/embed/{self.youtube_id}"

    def __str__(self):
        return f"[{self.category}] {self.title}"
