from rest_framework import generics, status, permissions, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q, Count
from math import radians, sin, cos, sqrt, atan2
from .models import SportEvent, EventParticipant, EventImage
from .serializers import (
    SportEventListSerializer,
    SportEventDetailSerializer,
    SportEventCreateSerializer,
    EventParticipantSerializer,
    EventParticipantUpdateSerializer,
    JoinEventSerializer,
    EventRatingSerializer,
    EventImageSerializer
)


class IsEventCreatorOrReadOnly(permissions.BasePermission):
    """
    Custom permission: csak a létrehozó szerkesztheti az eseményt
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.creator == request.user


class SportEventListCreateView(generics.ListCreateAPIView):
    """
    Események listázása és létrehozása
    GET /api/events/
    POST /api/events/
    
    Query params:
    - sport_type: szűrés sportág szerint
    - status: szűrés státusz szerint
    - difficulty: szűrés nehézség szerint
    - is_free: ingyenes események (true/false)
    - search: keresés címben, leírásban, helyszínben
    - user_lat, user_lng, radius: távolság alapú szűrés
    - start_date_from, start_date_to: időpont szűrés
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['sport_type', 'status', 'difficulty', 'is_free', 'creator']
    search_fields = ['title', 'description', 'location_name', 'location_address']
    ordering_fields = ['start_date_time', 'created_at', 'max_participants']
    ordering = ['start_date_time']
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return SportEventCreateSerializer
        return SportEventListSerializer
    
    def get_queryset(self):
        queryset = SportEvent.objects.filter(is_public=True).select_related(
            'sport_type', 'creator'
        ).prefetch_related('images', 'participants')
        
        # Időpont szűrés
        start_date_from = self.request.query_params.get('start_date_from')
        start_date_to = self.request.query_params.get('start_date_to')
        
        if start_date_from:
            queryset = queryset.filter(start_date_time__gte=start_date_from)
        if start_date_to:
            queryset = queryset.filter(start_date_time__lte=start_date_to)
        
        # Távolság alapú szűrés
        user_lat = self.request.query_params.get('user_lat')
        user_lng = self.request.query_params.get('user_lng')
        radius = self.request.query_params.get('radius', 10)  # alapértelmezett 10 km
        
        if user_lat and user_lng:
            try:
                user_lat = float(user_lat)
                user_lng = float(user_lng)
                radius = float(radius)
                
                # Távolság számítás minden eseményhez
                filtered_events = []
                for event in queryset:
                    distance = self.calculate_distance(
                        user_lat, user_lng,
                        float(event.latitude), float(event.longitude)
                    )
                    if distance <= radius:
                        filtered_events.append(event.id)
                
                queryset = queryset.filter(id__in=filtered_events)
            except (ValueError, TypeError):
                pass
        
        return queryset
    
    def calculate_distance(self, lat1, lon1, lat2, lon2):
        """
        Haversine formula - távolság számítás két koordináta között (km-ben)
        """
        R = 6371  # Föld sugara kilométerben
        
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return R * c


class SportEventDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Esemény részletes megtekintése, szerkesztése, törlése
    GET/PUT/PATCH/DELETE /api/events/{id}/
    """
    queryset = SportEvent.objects.all()
    permission_classes = [IsAuthenticated, IsEventCreatorOrReadOnly]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return SportEventCreateSerializer
        return SportEventDetailSerializer
    
    def perform_destroy(self, instance):
        """Esemény törlése helyett státusz változtatás"""
        instance.status = 'cancelled'
        instance.save()


class MyEventsView(generics.ListAPIView):
    """
    Saját létrehozott események
    GET /api/events/my-events/
    """
    serializer_class = SportEventListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return SportEvent.objects.filter(
            creator=self.request.user
        ).select_related('sport_type', 'creator').prefetch_related('images', 'participants')


class MyParticipationsView(generics.ListAPIView):
    """
    Események, amikre jelentkeztem
    GET /api/events/my-participations/
    """
    serializer_class = SportEventListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Események, amikben résztvevő vagyok
        participated_event_ids = EventParticipant.objects.filter(
            user=self.request.user,
            status__in=['pending', 'confirmed']
        ).values_list('event_id', flat=True)
        
        return SportEvent.objects.filter(
            id__in=participated_event_ids
        ).select_related('sport_type', 'creator').prefetch_related('images', 'participants')


class JoinEventView(APIView):
    """
    Csatlakozás eseményhez
    POST /api/events/{id}/join/
    Body: {"notes": "..."} (opcionális)
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk):
        try:
            event = SportEvent.objects.get(pk=pk)
        except SportEvent.DoesNotExist:
            return Response({
                'error': 'Az esemény nem található.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = JoinEventSerializer(
            data=request.data,
            context={'request': request, 'event': event}
        )
        
        if serializer.is_valid():
            # Résztvevő létrehozása
            participant = EventParticipant.objects.create(
                event=event,
                user=request.user,
                notes=serializer.validated_data.get('notes', '')
            )
            
            return Response({
                'message': 'Sikeres jelentkezés!',
                'participant': EventParticipantSerializer(participant).data
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LeaveEventView(APIView):
    """
    Kilépés eseményből (lemondás)
    POST /api/events/{id}/leave/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk):
        try:
            event = SportEvent.objects.get(pk=pk)
            participant = EventParticipant.objects.get(
                event=event,
                user=request.user
            )
        except SportEvent.DoesNotExist:
            return Response({
                'error': 'Az esemény nem található.'
            }, status=status.HTTP_404_NOT_FOUND)
        except EventParticipant.DoesNotExist:
            return Response({
                'error': 'Nem vagy résztvevője ennek az eseménynek.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Csak pending vagy confirmed státusz esetén lehet lemondani
        if participant.status not in ['pending', 'confirmed']:
            return Response({
                'error': 'Már nem mondhatod le a részvételt.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        participant.status = 'cancelled'
        participant.save()
        
        return Response({
            'message': 'Sikeres lemondás!'
        }, status=status.HTTP_200_OK)


class EventParticipantsView(generics.ListAPIView):
    """
    Esemény résztvevőinek listázása
    GET /api/events/{id}/participants/
    """
    serializer_class = EventParticipantSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        event_id = self.kwargs['pk']
        return EventParticipant.objects.filter(
            event_id=event_id
        ).select_related('user', 'event')


class ManageParticipantView(generics.UpdateAPIView):
    """
    Résztvevő státuszának kezelése (csak az esemény szervezője)
    PATCH /api/events/{event_id}/participants/{participant_id}/
    Body: {"status": "confirmed"} vagy {"status": "rejected"}
    """
    serializer_class = EventParticipantUpdateSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return EventParticipant.objects.filter(event__creator=self.request.user)
    
    def get_object(self):
        event_id = self.kwargs['event_id']
        participant_id = self.kwargs['participant_id']
        return self.get_queryset().get(event_id=event_id, id=participant_id)


class RateEventView(generics.UpdateAPIView):
    """
    Esemény értékelése (csak résztvevő, befejezett esemény)
    POST /api/events/{event_id}/rate/
    Body: {"rating": 5, "feedback": "..."}
    """
    serializer_class = EventRatingSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        event_id = self.kwargs['pk']
        return EventParticipant.objects.get(
            event_id=event_id,
            user=self.request.user,
            status='confirmed'
        )


class EventImageUploadView(generics.CreateAPIView):
    """
    Kép feltöltése eseményhez (csak a szervező)
    POST /api/events/{id}/images/
    """
    serializer_class = EventImageSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        event_id = self.kwargs['pk']
        try:
            event = SportEvent.objects.get(pk=event_id, creator=self.request.user)
            serializer.save(event=event)
        except SportEvent.DoesNotExist:
            return Response({
                'error': 'Az esemény nem található vagy nincs jogosultságod.'
            }, status=status.HTTP_403_FORBIDDEN)


class RecommendedEventsView(generics.ListAPIView):
    """
    Ajánlott események a felhasználó preferenciái alapján
    GET /api/events/recommended/
    """
    serializer_class = SportEventListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Felhasználó sportág preferenciái
        preferred_sport_types = user.sport_preferences.values_list('sport_type_id', flat=True)
        
        # Események szűrése preferenciák alapján
        queryset = SportEvent.objects.filter(
            sport_type_id__in=preferred_sport_types,
            status='upcoming',
            is_public=True,
            start_date_time__gte=timezone.now()
        ).exclude(
            # Ne ajánlja azokat, amikre már jelentkezett vagy amik betelt
            Q(participants__user=user) | Q(participants__status='confirmed', 
            participants__event__max_participants__lte=Count('participants'))
        ).select_related('sport_type', 'creator').prefetch_related('images', 'participants')
        
        # Távolság alapú rendezés, ha van alapértelmezett helyszín
        if user.default_latitude and user.default_longitude:
            # Itt egyszerűsítés: csak visszaadjuk az eseményeket
            # A távolság számítás a serializerben történik
            pass
        
        return queryset[:20]  # Maximum 20 ajánlat
