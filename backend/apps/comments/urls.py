from django.urls import path
from . import views

urlpatterns = [
    # GET  /api/comments/?target_type=video&target_id=1  — danh sách comment (public)
    # POST /api/comments/                                — tạo comment [auth]
    path('', views.comment_list_create, name='comment-list-create'),

    # PATCH  /api/comments/<id>/  — sửa nội dung [auth, chủ comment]
    # DELETE /api/comments/<id>/  — soft delete   [auth, chủ hoặc teacher]
    path('<int:comment_id>/', views.comment_detail, name='comment-detail'),
]
