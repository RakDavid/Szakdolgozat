from django.urls import path
from .views import (
    SportEventListCreateView,
    SportEventDetailView,
    MyEventsView,
    MyParticipationsView,
    JoinEventView,
    LeaveEventView,
    EventParticipantsView,
    ManageParticipantView,
    RateEventView,
    EventImageUploadView,
    RecommendedEventsView
)

app_name = 'events'

urlpatterns = [
    # Események CRUD
    path('', SportEventListCreateView.as_view(), name='event-list-create'),
    path('<int:pk>/', SportEventDetailView.as_view(), name='event-detail'),
    
    # Saját események
    path('my-events/', MyEventsView.as_view(), name='my-events'),
    path('my-participations/', MyParticipationsView.as_view(), name='my-participations'),
    
    # Ajánlott események
    path('recommended/', RecommendedEventsView.as_view(), name='recommended-events'),
    
    # Csatlakozás/Kilépés
    path('<int:pk>/join/', JoinEventView.as_view(), name='join-event'),
    path('<int:pk>/leave/', LeaveEventView.as_view(), name='leave-event'),
    
    # Résztvevők kezelése
    path('<int:pk>/participants/', EventParticipantsView.as_view(), name='event-participants'),
    path('<int:event_id>/participants/<int:participant_id>/', ManageParticipantView.as_view(), name='manage-participant'),
    
    # Értékelés
    path('<int:pk>/rate/', RateEventView.as_view(), name='rate-event'),
    
    # Képek
    path('<int:pk>/images/', EventImageUploadView.as_view(), name='upload-image'),
]
