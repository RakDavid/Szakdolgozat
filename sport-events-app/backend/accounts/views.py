from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.conf import settings
import anthropic
import json
from .models import User, SportType, UserSportPreference
from .serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    UserUpdateSerializer,
    UserProfileSerializer,
    ChangePasswordSerializer,
    SportTypeSerializer,
    UserSportPreferenceSerializer
)

class RegisterView(generics.CreateAPIView):
    """
    Felhasználói regisztráció
    POST /api/auth/register/
    """
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = UserRegistrationSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'message': 'Sikeres regisztráció!'
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    Bejelentkezés
    POST /api/auth/login/
    Body: {"username": "...", "password": "..."}
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response({'error': 'Felhasználónév és jelszó megadása kötelező.'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = authenticate(username=username, password=password)
        
        if user is None:
            return Response({'error': 'Hibás felhasználónév vagy jelszó.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        if not user.is_active:
            return Response({'error': 'Ez a fiók inaktív.'}, status=status.HTTP_403_FORBIDDEN)
        
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'message': 'Sikeres bejelentkezés!'
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    Kijelentkezés (token blacklist-elése)
    POST /api/auth/logout/
    Body: {"refresh": "..."}
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response({'error': 'Refresh token megadása kötelező.'}, status=status.HTTP_400_BAD_REQUEST)
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Sikeres kijelentkezés!'}, status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            return Response({'error': 'Érvénytelen token.'}, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Saját profil lekérése és szerkesztése
    GET /api/users/profile/
    PUT/PATCH /api/users/profile/
    """
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer
    
    def get_object(self):
        return self.request.user
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserProfileSerializer


class ChangePasswordView(APIView):
    """
    Jelszó megváltoztatása
    POST /api/users/change-password/
    Body: {"old_password": "...", "new_password": "...", "new_password2": "..."}
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save()
            return Response({'message': 'Jelszó sikeresen megváltoztatva!'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserDetailView(generics.RetrieveAPIView):
    """
    Felhasználó profiljának megtekintése (publikus adatok)
    GET /api/users/{id}/
    """
    queryset = User.objects.filter(is_active=True)
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]


class SportTypeListView(generics.ListAPIView):
    """
    Sportágak listázása
    GET /api/sport-types/
    """
    queryset = SportType.objects.filter(is_active=True)
    serializer_class = SportTypeSerializer
    permission_classes = [AllowAny]


class UserSportPreferenceListCreateView(generics.ListCreateAPIView):
    """
    Saját sportág preferenciák listázása és létrehozása
    GET /api/users/sport-preferences/
    POST /api/users/sport-preferences/
    """
    serializer_class = UserSportPreferenceSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return UserSportPreference.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class UserSportPreferenceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Sportág preferencia részletek, szerkesztés, törlés
    GET/PUT/PATCH/DELETE /api/users/sport-preferences/{id}/
    """
    serializer_class = UserSportPreferenceSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return UserSportPreference.objects.filter(user=self.request.user)


class CurrentUserView(APIView):
    """
    Aktuális bejelentkezett felhasználó adatai
    GET /api/users/me/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class SportPreferenceBulkUpdateView(APIView):
    """
    Az összes preferenciát egyszerre felülírja.
    A frontend az app-sport-preferences komponensből hívja.

    Body: {
      "preferences": [
        {"sport_type": 1, "skill_level": "intermediate", "interest_level": 8},
        ...
      ]
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        preferences_data = request.data.get('preferences', [])
        user = request.user

        user.sport_preferences.all().delete()

        created = []
        for pref_data in preferences_data:
            try:
                pref = UserSportPreference.objects.create(
                    user=user,
                    sport_type_id=pref_data['sport_type'],
                    skill_level=pref_data.get('skill_level', 'beginner'),
                    interest_level=pref_data.get('interest_level', 5),
                )
                created.append({
                    'id': pref.id,
                    'sport_type': pref.sport_type_id,
                    'skill_level': pref.skill_level,
                    'interest_level': pref.interest_level,
                })
            except Exception as e:
                continue

        return Response({'saved': len(created), 'preferences': created})


class SportPreferenceAiSuggestView(APIView):
    """
    Szöveges leírás alapján AI generálja a preferenciákat.
    A frontend az app-sport-preferences komponens "AI segítség" gombjából hívja.

    Body: {"description": "Hétvégente futok, kezdő kerékpáros vagyok..."}
    Visszatér: {"suggestions": [...]}
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        description = request.data.get('description', '').strip()
        if not description:
            return Response(
                {'error': 'A description mező kötelező'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Elérhető sportágak
        sports = list(SportType.objects.filter(is_active=True).values('id', 'name'))
        sport_list_str = '\n'.join([f"  - id: {s['id']}, name: {s['name']}" for s in sports])

        prompt = f"""Te egy sportajánló rendszer AI asszisztense vagy.
        A felhasználó az alábbi leírást adta meg sportos szokásairól:

        "{description}"

        Az elérhető sportágak (id és name):
        {sport_list_str}

        Elemzd a leírást, és generálj sport preferencia ajánlásokat.
        Csak azokat a sportágakat ajánld, amikre a leírásban utalás van. Maximum 6 sportágat.

        Minden preferenciánál add meg:
        - sport_type: a sportág ID-ja (csak a fenti listából)
        - skill_level: "beginner", "intermediate", vagy "advanced"
        - interest_level: 1-10 közötti egész szám

        Válaszolj KIZÁRÓLAG valid JSON formátumban, semmi más szöveg:
        {{"suggestions": [
        {{"sport_type": 1, "skill_level": "intermediate", "interest_level": 8}}
        ]}}"""

        try:
            client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            message = client.messages.create(
                model="claude-opus-4-6",
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}]
            )

            response_text = message.content[0].text.strip()

            if '```' in response_text:
                parts = response_text.split('```')
                response_text = parts[1] if len(parts) > 1 else parts[0]
                if response_text.startswith('json'):
                    response_text = response_text[4:]

            data = json.loads(response_text.strip())
            suggestions = data.get('suggestions', [])

            valid_sport_ids = {s['id'] for s in sports}
            valid_suggestions = [
                s for s in suggestions
                if s.get('sport_type') in valid_sport_ids
                and s.get('skill_level') in ('beginner', 'intermediate', 'advanced')
                and isinstance(s.get('interest_level'), int)
                and 1 <= s.get('interest_level') <= 10
            ]

            return Response({'suggestions': valid_suggestions})

        except json.JSONDecodeError:
            return Response(
                {'error': 'AI válasz nem értelmezhető, próbáld újra'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            return Response(
                {'error': f'AI hiba: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )