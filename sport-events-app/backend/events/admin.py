from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from django.db.models import Avg
from .models import SportEvent, EventParticipant


class EventParticipantInline(admin.TabularInline):
    """
    Inline résztvevők az esemény admin-ban.
    Itt rögtön látni fogod, ki hány csillagot adott, és mit írt (feedback).
    """
    model = EventParticipant
    extra = 0 
    fields = ['user', 'status', 'joined_at', 'extra_guests', 'rating', 'short_feedback']
    readonly_fields = ['joined_at', 'short_feedback']

    def short_feedback(self, obj):
        """Csak olvasható, rövidített visszajelzés a táblázatban"""
        if obj.feedback:
            return obj.feedback[:50] + "..." if len(obj.feedback) > 50 else obj.feedback
        return "-"
    short_feedback.short_description = 'Szöveges értékelés'


@admin.register(SportEvent)
class SportEventAdmin(admin.ModelAdmin):
    """
    Sportesemények admin felület (Intelligens, dinamikus adatokkal)
    """
    list_display = [
        'title', 
        'sport_type', 
        'creator', 
        'start_date_time', 
        'display_participants', 
        'display_real_status',  
        'get_average_rating',    
        'created_at'
    ]
    
    list_filter = [
        'status', 
        'sport_type', 
        'difficulty', 
        'start_date_time'
    ]
    
    search_fields = [
        'title', 'description', 'location_name', 'creator__username'
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
            'fields': ('max_participants', 'min_participants', 'reserved_spots')
        }),
        ('Beállítások', {
            'fields': ('difficulty', 'is_public', 'requires_approval', 'is_free', 'price')
        }),
        ('Egyéb', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at']
    
    inlines = [EventParticipantInline]
    
    def display_participants(self, obj):
        """Kiszámolt résztvevők száma / maximum (plusz vendégekkel és szervezővel együtt)"""
        count = obj.participants_count 
        return f"{count} / {obj.max_participants}"
    display_participants.short_description = 'Létszám'

    def display_real_status(self, obj):
        """Valós státusz kiszámítása és vizuális megjelenítése az idő alapján"""
        now = timezone.now()
        if obj.status == 'cancelled':
            return format_html('<span style="color: red; font-weight: bold;">❌ Törölve</span>')
        
        if obj.start_date_time > now:
            return format_html('<span style="color: #d97706; font-weight: bold;">⏳ Közelgő</span>')
        
        if obj.duration_minutes:
            end_time = obj.start_date_time + timezone.timedelta(minutes=obj.duration_minutes)
            if now < end_time:
                return format_html('<span style="color: #2563eb; font-weight: bold;">🏃 Folyamatban</span>')
            else:
                return format_html('<span style="color: #16a34a; font-weight: bold;">✅ Befejezett</span>')
        
        return format_html('<span style="color: #16a34a; font-weight: bold;">✅ Befejezett</span>')
    display_real_status.short_description = 'Állapot'

    def get_average_rating(self, obj):
        """Kiszámolja az esemény átlagos értékelését a résztvevők pontjai alapján"""
        avg = obj.participants.filter(rating__isnull=False).aggregate(Avg('rating'))['rating__avg']
        if avg:
            return f"{avg:.1f} ⭐"
        return "-"
    get_average_rating.short_description = 'Értékelés'


@admin.register(EventParticipant)
class EventParticipantAdmin(admin.ModelAdmin):
    """
    Különálló Résztvevők és Értékelések admin felülete
    """
    list_display = [
        'user', 'event', 'status', 'joined_at', 'get_rating', 'short_feedback'
    ]
    
    list_filter = ['status', 'rating', 'event__sport_type']
    search_fields = ['user__username', 'event__title', 'feedback']
    ordering = ['-joined_at']
    date_hierarchy = 'joined_at'
    
    fieldsets = (
        ('Alapadatok', {
            'fields': ('event', 'user', 'status', 'extra_guests')
        }),
        ('Értékelés', {
            'fields': ('rating', 'feedback'),
        }),
        ('Időpontok és Megjegyzések', {
            'fields': ('joined_at', 'confirmed_at', 'notes'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['joined_at', 'confirmed_at']
    
    def get_rating(self, obj):
        """Értékelés csillagokkal való megjelenítése"""
        if obj.rating:
            return '⭐' * obj.rating
        return '-'
    get_rating.short_description = 'Értékelés'

    def short_feedback(self, obj):
        """Rövidített visszajelzés a fő listanézethez"""
        if obj.feedback:
            return obj.feedback[:50] + "..." if len(obj.feedback) > 50 else obj.feedback
        return "-"
    short_feedback.short_description = 'Visszajelzés'