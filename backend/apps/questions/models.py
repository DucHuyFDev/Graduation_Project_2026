from django.db import models
from apps.topics.models import Topic
from apps.accounts.models import User


# ============================================================
# APP: questions
# Ngân hàng câu hỏi với 3 loại: MCQ, Đúng/Sai, Trả lời ngắn.
# Nội dung câu hỏi lưu dạng Block JSON (content_json) để render
# được cả text lẫn công thức LaTeX qua component MathRenderer.
# ============================================================


class Question(models.Model):
    """
    Bảng: questions
    Câu hỏi gốc — chứa nội dung đề (content_json) và metadata.
    Các đáp án/mệnh đề lưu ở bảng con tương ứng theo question_type.
    """
    QUESTION_TYPES = [
        ('mcq',          'Câu hỏi Trắc nghiệm'),   # 4 phương án A/B/C/D
        ('true_false',   'Câu hỏi Đúng sai'),       # 4 mệnh đề a/b/c/d
        ('short_answer', 'Câu hỏi Trả lời ngắn'),  # Đáp số số thực
    ]

    topic         = models.ForeignKey(Topic, on_delete=models.SET_NULL, null=True, blank=True)
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES)

    # Block JSON: {"blocks": [{"type": "paragraph", "content": [{"type": "text|math", "value": "..."}]}]}
    content_json  = models.JSONField()

    # Đường dẫn ảnh minh họa (lưu trong MEDIA_ROOT/questions/)
    image_url     = models.CharField(max_length=500, null=True, blank=True)

    # Độ khó: 0.0 (dễ) → 1.0 (khó), CHECK constraint trong DB
    difficulty    = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)

    is_deleted    = models.BooleanField(default=False)  # Soft delete
    created_by    = models.ForeignKey(
        User, on_delete=models.SET_NULL, db_column="created_by", null=True, blank=True
    )
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)  # Cập nhật tự động qua trigger trg_questions_updated

    class Meta:
        db_table = 'questions'
        managed  = False

    def __str__(self):
        return f"Q{self.id} [{self.question_type}]"


class QuestionOption(models.Model):
    """
    Bảng: question_options
    Đáp án cho câu MCQ — mỗi câu có đúng 4 option (A/B/C/D).
    is_correct=True đánh dấu đáp án đúng (duy nhất 1 trong 4).
    """
    question    = models.ForeignKey(Question, on_delete=models.CASCADE)

    # Khóa đáp án: 'A', 'B', 'C', hoặc 'D' (CHECK constraint trong DB)
    option_key  = models.CharField(max_length=1)

    # Nội dung đáp án dạng Block JSON (có thể chứa công thức)
    content_json = models.JSONField()

    is_correct  = models.BooleanField(default=False)

    class Meta:
        db_table = 'question_options'
        managed  = False


class QuestionTFStatement(models.Model):
    """
    Bảng: question_tf_statements
    Mệnh đề Đúng/Sai cho câu true_false — mỗi câu có đúng 4 mệnh đề (a/b/c/d).
    is_true=True đánh dấu mệnh đề đúng.
    """
    question      = models.ForeignKey(Question, on_delete=models.CASCADE)

    # Khóa mệnh đề: 'a', 'b', 'c', hoặc 'd' (CHECK constraint trong DB)
    statement_key = models.CharField(max_length=1)

    # Nội dung mệnh đề dạng Block JSON
    content_json  = models.JSONField()

    is_true       = models.BooleanField()

    class Meta:
        db_table = 'question_tf_statements'
        managed  = False


class QuestionShortAnswer(models.Model):
    """
    Bảng: question_short_answers
    Đáp án số thực cho câu trả lời ngắn (UNIQUE với question_id).
    So sánh với sai số abs(user_answer - correct_answer) < 0.01 khi chấm.
    """
    question       = models.OneToOneField(Question, on_delete=models.CASCADE)

    # Đáp án đúng dạng số thực (NUMERIC trong DB)
    correct_answer = models.DecimalField(max_digits=20, decimal_places=4)

    class Meta:
        db_table = 'question_short_answers'
        managed  = False
