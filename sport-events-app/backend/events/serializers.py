from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from .models import SportEvent, EventParticipant, EventImage
from accounts.serializers import UserSerializer, SportTypeSerializer
from math import radians, sin, cos, sqrt, atan2


class EventImageSerializer(serializers.ModelSerializer):
    """
    Esemény kép serializer
    """
    class Meta:
        model = EventImage
        fields = ['id', 'image', 'caption', 'is_primary', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']


class EventParticipantSerializer(serializers.ModelSerializer):
    """
    Esemény résztvevő serializer
    """
    user_detail = UserSerializer(source='user', read_only=True)
    
    class Meta:
        model = EventParticipant
        fields = [
            'id',
            'user',
            'user_detail',
            'status',
            'joined_at',
            'confirmed_at',
            'notes',
            'rating',
            'feedback'
        ]
        read_only_fields = ['id', 'joined_at', 'confirmed_at']


class SportEventListSerializer(serializers.ModelSerializer):
    """
    Események listázására (kevesebb adat)
    """
    sport_type_detail = SportTypeSerializer(source='sport_type', read_only=True)
    creator_detail = UserSerializer(source='creator', read_only=True)
    primary_image = serializers.SerializerMethodField()
    participants_count = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    is_full = serializers.ReadOnlyField()
    available_spots = serializers.ReadOnlyField()
    distance = serializers.SerializerMethodField()
    
    recommendation_score = serializers.FloatField(
        read_only=True,
        default=None
    )

    class Meta:
        model = SportEvent
        fields = [
            'id',
            'title',
            'description',
            'sport_type',
            'sport_type_detail',
            'creator',
            'creator_detail',
            'start_date_time',
            'duration_minutes',
            'location_name',
            'latitude',
            'longitude',
            'max_participants',
            'participants_count',
            'difficulty',
            'is_public',
            'requires_approval',
            'is_free',
            'price',
            'status',
            'is_full',
            'available_spots',
            'primary_image',
            'distance',
            'recommendation_score',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'creator']
    
    def get_primary_image(self, obj):
        """Elsődleges kép URL-je"""
        primary = obj.images.filter(is_primary=True).first()
        if primary:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(primary.image.url)
        return None
    
    def get_participants_count(self, obj):
        """Megerősített résztvevők száma"""
        return obj.participants.filter(status='confirmed').count()
    
    def get_distance(self, obj):
        """
        Távolság számítása a felhasználó pozíciójától (ha meg van adva)
        Haversine formula használatával
        """
        request = self.context.get('request')
        if not request or not request.query_params.get('user_lat') or not request.query_params.get('user_lng'):
            return None
        
        try:
            user_lat = float(request.query_params.get('user_lat'))
            user_lng = float(request.query_params.get('user_lng'))
            
            R = 6371 
            
            lat1 = radians(user_lat)
            lon1 = radians(user_lng)
            lat2 = radians(float(obj.latitude))
            lon2 = radians(float(obj.longitude))
            
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * atan2(sqrt(a), sqrt(1-a))
            distance = R * c
            
            return round(distance, 2)
        except (ValueError, TypeError):
            return None
        
    def get_status(self, obj):
        if getattr(obj, 'status', None) == 'cancelled':
            return 'cancelled'
            
        now = timezone.now()
        duration = getattr(obj, 'duration_minutes', 60) or 60
        end_time = obj.start_date_time + timedelta(minutes=duration)

        if now < obj.start_date_time:
            return 'upcoming'
        elif obj.start_date_time <= now <= end_time:
            return 'ongoing'
        else:
            return 'completed'


class SportEventDetailSerializer(serializers.ModelSerializer):
    """
    Esemény részletes megjelenítése
    """
    sport_type_detail = SportTypeSerializer(source='sport_type', read_only=True)
    creator_detail = UserSerializer(source='creator', read_only=True)
    participants = EventParticipantSerializer(many=True, read_only=True)
    images = EventImageSerializer(many=True, read_only=True)
    status = serializers.SerializerMethodField()
    is_full = serializers.ReadOnlyField()
    available_spots = serializers.ReadOnlyField()
    is_past = serializers.ReadOnlyField()
    user_participation_status = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    
    class Meta:
        model = SportEvent
        fields = [
            'id',
            'title',
            'description',
            'sport_type',
            'sport_type_detail',
            'creator',
            'creator_detail',
            'start_date_time',
            'end_date_time',
            'duration_minutes',
            'location_name',
            'location_address',
            'latitude',
            'longitude',
            'max_participants',
            'min_participants',
            'difficulty',
            'is_public',
            'requires_approval',
            'is_free',
            'price',
            'status',
            'notes',
            'is_full',
            'available_spots',
            'is_past',
            'participants',
            'images',
            'user_participation_status',
            'created_at',
            'updated_at',
            'average_rating'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'creator']
    
    def get_user_participation_status(self, obj):
        """Bejelentkezett felhasználó részvételi státusza"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            participant = obj.participants.filter(user=request.user).first()
            if participant:
                return {
                    'status': participant.status,
                    'joined_at': participant.joined_at,
                    'can_cancel': participant.status in ['pending', 'confirmed']
                }
        return None
    
    def get_status(self, obj):
        if getattr(obj, 'status', None) == 'cancelled':
            return 'cancelled'
            
        now = timezone.now()
        duration = getattr(obj, 'duration_minutes', 60) or 60
        end_time = obj.start_date_time + timedelta(minutes=duration)

        if now < obj.start_date_time:
            return 'upcoming'
        elif obj.start_date_time <= now <= end_time:
            return 'ongoing'
        else:
            return 'completed'
        
    def get_average_rating(self, obj):
        ratings = obj.participants.filter(status='confirmed', rating__isnull=False).values_list('rating', flat=True)
        if ratings:
            return round(sum(ratings) / len(ratings), 1)
        return None


class SportEventCreateSerializer(serializers.ModelSerializer):
    """
    Esemény létrehozási serializer
    """
    class Meta:
        model = SportEvent
        fields = [
            'title',
            'description',
            'sport_type',
            'start_date_time',
            'end_date_time',
            'duration_minutes',
            'location_name',
            'location_address',
            'latitude',
            'longitude',
            'max_participants',
            'min_participants',
            'difficulty',
            'is_public',
            'requires_approval',
            'is_free',
            'price',
            'notes'
        ]
    
    def validate_start_date_time(self, value):
        """Kezdési idő validálása - nem lehet múltbeli"""
        if value < timezone.now():
            raise serializers.ValidationError("A kezdési időpont nem lehet múltbeli.")
        return value
    
    def validate(self, attrs):
        """Összetett validációk és automatikus kalkulációk"""
        
        start = attrs.get('start_date_time')
        duration = attrs.get('duration_minutes')
        if start and duration and not attrs.get('end_date_time'):
            attrs['end_date_time'] = start + timedelta(minutes=duration)

        if attrs.get('end_date_time') and attrs.get('start_date_time'):
            if attrs['end_date_time'] <= attrs['start_date_time']:
                raise serializers.ValidationError({
                    "end_date_time": "A befejezés időpontja később kell hogy legyen, mint a kezdés."
                })
        
        if attrs.get('min_participants') and attrs.get('max_participants'):
            if attrs['min_participants'] > attrs['max_participants']:
                raise serializers.ValidationError({
                    "min_participants": "A minimum résztvevők száma nem lehet több, mint a maximum."
                })
        
        if not attrs.get('is_free', True) and not attrs.get('price'):
            raise serializers.ValidationError({
                "price": "Fizetős eseménynél meg kell adni az árat."
            })
        
        return attrs
    
    def create(self, validated_data):
        """Esemény létrehozása a bejelentkezett felhasználóval mint creator"""
        validated_data['creator'] = self.context['request'].user
        
        event = super().create(validated_data)
        
        EventParticipant.objects.create(
            event=event,
            user=event.creator,
            status='confirmed',
            confirmed_at=timezone.now()
        )
        
        return event
    
    def update(self, instance, validated_data):
        """Esemény frissítése és résztvevők automatikus jóváhagyása, ha szükséges"""
        old_requires_approval = instance.requires_approval

        updated_instance = super().update(instance, validated_data)
        
        new_requires_approval = updated_instance.requires_approval
        
        if old_requires_approval and not new_requires_approval:
            pending_participants = updated_instance.participants.filter(status='pending')
            
            for participant in pending_participants:
                participant.status = 'confirmed'
                participant.confirmed_at = timezone.now()
                participant.save()
                
        return updated_instance


class JoinEventSerializer(serializers.Serializer):
    """
    Eseményhez csatlakozás serializer
    """
    notes = serializers.CharField(
        required=False, 
        allow_blank=True,
        max_length=500,
        help_text="Opcionális üzenet a szervezőnek"
    )
    
    def validate(self, attrs):
        """Csatlakozás validálása"""
        event = self.context['event']
        user = self.context['request'].user
        
        can_join, message = event.can_user_join(user)
        if not can_join:
            raise serializers.ValidationError(message)
        
        return attrs


class EventParticipantUpdateSerializer(serializers.ModelSerializer):
    """
    Résztvevő státusz frissítése (szervező által)
    """
    class Meta:
        model = EventParticipant
        fields = ['status']
    
    def validate_status(self, value):
        """Csak érvényes státusz átmenetek"""
        instance = self.instance
        valid_transitions = {
            'pending': ['confirmed', 'rejected'],
            'confirmed': ['cancelled'],
        }
        
        if instance and instance.status in valid_transitions:
            if value not in valid_transitions[instance.status]:
                raise serializers.ValidationError(
                    f"Nem lehet {instance.status} státuszból {value} státuszba váltani."
                )
        
        return value


class EventRatingSerializer(serializers.ModelSerializer):
    """
    Esemény értékelése
    """
    class Meta:
        model = EventParticipant
        fields = ['rating', 'feedback']
    
    def validate(self, attrs):
        participant = self.instance
        event = participant.event
        
        now = timezone.now()
        duration = getattr(event, 'duration_minutes', 60) or 60
        end_time = event.start_date_time + timedelta(minutes=duration)
        
        if now < event.start_date_time:
            raise serializers.ValidationError("Még el sem kezdődött az esemény, nem értékelhető.")
            
        return attrs
