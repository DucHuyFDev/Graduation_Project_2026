from django.db import models
from apps.accounts.models import User

class AIChatSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    context_type = models.CharField(max_length=20, default='general')
    context_id = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'ai_chat_sessions'

class AIChatMessage(models.Model):
    session = models.ForeignKey(AIChatSession, on_delete=models.CASCADE)
    role = models.CharField(max_length=10)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'ai_chat_messages'
