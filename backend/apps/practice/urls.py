from django.urls import path
from . import views

urlpatterns = [
    path('sessions/', views.create_session, name='create_session'),
    path('sessions/<int:pk>/answer/', views.answer_question, name='answer_question'),
    path('sessions/<int:pk>/end/', views.end_session, name='end_session'),
    path('sessions/<int:pk>/', views.session_detail, name='session_detail'),
    path('history/', views.practice_history, name='practice_history'),
]
