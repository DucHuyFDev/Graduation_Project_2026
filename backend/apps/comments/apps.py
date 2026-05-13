from django.apps import AppConfig


class CommentsConfig(AppConfig):
    """Cấu hình app quản lý bình luận."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.comments'
