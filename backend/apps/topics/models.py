from django.db import models

class Topic(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)
    level = models.SmallIntegerField()
    order_index = models.SmallIntegerField(default=0)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'topics'
