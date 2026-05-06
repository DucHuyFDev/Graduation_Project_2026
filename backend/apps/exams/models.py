from django.db import models
from apps.topics.models import Topic
from apps.accounts.models import User
from apps.questions.models import Question

class Exam(models.Model):
    EXAM_TYPES = [
        ('topic', 'topic'),
        ('midterm', 'midterm'),
        ('final', 'final'),
        ('graduation', 'graduation'),
    ]
    title = models.CharField(max_length=255)
    exam_type = models.CharField(max_length=20, choices=EXAM_TYPES)
    topic = models.ForeignKey(Topic, on_delete=models.SET_NULL, null=True, blank=True)
    duration_minutes = models.SmallIntegerField(default=90)
    answer_pdf = models.FileField(upload_to="exam_pdfs/", db_column="answer_pdf_url", max_length=500, null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, db_column="created_by", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'exams'

class ExamQuestion(models.Model):
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    order_index = models.SmallIntegerField(default=0)

    class Meta:
        managed = False
        db_table = 'exam_questions'

class ExamAttempt(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE)
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    attempt_number = models.SmallIntegerField(default=1)
    is_auto_submitted = models.BooleanField(default=False)

    class Meta:
        managed = False
        db_table = 'exam_attempts'

class ExamAnswer(models.Model):
    attempt = models.ForeignKey(ExamAttempt, on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    answer_data = models.JSONField()
    is_correct = models.BooleanField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'exam_answers'
