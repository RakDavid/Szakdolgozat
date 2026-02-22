from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    LogoutView,
    UserProfileView,
    ChangePasswordView,
    UserDetailView,
    SportTypeListView,
    UserSportPreferenceListCreateView,
    UserSportPreferenceDetailView,
    CurrentUserView,
    SportPreferenceBulkUpdateView,  
    SportPreferenceAiSuggestView,    
)

app_name = 'accounts'

urlpatterns = [
    # Auth
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),

    # User
    path('users/me/', CurrentUserView.as_view(), name='current-user'),
    path('users/profile/', UserProfileView.as_view(), name='user-profile'),
    path('users/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user-detail'),

    # Sport types
    path('sports/', SportTypeListView.as_view(), name='sport-type-list'),

    # Sport preferences (egyedi CRUD)
    path('sport-preferences/bulk-update/', SportPreferenceBulkUpdateView.as_view(), name='sport-preference-bulk-update'),
    path('sport-preferences/ai-suggest/', SportPreferenceAiSuggestView.as_view(), name='sport-preference-ai-suggest'),
    path('sport-preferences/', UserSportPreferenceListCreateView.as_view(), name='sport-preference-list'),
    path('sport-preferences/<int:pk>/', UserSportPreferenceDetailView.as_view(), name='sport-preference-detail'),
]