from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, SportType, UserSportPreference


class SportTypeSerializer(serializers.ModelSerializer):
    """
    Sportág serializer
    """
    class Meta:
        model = SportType
        fields = ['id', 'name', 'description', 'icon', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class UserSportPreferenceSerializer(serializers.ModelSerializer):
    """
    Felhasználói sportág preferencia serializer
    """
    sport_type_detail = SportTypeSerializer(source='sport_type', read_only=True)
    
    class Meta:
        model = UserSportPreference
        fields = [
            'id', 
            'sport_type', 
            'sport_type_detail',
            'skill_level', 
            'interest_level', 
            'created_at', 
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    """
    Felhasználó serializer (alap adatok)
    """
    full_name = serializers.ReadOnlyField()
    sport_preferences = UserSportPreferenceSerializer(many=True, read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'bio',
            'profile_picture',
            'phone_number',
            'default_latitude',
            'default_longitude',
            'default_location_name',
            'default_search_radius',
            'sport_preferences',
            'date_joined',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'date_joined', 'created_at', 'updated_at', 'full_name']


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Regisztrációs serializer
    """
    password = serializers.CharField(
        write_only=True, 
        required=True, 
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password2 = serializers.CharField(
        write_only=True, 
        required=True,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = User
        fields = [
            'username',
            'email',
            'password',
            'password2',
            'first_name',
            'last_name',
            'phone_number'
        ]
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'email': {'required': True}
        }
    
    def validate(self, attrs):
        """Jelszavak egyezésének ellenőrzése"""
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({
                "password": "A két jelszó nem egyezik."
            })
        return attrs
    
    def validate_email(self, value):
        """Email egyediségének ellenőrzése"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Ez az email cím már használatban van.")
        return value
    
    def create(self, validated_data):
        """Felhasználó létrehozása"""
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Felhasználó frissítési serializer
    """
    class Meta:
        model = User
        fields = [
            'first_name',
            'last_name',
            'bio',
            'profile_picture',
            'phone_number',
            'email',
            'default_latitude',
            'default_longitude',
            'default_location_name',
            'default_search_radius'
        ]
    
    def validate_profile_picture(self, value):
        """Profilkép méret validálás (max 5MB)"""
        if value and value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("A profilkép maximum 5MB lehet.")
        return value


class ChangePasswordSerializer(serializers.Serializer):
    """
    Jelszó megváltoztatási serializer
    """
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(
        required=True, 
        write_only=True,
        validators=[validate_password]
    )
    new_password2 = serializers.CharField(required=True, write_only=True)
    
    def validate(self, attrs):
        """Új jelszavak egyezésének ellenőrzése"""
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({
                "new_password": "A két új jelszó nem egyezik."
            })
        return attrs
    
    def validate_old_password(self, value):
        """Régi jelszó ellenőrzése"""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("A régi jelszó helytelen.")
        return value


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Részletes profil serializer (saját profil megtekintéséhez)
    """
    full_name = serializers.ReadOnlyField()
    sport_preferences = UserSportPreferenceSerializer(many=True, read_only=True)
    created_events_count = serializers.SerializerMethodField()
    participated_events_count = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'bio',
            'profile_picture',
            'phone_number',
            'default_latitude',
            'default_longitude',
            'default_location_name',
            'default_search_radius',
            'sport_preferences',
            'created_events_count',
            'participated_events_count',
            'date_joined',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id', 
            'username', 
            'date_joined', 
            'created_at', 
            'updated_at',
            'full_name',
            'created_events_count',
            'participated_events_count'
        ]
    
    def get_created_events_count(self, obj):
        """Létrehozott események száma"""
        return obj.created_events.count()
    
    def get_participated_events_count(self, obj):
        """Részvett események száma"""
        return obj.event_participations.filter(status__in=['pending', 'confirmed']).count()
