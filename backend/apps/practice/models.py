from django.db import models
from apps.accounts.models import User
from apps.topics.models import Topic
from apps.questions.models import Question


# ============================================================
# APP: practice
# Quản lý phiên luyện tập tự do theo chuyên đề.
# Câu hỏi được chọn bằng SQL WITH RECURSIVE duyệt cây topic.
# Tiến độ tính theo số câu trả lời đúng >= 2 lần.
# ============================================================


class PracticeSession(models.Model):
    """
    Bảng: practice_sessions
    Mỗi phiên luyện tập của 1 học sinh trên 1 chuyên đề.
    ended_at=NULL nghĩa là phiên đang mở (học sinh đang luyện tập).
    """
    user       = models.ForeignKey(User, on_delete=models.CASCADE)
    topic      = models.ForeignKey(Topic, on_delete=models.CASCADE)
    started_at = models.DateTimeField(auto_now_add=True)

    # NULL = đang luyện tập; NOT NULL = đã kết thúc phiên
    ended_at   = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'practice_sessions'
        managed  = False


class PracticeAnswer(models.Model):
    """
    Bảng: practice_answers
    Câu trả lời trong phiên luyện tập.
    answer_data JSON tương tự exam_answers:
      MCQ:        {"selected": "A"}
      True/False: {"answers": {"a": true, "b": false, "c": true, "d": false}}
      Short Ans:  {"value": 1.33}
    """
    session     = models.ForeignKey(PracticeSession, on_delete=models.CASCADE)
    question    = models.ForeignKey(Question, on_delete=models.CASCADE)
    answer_data = models.JSONField()

    # True/False = chấm ngay tại thời điểm trả lời
    is_correct  = models.BooleanField(null=True, blank=True)

    answered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'practice_answers'
        managed  = False
