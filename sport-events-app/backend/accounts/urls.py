from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
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
    CurrentUserView
)

app_name = 'accounts'

urlpatterns = [
    # Autentikáció
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Felhasználó profil
    path('users/me/', CurrentUserView.as_view(), name='current-user'),
    path('users/profile/', UserProfileView.as_view(), name='user-profile'),
    path('users/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    
    # Sportágak
    path('sport-types/', SportTypeListView.as_view(), name='sport-types'),
    
    # Sportág preferenciák
    path('users/sport-preferences/', UserSportPreferenceListCreateView.as_view(), name='sport-preferences-list'),
    path('users/sport-preferences/<int:pk>/', UserSportPreferenceDetailView.as_view(), name='sport-preference-detail'),
]
