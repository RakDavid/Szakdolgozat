from django.db.models import Count, Q, F
from django.utils import timezone
from math import radians, sin, cos, sqrt, atan2
from collections import defaultdict
from .models import SportEvent, EventParticipant


def haversine(lat1, lon1, lat2, lon2):
    """Távolság km-ben két koordináta között."""
    R = 6371
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


def get_participation_history_scores(user):
    """
    Elemzi a felhasználó eddigi részvételeit és pontszámokat ad
    sportáganként a múltbeli aktivitás alapján.

    Visszatér: dict {sport_type_id: history_score}

    Pontozás:
      - Megerősített részvétel: +3 pont/esemény
      - Befejezett és értékelt esemény: +2 extra pont
      - Lemondott/elutasított: -1 pont (nem bünteti túl)
    """
    past_participations = EventParticipant.objects.filter(
        user=user
    ).select_related('event__sport_type')

    sport_scores = defaultdict(float)
    sport_counts = defaultdict(int)

    for participation in past_participations:
        sport_id = participation.event.sport_type_id

        if participation.status == 'confirmed':
            sport_scores[sport_id] += 3.0
            sport_counts[sport_id] += 1
            if participation.rating is not None:
                sport_scores[sport_id] += 2.0
                if participation.rating >= 4:
                    sport_scores[sport_id] += 1.0
        elif participation.status == 'cancelled':
            sport_scores[sport_id] -= 1.0


    normalized = {}
    for sport_id, score in sport_scores.items():
        count = sport_counts.get(sport_id, 1)
        avg_score = score / max(count, 1)
        activity_bonus = min(count * 0.5, 3.0)
        normalized[sport_id] = min(avg_score + activity_bonus, 10.0)

    return normalized


def get_recommended_events(user, max_results=20):
    """
    Pontozásos ajánlórendszer preferenciák + participation history alapján.

    Pontszámok:
      - Preferencia interest_level:     1–10 pont
      - Skill level egyezés:            0–3 pont
      - Participation history:          0–10 pont (múltbeli részvételek)
      - Távolság:                       0–5 pont
      - Teltségi szint (sürgősség):     0–2 pont

    Visszaad egy rendezett listát: [(event, score, distance), ...]
    """
    preferences = list(user.sport_preferences.select_related('sport_type').all())
    history_scores = get_participation_history_scores(user)

    pref_map = {pref.sport_type_id: pref for pref in preferences}
    preferred_sport_ids = list(pref_map.keys())

    history_only_sport_ids = [
        sport_id for sport_id in history_scores.keys()
        if sport_id not in pref_map
    ]

    all_relevant_sport_ids = preferred_sport_ids + history_only_sport_ids

    if not all_relevant_sport_ids:
        events = SportEvent.objects.filter(
            status='upcoming',
            is_public=True,
            start_date_time__gte=timezone.now()
        ).annotate(
            confirmed_count=Count(
                'participants',
                filter=Q(participants__status='confirmed')
            )
        ).filter(
            confirmed_count__lt=F('max_participants')
        ).select_related('sport_type', 'creator').prefetch_related('images', 'participants')

        return [(event, 0, None) for event in events[:max_results]]

    already_joined = set(
        EventParticipant.objects.filter(user=user)
        .values_list('event_id', flat=True)
    )

    events = SportEvent.objects.filter(
        sport_type_id__in=all_relevant_sport_ids,
        status='upcoming',
        is_public=True,
        start_date_time__gte=timezone.now()
    ).exclude(
        id__in=already_joined
    ).annotate(
        confirmed_count=Count(
            'participants',
            filter=Q(participants__status='confirmed')
        )
    ).filter(
        confirmed_count__lt=F('max_participants')
    ).select_related('sport_type', 'creator').prefetch_related('images', 'participants')


    user_lat = float(user.default_latitude) if user.default_latitude else None
    user_lng = float(user.default_longitude) if user.default_longitude else None
    max_radius = user.default_search_radius or 50 

    scored = []

    for event in events:
        score = 0.0
        pref = pref_map.get(event.sport_type_id)
        history_score = history_scores.get(event.sport_type_id, 0)

        if pref:
            score += pref.interest_level

            score += _skill_match_score(pref.skill_level, event.difficulty)

        score += history_score

        distance = None
        if user_lat and user_lng:
            distance = haversine(
                user_lat, user_lng,
                float(event.latitude), float(event.longitude)
            )
            if distance > max_radius:
                continue
            distance_score = max(0.0, 5.0 * (1 - distance / max_radius))
            score += distance_score

        if event.max_participants > 0:
            fill_ratio = event.confirmed_count / event.max_participants
            if fill_ratio >= 0.8:
                score += 2.0
            elif fill_ratio >= 0.5:
                score += 1.0

        scored.append((
            event,
            round(score, 2),
            round(distance, 1) if distance is not None else None
        ))

    scored.sort(key=lambda x: x[1], reverse=True)

    return scored[:max_results]


def _skill_match_score(user_skill, event_difficulty):
    """
    Mennyire illik a felhasználó szintje az esemény nehézségéhez.
    Tökéletes egyezés: +3, szomszédos: +1, nagy eltérés: 0
    """
    skill_map = {'beginner': 0, 'intermediate': 1, 'advanced': 2}
    difficulty_map = {'easy': 0, 'medium': 1, 'hard': 2}

    user_level = skill_map.get(user_skill, 1)
    event_level = difficulty_map.get(event_difficulty, 1)

    diff = abs(user_level - event_level)
    if diff == 0:
        return 3.0
    elif diff == 1:
        return 1.0
    return 0.0