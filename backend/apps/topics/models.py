from django.db import models


# ============================================================
# APP: topics
# Quản lý cây chuyên đề Toán THPT (tối đa 5 cấp).
# Dùng WITH RECURSIVE trong practice để duyệt cây từ trên xuống.
# ============================================================


class Topic(models.Model):
    """
    Bảng: topics
    Cây chuyên đề dạng self-join (parent_id tự tham chiếu).
    Level 1 = chương lớn, Level 5 = bài học nhỏ nhất.
    """
    name        = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)

    # Self-join: topic cha (NULL nếu là gốc cấp 1)
    parent      = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='parent_id'
    )

    # Cấp độ trong cây: 1–5 (CHECK constraint trong DB)
    level       = models.SmallIntegerField()

    # Thứ tự hiển thị trong cùng cấp cha
    order_index = models.SmallIntegerField(default=0)

    is_deleted  = models.BooleanField(default=False)  # Soft delete
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'topics'
        managed  = False  # Schema tạo từ script_db_create.sql

    def __str__(self):
        return self.name
