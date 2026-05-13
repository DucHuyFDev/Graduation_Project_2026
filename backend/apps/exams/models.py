from django.db import models
from apps.topics.models import Topic
from apps.accounts.models import User
from apps.questions.models import Question


# ============================================================
# APP: exams
# Quản lý đề thi và kết quả thi.
# Mỗi học sinh chỉ được thi tối đa 3 lần / 1 đề (attempt_number CHECK 1-3).
# Chấm điểm thực hiện trong Python view (không tính trong SQL).
# ============================================================


class Exam(models.Model):
    """
    Bảng: exams
    Thông tin đề thi — gồm loại đề, thời gian làm bài và file đáp án.
    """
    EXAM_TYPES = [
        ('topic',      'Đề theo chuyên đề'),
        ('midterm',    'Đề giữa kỳ'),
        ('final',      'Đề cuối kỳ'),
        ('graduation', 'Đề tốt nghiệp'),
    ]

    title            = models.CharField(max_length=255)
    exam_type        = models.CharField(max_length=20, choices=EXAM_TYPES)

    # Topic gắn với đề (nullable — đề tổng hợp không gắn topic cụ thể)
    topic            = models.ForeignKey(Topic, on_delete=models.SET_NULL, null=True, blank=True)

    # Thời gian làm bài (phút), mặc định 90 phút
    duration_minutes = models.SmallIntegerField(default=90)

    # URL file PDF đáp án (lưu trong MEDIA_ROOT/exam_pdfs/)
    answer_pdf       = models.FileField(
        upload_to="exam_pdfs/",
        db_column="answer_pdf_url",
        max_length=500,
        null=True,
        blank=True
    )

    is_deleted  = models.BooleanField(default=False)  # Soft delete
    created_by  = models.ForeignKey(
        User, on_delete=models.SET_NULL, db_column="created_by", null=True, blank=True
    )
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)  # Cập nhật tự động qua trigger trg_exams_updated

    class Meta:
        db_table = 'exams'
        managed  = False

    def __str__(self):
        return self.title


class ExamQuestion(models.Model):
    """
    Bảng: exam_questions
    Bảng trung gian N-N giữa Exam và Question.
    order_index xác định thứ tự câu hỏi trong đề thi.
    """
    exam        = models.ForeignKey(Exam, on_delete=models.CASCADE)
    question    = models.ForeignKey(Question, on_delete=models.CASCADE)

    # Thứ tự câu hỏi trong đề (0-indexed)
    order_index = models.SmallIntegerField(default=0)

    class Meta:
        db_table = 'exam_questions'
        managed  = False


class ExamAttempt(models.Model):
    """
    Bảng: exam_attempts
    Mỗi lần học sinh làm đề thi (tối đa 3 lần, CHECK constraint trong DB).
    submitted_at=NULL nghĩa là đang làm dở / chưa nộp.
    """
    user             = models.ForeignKey(User, on_delete=models.CASCADE)
    exam             = models.ForeignKey(Exam, on_delete=models.CASCADE)
    started_at       = models.DateTimeField(auto_now_add=True)

    # NULL = chưa nộp; NOT NULL = đã nộp (kể cả auto-submit hết giờ)
    submitted_at     = models.DateTimeField(null=True, blank=True)

    # Điểm thang 10 (tính bằng Python view, không tính trong SQL)
    score            = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    # Lần thi thứ mấy (1, 2, hoặc 3) — UNIQUE (user_id, exam_id, attempt_number)
    attempt_number   = models.SmallIntegerField(default=1)

    # True nếu hệ thống tự nộp do hết giờ (management command auto_submit_expired)
    is_auto_submitted = models.BooleanField(default=False)

    class Meta:
        db_table = 'exam_attempts'
        managed  = False


class ExamAnswer(models.Model):
    """
    Bảng: exam_answers
    Câu trả lời của học sinh trong 1 lần thi.
    answer_data là JSON theo cấu trúc:
      MCQ:        {"selected": "A"}
      True/False: {"answers": {"a": true, "b": false, "c": true, "d": false}}
      Short Ans:  {"value": 1.33}
    """
    attempt     = models.ForeignKey(ExamAttempt, on_delete=models.CASCADE)
    question    = models.ForeignKey(Question, on_delete=models.CASCADE)
    answer_data = models.JSONField()

    # NULL = chưa chấm; True/False = kết quả sau khi chấm
    is_correct  = models.BooleanField(null=True, blank=True)

    class Meta:
        db_table = 'exam_answers'
        managed  = False
