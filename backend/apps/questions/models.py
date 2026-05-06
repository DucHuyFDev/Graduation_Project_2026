from django.db import models
from apps.topics.models import Topic
from apps.accounts.models import User

class Question(models.Model):
    QUESTION_TYPES = [
        ('mcq', 'Câu hỏi Trắc nghiệm'),
        ('true_false', 'Câu hỏi Đúng sai'),
        ('short_answer', 'Câu hỏi Trả lời ngắn'),
    ]
    topic = models.ForeignKey(Topic, on_delete=models.SET_NULL, null=True, blank=True)
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES)
    content_json = models.JSONField()
    image_url = models.CharField(max_length=500, null=True, blank=True)
    difficulty = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, db_column="created_by", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'questions'

class QuestionOption(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    option_key = models.CharField(max_length=1)
    content_json = models.JSONField()
    is_correct = models.BooleanField(default=False)

    class Meta:
        managed = False
        db_table = 'question_options'

class QuestionTFStatement(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    statement_key = models.CharField(max_length=1)
    content_json = models.JSONField()
    is_true = models.BooleanField()

    class Meta:
        managed = False
        db_table = 'question_tf_statements'

class QuestionShortAnswer(models.Model):
    question = models.OneToOneField(Question, on_delete=models.CASCADE)
    correct_answer = models.DecimalField(max_digits=20, decimal_places=4)

    class Meta:
        managed = False
        db_table = 'question_short_answers'
