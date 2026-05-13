from django.db import models
from apps.accounts.models import User


class Comment(models.Model):
    """
    Bình luận đa mục tiêu (video, document). Hỗ trợ 1 cấp reply.
    Trigger enforce_comment_depth trong DB ngăn reply của reply (depth > 1).
    """

    # Các loại target hợp lệ
    TARGET_VIDEO    = 'video'
    TARGET_DOCUMENT = 'document'
    TARGET_CHOICES  = [
        (TARGET_VIDEO,    'Video'),
        (TARGET_DOCUMENT, 'Document'),
    ]

    user        = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        db_column='user_id',
        related_name='comments',
    )
    target_type = models.CharField(max_length=10, choices=TARGET_CHOICES)
    target_id   = models.IntegerField()
    # Reply của comment (nullable — null = comment gốc)
    parent      = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        db_column='parent_id',
        related_name='replies',
    )
    content    = models.TextField()
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed  = False
        db_table = 'comments'
        ordering = ['created_at']

    def __str__(self):
        return f"Comment #{self.id} by {self.user_id} on {self.target_type}/{self.target_id}"
