from django.urls import path
from . import views

urlpatterns = [
    path('upload-image/', views.upload_image, name='upload_image'),
    path('<int:pk>/check/', views.check_answer, name='check_answer'),
    path('<int:pk>/', views.question_detail_update_delete, name='question_detail'),
    path('', views.questions_list_or_create, name='questions_list'),
]
