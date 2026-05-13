from django.urls import path
from . import views

# Prefix: /api/videos/
urlpatterns = [
    # Live-sessions phải đặt TRƯỚC <int:video_id>/ để tránh conflict routing
    path('live-sessions/', views.live_sessions, name='video-live-sessions'),

    # Danh sách + tạo mới
    path('', views.video_list, name='video-list'),

    # Chi tiết + cập nhật + xóa
    path('<int:video_id>/', views.video_detail, name='video-detail'),
]
