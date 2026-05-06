from django.urls import path
from . import views

urlpatterns = [
    # Session management
    path('sessions/', views.create_session, name='ai_create_session'),
    path('sessions/<int:session_id>/chat/', views.chat, name='ai_chat'),
    path('sessions/<int:session_id>/messages/', views.session_messages, name='ai_messages'),

    # PDF parsing (teacher)
    path('parse-pdf/', views.parse_pdf, name='ai_parse_pdf'),
]
