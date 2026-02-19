from django.db import models
from accounts.models import User


class Notification(models.Model):
    TYPE_CHOICES = [
        ('join_request', 'Új jelentkezés'),
        ('join_approved', 'Jelentkezés jóváhagyva'),
        ('join_rejected', 'Jelentkezés elutasítva'),
        ('join_cancelled', 'Jelentkezés lemondva'),
    ]

    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name="Címzett"
    )
    notification_type = models.CharField(
        max_length=30,
        choices=TYPE_CHOICES,
        verbose_name="Típus"
    )
    title = models.CharField(max_length=200, verbose_name="Cím")
    message = models.TextField(verbose_name="Üzenet")
    is_read = models.BooleanField(default=False, verbose_name="Olvasott")
    related_event_id = models.IntegerField(null=True, blank=True)
    related_event_title = models.CharField(max_length=200, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Létrehozva")

    class Meta:
        verbose_name = "Értesítés"
        verbose_name_plural = "Értesítések"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.recipient.username} - {self.title}"