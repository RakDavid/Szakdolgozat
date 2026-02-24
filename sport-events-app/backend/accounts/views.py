from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.conf import settings
import google.generativeai as genai
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
        description = request.data.get('description', '')
        if not description:
            return Response({'error': 'Leírás megadása kötelező.'}, status=400)

        try:
            # 1. Kérjük le a sportágakat az adatbázisból
            sports = SportType.objects.filter(is_active=True)
            if not sports.exists():
                return Response({'error': 'Nincsenek sportágak az adatbázisban.'}, status=400)

            # 2. Csináljunk belőle egy szöveges listát az AI-nak (pl. "1: Foci, 2: Kosár, 3: Úszás")
            sport_list_text = ", ".join([f"{s.id}: {s.name}" for s in sports])

            # 3. AI konfigurálása
            api_key = getattr(settings, 'GEMINI_API_KEY', None)
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-2.5-flash-lite')

            # 4. A Szuper-precíz Prompt
            prompt = f"""
            Felhasználó leírása: "{description}"

            A feladatod, hogy a fenti magyar nyelvű leírás alapján sportág preferenciákat generálj.

            KIZÁRÓLAG az alábbi listából választhatsz sportágakat (ID: Név formatumban vannak):
            {sport_list_text}

            Szabályok:
            1. 'sport_type': Szigorúan az adott sportág száma (ID) a fenti listából. Ne a nevét írd be!
            2. 'skill_level': Szigorúan csak ez a 3 szó lehet: 'beginner', 'intermediate', 'advanced'.
            3. 'interest_level': Egy szám 1 és 10 között.

            KIZÁRÓLAG egy érvényes, nyers JSON-t adj vissza markdown formázás (```) nélkül, az alábbi pontos struktúrában:
            {{"suggestions": [{{"sport_type": 1, "skill_level": "beginner", "interest_level": 7}}]}}
            """

            response = model.generate_content(prompt)
            
            # JSON tisztítása (biztos ami biztos)
            text_content = response.text
            if "```" in text_content:
                text_content = text_content.split("```json")[-1].split("```")[0].strip()
            if text_content.startswith("```"):
                text_content = text_content.replace("```", "").strip()
            
            suggestions_data = json.loads(text_content)
            return Response(suggestions_data)

        except Exception as e:
            print(f"AI ERROR: {str(e)}") 
            return Response({'error': 'Hiba a feldolgozás során.'}, status=500)