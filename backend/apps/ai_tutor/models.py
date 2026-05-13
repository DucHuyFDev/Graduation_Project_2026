from django.db import models
from apps.accounts.models import User


# ============================================================
# APP: ai_tutor
# Quản lý phiên hội thoại AI và tin nhắn.
# Logic gọi Gemini API nằm trong file gemini.py cùng thư mục.
# context_type='practice' kết hợp context_id=session.id để AI
# hiểu ngữ cảnh học sinh đang luyện tập chuyên đề nào.
# ============================================================


class AIChatSession(models.Model):
    """
    Bảng: ai_chat_sessions
    Phiên hội thoại với AI Tutor (mỗi phiên là 1 thread riêng).
    context_type + context_id xác định ngữ cảnh học tập hiện tại.
    """
    CONTEXT_TYPES = [
        ('practice', 'Trong phiên luyện tập'),  # context_id = practice_sessions.id
        ('general',  'Hỏi đáp tổng quát'),       # context_id = NULL
    ]

    user         = models.ForeignKey(User, on_delete=models.CASCADE)
    context_type = models.CharField(max_length=20, choices=CONTEXT_TYPES, default='general')

    # FK logic đến practice_sessions.id (không dùng FK cứng để tránh circular import)
    context_id   = models.IntegerField(null=True, blank=True)

    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_chat_sessions'
        managed  = False


class AIChatMessage(models.Model):
    """
    Bảng: ai_chat_messages
    Tin nhắn trong phiên hội thoại AI.
    role='user' = tin nhắn từ học sinh, role='assistant' = phản hồi từ AI.
    """
    ROLE_CHOICES = [
        ('user',      'Học sinh'),
        ('assistant', 'AI Tutor'),
    ]

    session    = models.ForeignKey(AIChatSession, on_delete=models.CASCADE)
    role       = models.CharField(max_length=10, choices=ROLE_CHOICES)

    # Nội dung plain text (AI trả lời markdown, frontend render)
    content    = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_chat_messages'
        managed  = False
