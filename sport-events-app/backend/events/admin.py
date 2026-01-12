from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import SportEvent, EventParticipant, EventImage


class EventImageInline(admin.TabularInline):
    """
    Inline képek az esemény admin-ban
    """
    model = EventImage
    extra = 1
    fields = ['image', 'caption', 'is_primary']


class EventParticipantInline(admin.TabularInline):
    """
    Inline résztvevők az esemény admin-ban
    """
    model = EventParticipant
    extra = 0
    fields = ['user', 'status', 'joined_at', 'rating']
    readonly_fields = ['joined_at']


@admin.register(SportEvent)
class SportEventAdmin(admin.ModelAdmin):
    """
    Sportesemények admin felület
    """
    list_display = [
        'title', 
        'sport_type', 
        'creator', 
        'start_date_time', 
        'location_name',
        'get_participants_count',
        'status',
        'is_full_display',
        'created_at'
    ]
    
    list_filter = [
        'status', 
        'sport_type', 
        'difficulty', 
        'is_public', 
        'is_free',
        'start_date_time',
        'created_at'
    ]
    
    search_fields = [
        'title', 
        'description', 
        'location_name', 
        'location_address',
        'creator__username'
    ]
    
    ordering = ['-start_date_time']
    
    date_hierarchy = 'start_date_time'
    
    fieldsets = (
        ('Alapadatok', {
            'fields': ('title', 'description', 'sport_type', 'creator', 'status')
        }),
        ('Időpont', {
            'fields': ('start_date_time', 'end_date_time', 'duration_minutes')
        }),
        ('Helyszín', {
            'fields': ('location_name', 'location_address', 'latitude', 'longitude')
        }),
        ('Résztvevők', {
            'fields': ('max_participants', 'min_participants')
        }),
        ('Beállítások', {
            'fields': ('difficulty', 'is_public', 'requires_approval', 'is_free', 'price')
        }),
        ('Egyéb', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Metaadatok', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at']
    
    inlines = [EventParticipantInline, EventImageInline]
    
    def get_participants_count(self, obj):
        """Résztvevők száma / maximum"""
        confirmed = obj.participants.filter(status='confirmed').count()
        return f"{confirmed} / {obj.max_participants}"
    get_participants_count.short_description = 'Résztvevők'
    
    def is_full_display(self, obj):
        """Betelt-e jelző"""
        if obj.is_full:
            return format_html(
                '<span style="color: red; font-weight: bold;">✓ Betelt</span>'
            )
        return format_html(
            '<span style="color: green;">✗ Van hely</span>'
        )
    is_full_display.short_description = 'Betelt?'
    
    actions = ['mark_as_completed', 'mark_as_cancelled']
    
    def mark_as_completed(self, request, queryset):
        """Események befejezettnek jelölése"""
        updated = queryset.update(status='completed')
        self.message_user(request, f'{updated} esemény befejezettnek jelölve.')
    mark_as_completed.short_description = 'Kiválasztottak befejezettnek jelölése'
    
    def mark_as_cancelled(self, request, queryset):
        """Események törlése"""
        updated = queryset.update(status='cancelled')
        self.message_user(request, f'{updated} esemény törölve.')
    mark_as_cancelled.short_description = 'Kiválasztottak törlése'


@admin.register(EventParticipant)
class EventParticipantAdmin(admin.ModelAdmin):
    """
    Résztvevők admin felület
    """
    list_display = [
        'user',
        'event',
        'status',
        'joined_at',
        'confirmed_at',
        'get_rating'
    ]
    
    list_filter = [
        'status',
        'joined_at',
        'event__sport_type'
    ]
    
    search_fields = [
        'user__username',
        'user__email',
        'event__title'
    ]
    
    ordering = ['-joined_at']
    
    date_hierarchy = 'joined_at'
    
    fieldsets = (
        ('Alapadatok', {
            'fields': ('event', 'user', 'status')
        }),
        ('Időpontok', {
            'fields': ('joined_at', 'confirmed_at')
        }),
        ('Megjegyzések', {
            'fields': ('notes',)
        }),
        ('Értékelés', {
            'fields': ('rating', 'feedback'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['joined_at', 'confirmed_at']
    
    def get_rating(self, obj):
        """Értékelés csillagokkal"""
        if obj.rating:
            return '⭐' * obj.rating
        return '-'
    get_rating.short_description = 'Értékelés'
    
    actions = ['confirm_participants', 'cancel_participants']
    
    def confirm_participants(self, request, queryset):
        """Résztvevők megerősítése"""
        updated = queryset.update(status='confirmed', confirmed_at=timezone.now())
        self.message_user(request, f'{updated} résztvevő megerősítve.')
    confirm_participants.short_description = 'Kiválasztottak megerősítése'
    
    def cancel_participants(self, request, queryset):
        """Résztvevők lemondása"""
        updated = queryset.update(status='cancelled')
        self.message_user(request, f'{updated} résztvevő lemondva.')
    cancel_participants.short_description = 'Kiválasztottak lemondása'


@admin.register(EventImage)
class EventImageAdmin(admin.ModelAdmin):
    """
    Esemény képek admin
    """
    list_display = [
        'get_thumbnail',
        'event',
        'caption',
        'is_primary',
        'uploaded_at'
    ]
    
    list_filter = [
        'is_primary',
        'uploaded_at'
    ]
    
    search_fields = [
        'event__title',
        'caption'
    ]
    
    ordering = ['-uploaded_at']
    
    fieldsets = (
        ('Kép', {
            'fields': ('event', 'image', 'caption')
        }),
        ('Beállítások', {
            'fields': ('is_primary',)
        }),
    )
    
    readonly_fields = ['uploaded_at']
    
    def get_thumbnail(self, obj):
        """Kép előnézet"""
        if obj.image:
            return format_html(
                '<img src="{}" width="100" height="100" style="object-fit: cover;" />',
                obj.image.url
            )
        return '-'
    get_thumbnail.short_description = 'Előnézet'
