from django.urls import path
from .views import (
    NotificationListView,
    UnreadCountView,
    MarkAllReadView,
    MarkReadView
)

app_name = 'notifications'

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification-list'),
    path('unread-count/', UnreadCountView.as_view(), name='unread-count'),
    path('mark-all-read/', MarkAllReadView.as_view(), name='mark-all-read'),
    path('<int:pk>/mark-read/', MarkReadView.as_view(), name='mark-read'),
]