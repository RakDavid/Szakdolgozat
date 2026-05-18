from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.db.models import Avg
from .models import User, SportType, UserSportPreference


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Custom User admin felület
    """
    list_display = [
        'username', 
        'get_profile_picture', 
        'email', 
        'phone_number', 
        'default_location_name', 
        'display_radius', 
        'get_average_rating', 
        'is_staff'
    ]
    list_filter = ['is_staff', 'is_superuser', 'is_active', 'date_joined']
    search_fields = ['username', 'first_name', 'last_name', 'email', 'phone_number', 'default_location_name']
    ordering = ['-date_joined']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Profil információk', {
            'fields': ('bio', 'profile_picture', 'phone_number')
        }),
        ('Lokáció beállítások', {
            'fields': ('default_latitude', 'default_longitude', 'default_location_name', 'default_search_radius')
        }),
        ('Időbélyegek', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at', 'date_joined']

    def display_radius(self, obj):
        """Keresési sugár megjelenítése km-ben"""
        if obj.default_search_radius:
            return f"{obj.default_search_radius} km"
        return "-"
    display_radius.short_description = 'Sugár'
    
    def get_profile_picture(self, obj):
        """Profilkép megjelenítése az admin listában"""
        if obj.profile_picture:
            return format_html(
                '<img src="{}" width="50" height="50" style="border-radius: 50%; object-fit: cover;" />',
                obj.profile_picture.url
            )
        return '-'
    get_profile_picture.short_description = 'Profilkép'

    def get_average_rating(self, obj):
        """
        Kiszámolja a felhasználó által szervezett események átlagos értékelését.
        (A 'created_events' a SportEvent modellen lévő Foreign Key related_name-je)
        """
        avg = obj.created_events.filter(
            participants__rating__isnull=False
        ).aggregate(Avg('participants__rating'))['participants__rating__avg']
        
        if avg:
            return f"{avg:.1f} ⭐"
        return "-"
    get_average_rating.short_description = 'Szervezői értékelés'


@admin.register(SportType)
class SportTypeAdmin(admin.ModelAdmin):
    """
    Sportágak admin felület
    """
    list_display = ['name', 'icon', 'is_active', 'created_at', 'event_count']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    ordering = ['name']
    
    fieldsets = (
        ('Alapadatok', {
            'fields': ('name', 'description', 'icon')
        }),
        ('Beállítások', {
            'fields': ('is_active',)
        }),
    )
    
    readonly_fields = ['created_at']
    
    def event_count(self, obj):
        """Események száma ehhez a sportághoz"""
        return obj.events.count()
    event_count.short_description = 'Események száma'


class UserSportPreferenceInline(admin.TabularInline):
    """
    Inline sportág preferenciák a User admin-ban
    """
    model = UserSportPreference
    extra = 1
    fields = ['sport_type', 'skill_level', 'interest_level']


@admin.register(UserSportPreference)
class UserSportPreferenceAdmin(admin.ModelAdmin):
    """
    Felhasználói sportág preferenciák admin
    """
    list_display = ['user', 'sport_type', 'skill_level', 'interest_level', 'created_at']
    list_filter = ['skill_level', 'sport_type', 'interest_level']
    search_fields = ['user__username', 'sport_type__name']
    ordering = ['-interest_level', 'user']
    
    fieldsets = (
        ('Alapadatok', {
            'fields': ('user', 'sport_type')
        }),
        ('Preferenciák', {
            'fields': ('skill_level', 'interest_level')
        }),
        ('Időbélyegek', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at']
    
    def get_inline_instances(self, request, obj=None):
        if obj:
            return super().get_inline_instances(request, obj)
        return []

UserAdmin.inlines = [UserSportPreferenceInline]