from django.urls import path
from . import views

urlpatterns = [
    # Attempt endpoints — đặt TRƯỚC để tránh conflict với <int:exam_id>
    path('attempts/<int:attempt_id>/submit/', views.submit_attempt, name='submit_attempt'),
    path('attempts/<int:attempt_id>/', views.attempt_detail, name='attempt_detail'),

    # Exam endpoints
    path('<int:exam_id>/upload-pdf/', views.upload_exam_pdf, name='upload_exam_pdf'),
    path('<int:exam_id>/attempts/', views.create_attempt, name='create_attempt'),
    path('<int:exam_id>/', views.exam_detail_update_delete, name='exam_detail'),
    path('', views.exams_list_or_create, name='exams_list'),
]
