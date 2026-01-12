from rest_framework import serializers
from django.utils import timezone
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
    is_full = serializers.ReadOnlyField()
    available_spots = serializers.ReadOnlyField()
    distance = serializers.SerializerMethodField()
    
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
            'is_free',
            'price',
            'status',
            'is_full',
            'available_spots',
            'primary_image',
            'distance',
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
            
            # Haversine formula
            R = 6371  # Föld sugara kilométerben
            
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


class SportEventDetailSerializer(serializers.ModelSerializer):
    """
    Esemény részletes megjelenítése
    """
    sport_type_detail = SportTypeSerializer(source='sport_type', read_only=True)
    creator_detail = UserSerializer(source='creator', read_only=True)
    participants = EventParticipantSerializer(many=True, read_only=True)
    images = EventImageSerializer(many=True, read_only=True)
    is_full = serializers.ReadOnlyField()
    available_spots = serializers.ReadOnlyField()
    is_past = serializers.ReadOnlyField()
    user_participation_status = serializers.SerializerMethodField()
    
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
            'updated_at'
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
        """Összetett validációk"""
        # End date validálás
        if attrs.get('end_date_time') and attrs.get('start_date_time'):
            if attrs['end_date_time'] <= attrs['start_date_time']:
                raise serializers.ValidationError({
                    "end_date_time": "A befejezés időpontja később kell hogy legyen, mint a kezdés."
                })
        
        # Min/max résztvevők validálása
        if attrs.get('min_participants') and attrs.get('max_participants'):
            if attrs['min_participants'] > attrs['max_participants']:
                raise serializers.ValidationError({
                    "min_participants": "A minimum résztvevők száma nem lehet több, mint a maximum."
                })
        
        # Ár validálása
        if not attrs.get('is_free', True) and not attrs.get('price'):
            raise serializers.ValidationError({
                "price": "Fizetős eseménynél meg kell adni az árat."
            })
        
        return attrs
    
    def create(self, validated_data):
        """Esemény létrehozása a bejelentkezett felhasználóval mint creator"""
        validated_data['creator'] = self.context['request'].user
        return super().create(validated_data)


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
    
    def validate_rating(self, value):
        """Értékelés csak befejezett eseményhez"""
        participant = self.instance
        if participant.event.status != 'completed':
            raise serializers.ValidationError("Csak befejezett eseményt lehet értékelni.")
        return value
