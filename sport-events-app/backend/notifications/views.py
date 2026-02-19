from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """
    Saját értesítések listája
    GET /api/notifications/
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)


class UnreadCountView(APIView):
    """
    Olvasatlan értesítések száma
    GET /api/notifications/unread-count/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).count()
        return Response({'unread_count': count})


class MarkAllReadView(APIView):
    """
    Összes értesítés olvasottnak jelölése
    POST /api/notifications/mark-all-read/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(
            recipient=request.user, is_read=False
        ).update(is_read=True)
        return Response({'message': 'Összes értesítés olvasottnak jelölve.'})


class MarkReadView(APIView):
    """
    Egy értesítés olvasottnak jelölése
    POST /api/notifications/{id}/mark-read/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, recipient=request.user)
            notification.is_read = True
            notification.save()
            return Response({'message': 'Olvasottnak jelölve.'})
        except Notification.DoesNotExist:
            return Response({'error': 'Nem található.'}, status=status.HTTP_404_NOT_FOUND)