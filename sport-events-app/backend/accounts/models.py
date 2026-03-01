from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class User(AbstractUser):
    """
    Custom User model a sportesemény alkalmazáshoz.
    Kiterjeszti a Django alapértelmezett User modelljét.
    """
    
    bio = models.TextField(
        max_length=500, 
        blank=True, 
        null=True,
        verbose_name="Bemutatkozás"
    )
    
    profile_picture = models.ImageField(
        upload_to='profile_pictures/', 
        blank=True, 
        null=True,
        verbose_name="Profilkép"
    )
    
    phone_number = models.CharField(
        max_length=20, 
        blank=True, 
        null=True,
        verbose_name="Telefonszám"
    )
    
    default_latitude = models.DecimalField(
        max_digits=9, 
        decimal_places=6, 
        blank=True, 
        null=True,
        verbose_name="Alapértelmezett szélesség",
        help_text="Alapértelmezett földrajzi szélesség"
    )
    
    default_longitude = models.DecimalField(
        max_digits=9, 
        decimal_places=6, 
        blank=True, 
        null=True,
        verbose_name="Alapértelmezett hosszúság",
        help_text="Alapértelmezett földrajzi hosszúság"
    )
    
    default_location_name = models.CharField(
        max_length=200, 
        blank=True, 
        null=True,
        verbose_name="Alapértelmezett helyszín neve"
    )
    
    default_search_radius = models.IntegerField(
        default=10,
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        verbose_name="Alapértelmezett keresési sugár (km)",
        help_text="Hány km-es körzetben keressen eseményeket"
    )
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Létrehozva")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Frissítve")
    
    class Meta:
        verbose_name = "Felhasználó"
        verbose_name_plural = "Felhasználók"
        ordering = ['-date_joined']
    
    def __str__(self):
        return self.username
    
    @property
    def full_name(self):
        """Teljes név visszaadása"""
        return f"{self.last_name} {self.first_name}".strip() or self.username


class SportType(models.Model):
    """
    Sportágak katalógusa
    """
    name = models.CharField(
        max_length=100, 
        unique=True,
        verbose_name="Sportág neve"
    )
    
    description = models.TextField(
        blank=True, 
        null=True,
        verbose_name="Leírás"
    )
    
    icon = models.CharField(
        max_length=50, 
        blank=True, 
        null=True,
        verbose_name="Ikon név",
        help_text="Pl: 'football', 'basketball', 'running'"
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name="Aktív"
    )
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Létrehozva")
    
    class Meta:
        verbose_name = "Sportág"
        verbose_name_plural = "Sportágak"
        ordering = ['name']
    
    def __str__(self):
        return self.name


class UserSportPreference(models.Model):
    """
    Felhasználói sportág preferenciák az ajánlórendszerhez
    """
    SKILL_LEVEL_CHOICES = [
        ('beginner', 'Kezdő'),
        ('intermediate', 'Haladó'),
        ('advanced', 'Profi'),
    ]
    
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='sport_preferences',
        verbose_name="Felhasználó"
    )
    
    sport_type = models.ForeignKey(
        SportType, 
        on_delete=models.CASCADE,
        verbose_name="Sportág"
    )
    
    skill_level = models.CharField(
        max_length=20, 
        choices=SKILL_LEVEL_CHOICES, 
        default='intermediate',
        verbose_name="Szint"
    )
    
    interest_level = models.IntegerField(
        default=5,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        verbose_name="Érdeklődési szint",
        help_text="1-10 skálán mennyire érdekli ez a sportág"
    )
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Létrehozva")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Frissítve")
    
    class Meta:
        verbose_name = "Sportág preferencia"
        verbose_name_plural = "Sportág preferenciák"
        unique_together = ['user', 'sport_type']
        ordering = ['-interest_level']
    
    def __str__(self):
        return f"{self.user.username} - {self.sport_type.name} ({self.skill_level})"
