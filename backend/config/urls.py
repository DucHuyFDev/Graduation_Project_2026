from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/topics/', include('apps.topics.urls')),
    path('api/questions/', include('apps.questions.urls')),
    path('api/exams/', include('apps.exams.urls')),
    path('api/practice/', include('apps.practice.urls')),
    path('api/documents/', include('apps.documents.urls')),
    path('api/ai/', include('apps.ai_tutor.urls')),
    path('api/stats/', include('apps.stats.urls')),
    path('api/videos/', include('apps.videos.urls')),
    path('api/comments/', include('apps.comments.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    # Serve photo directory
    from django.views.static import serve
    from django.urls import re_path
    urlpatterns += [
        re_path(r'^media/photo/(?P<path>.*)$', serve, {'document_root': settings.PHOTO_DIR}),
    ]
