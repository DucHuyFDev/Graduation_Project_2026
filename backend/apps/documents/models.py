from django.db import models
from apps.accounts.models import User

class Document(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    file = models.FileField(upload_to="documents/", db_column="file_url", max_length=500)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, db_column="uploaded_by", null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'documents'
