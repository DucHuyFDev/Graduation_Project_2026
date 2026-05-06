from django.db import models
from apps.accounts.models import User
from apps.topics.models import Topic
from apps.questions.models import Question

class PracticeSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'practice_sessions'

class PracticeAnswer(models.Model):
    session = models.ForeignKey(PracticeSession, on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    answer_data = models.JSONField()
    is_correct = models.BooleanField(null=True, blank=True)
    answered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'practice_answers'
