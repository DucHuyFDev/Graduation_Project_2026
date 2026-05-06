from django.urls import path
from . import views

urlpatterns = [
    path('me/', views.stats_me, name='stats_me'),
    path('teacher/', views.stats_teacher, name='stats_teacher'),
    path('exam/<int:exam_id>/', views.stats_exam, name='stats_exam'),
    path('students/', views.students_list, name='stats_students'),
]
