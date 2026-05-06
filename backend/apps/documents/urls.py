from django.urls import path
from . import views

urlpatterns = [
    path('', views.document_list, name='doc_list'),
    path('<int:doc_id>/', views.document_detail, name='doc_detail'),
]
