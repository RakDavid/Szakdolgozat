from django.contrib import admin
from .models import Notification

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """
    Értesítések felügyelete az admin felületen
    """
    list_display = ['recipient', 'notification_type', 'title', 'is_read', 'created_at']
    list_filter = ['is_read', 'notification_type', 'created_at']
    search_fields = ['recipient__username', 'title', 'message']
    ordering = ['-created_at']
    
    readonly_fields = ['created_at']

    actions = ['mark_as_read']

    @admin.action(description='Kiválasztott értesítések olvasottnak jelölése')
    def mark_as_read(self, request, queryset):
        updated = queryset.update(is_read=True)
        self.message_user(request, f'{updated} értesítés sikeresen olvasottnak jelölve.')