from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from accounts.models import User, SportType


class SportEvent(models.Model):
    """
    Sporteseményt reprezentáló model
    """
    STATUS_CHOICES = [
        ('upcoming', 'Közelgő'),
        ('ongoing', 'Folyamatban'),
        ('completed', 'Befejezett'),
        ('cancelled', 'Törölve'),
    ]
    
    DIFFICULTY_CHOICES = [
        ('easy', 'Kezdő'),
        ('medium', 'Közepes'),
        ('hard', 'Haladó'),
    ]
    
    # Alapadatok
    title = models.CharField(
        max_length=200,
        verbose_name="Cím"
    )
    
    description = models.TextField(
        verbose_name="Leírás"
    )
    
    sport_type = models.ForeignKey(
        SportType,
        on_delete=models.PROTECT,
        related_name='events',
        verbose_name="Sportág"
    )
    
    # Szervező
    creator = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_events',
        verbose_name="Szervező"
    )
    
    # Időpont
    start_date_time = models.DateTimeField(
        verbose_name="Kezdés időpontja"
    )
    
    end_date_time = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Befejezés időpontja"
    )
    
    duration_minutes = models.IntegerField(
        blank=True,
        null=True,
        validators=[MinValueValidator(15)],
        verbose_name="Időtartam (perc)",
        help_text="Esemény várható időtartama percben"
    )
    
    # Helyszín
    location_name = models.CharField(
        max_length=200,
        verbose_name="Helyszín neve"
    )
    
    location_address = models.CharField(
        max_length=300,
        blank=True,
        null=True,
        verbose_name="Pontos cím"
    )
    
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        verbose_name="Földrajzi szélesség"
    )
    
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        verbose_name="Földrajzi hosszúság"
    )
    
    # Résztvevők
    max_participants = models.IntegerField(
        validators=[MinValueValidator(2)],
        verbose_name="Maximum résztvevők száma"
    )
    
    min_participants = models.IntegerField(
        default=2,
        validators=[MinValueValidator(1)],
        verbose_name="Minimum résztvevők száma",
        help_text="Hány fő alatt nem jön létre az esemény"
    )
    
    # Nehézség és egyéb
    difficulty = models.CharField(
        max_length=20,
        choices=DIFFICULTY_CHOICES,
        default='medium',
        verbose_name="Nehézségi szint"
    )
    
    is_public = models.BooleanField(
        default=True,
        verbose_name="Nyilvános",
        help_text="Mindenki láthatja és jelentkezhet"
    )
    
    requires_approval = models.BooleanField(
        default=False,
        verbose_name="Jóváhagyás szükséges",
        help_text="A szervező jóváhagyása szükséges a jelentkezéshez"
    )
    
    is_free = models.BooleanField(
        default=True,
        verbose_name="Ingyenes"
    )
    
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(0)],
        verbose_name="Ár (Ft)",
        help_text="Részvételi díj"
    )
    
    # Metaadatok
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='upcoming',
        verbose_name="Státusz"
    )
    
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Megjegyzések",
        help_text="Egyéb fontos információk"
    )
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Létrehozva")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Frissítve")
    
    class Meta:
        verbose_name = "Sportesemény"
        verbose_name_plural = "Sportesemények"
        ordering = ['start_date_time']
        indexes = [
            models.Index(fields=['start_date_time', 'status']),
            models.Index(fields=['latitude', 'longitude']),
            models.Index(fields=['sport_type', 'status']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.start_date_time.strftime('%Y-%m-%d %H:%M')}"
    
    @property
    def is_full(self):
        """Ellenőrzi, hogy betelt-e az esemény"""
        return self.participants.filter(status='confirmed').count() >= self.max_participants
    
    @property
    def available_spots(self):
        """Hány szabad hely van még"""
        confirmed_count = self.participants.filter(status='confirmed').count()
        return max(0, self.max_participants - confirmed_count)
    
    @property
    def is_past(self):
        """Ellenőrzi, hogy már elmúlt-e az esemény"""
        return self.start_date_time < timezone.now()
    
    def can_user_join(self, user):
        """Ellenőrzi, hogy egy felhasználó csatlakozhat-e"""
        if self.is_full:
            return False, "Az esemény betelt"
        if self.is_past:
            return False, "Az esemény már elmúlt"
        if self.status != 'upcoming':
            return False, "Az esemény nem elérhető"
        if self.participants.filter(user=user).exists():
            return False, "Már jelentkeztél erre az eseményre"
        return True, "Jelentkezhetsz"


class EventParticipant(models.Model):
    """
    Esemény résztvevők
    """
    STATUS_CHOICES = [
        ('pending', 'Függőben'),
        ('confirmed', 'Megerősítve'),
        ('cancelled', 'Lemondva'),
        ('rejected', 'Elutasítva'),
    ]
    
    event = models.ForeignKey(
        SportEvent,
        on_delete=models.CASCADE,
        related_name='participants',
        verbose_name="Esemény"
    )
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='event_participations',
        verbose_name="Résztvevő"
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Státusz"
    )
    
    joined_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Jelentkezés időpontja"
    )
    
    confirmed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Megerősítés időpontja"
    )
    
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Megjegyzés",
        help_text="Üzenet a szervezőnek"
    )
    
    rating = models.IntegerField(
        blank=True,
        null=True,
        validators=[MinValueValidator(1), MinValueValidator(5)],
        verbose_name="Értékelés",
        help_text="Esemény értékelése 1-5 csillag"
    )
    
    feedback = models.TextField(
        blank=True,
        null=True,
        verbose_name="Visszajelzés"
    )
    
    class Meta:
        verbose_name = "Résztvevő"
        verbose_name_plural = "Résztvevők"
        unique_together = ['event', 'user']
        ordering = ['joined_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.event.title} ({self.status})"
    
    def save(self, *args, **kwargs):
        # Automatikus megerősítés, ha nincs jóváhagyás szükséges
        if not self.event.requires_approval and self.status == 'pending':
            self.status = 'confirmed'
            self.confirmed_at = timezone.now()
        super().save(*args, **kwargs)


class EventImage(models.Model):
    """
    Eseményekhez tartozó képek
    """
    event = models.ForeignKey(
        SportEvent,
        on_delete=models.CASCADE,
        related_name='images',
        verbose_name="Esemény"
    )
    
    image = models.ImageField(
        upload_to='event_images/',
        verbose_name="Kép"
    )
    
    caption = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name="Képaláírás"
    )
    
    is_primary = models.BooleanField(
        default=False,
        verbose_name="Elsődleges kép",
        help_text="Ez a kép jelenik meg az esemény előnézetben"
    )
    
    uploaded_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Feltöltve"
    )
    
    class Meta:
        verbose_name = "Esemény kép"
        verbose_name_plural = "Esemény képek"
        ordering = ['-is_primary', '-uploaded_at']
    
    def __str__(self):
        return f"Kép - {self.event.title}"
