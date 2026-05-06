from django.urls import path
from . import views

urlpatterns = [
    path('tree/', views.topics_tree, name='topics_tree'),
    path('<int:topic_id>/', views.topic_detail_update_delete, name='topic_detail'),
    path('', views.topics_list_or_create, name='topics_list'),
]
