from django.core.mail import send_mail
from django.conf import settings
from .models import Notification


def send_notification(recipient, notification_type, title, message,
                       related_event_id=None, related_event_title=None):
    """
    In-app értesítés létrehozása + email küldése
    """
    # 1. In-app értesítés
    Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        title=title,
        message=message,
        related_event_id=related_event_id,
        related_event_title=related_event_title
    )

    # 2. Email értesítés
    if recipient.email:
        try:
            send_mail(
                subject=f'[SportEvents] {title}',
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient.email],
                fail_silently=True,
            )
        except Exception as e:
            print(f'Email küldési hiba: {e}')


def notify_join_request(event, participant_user, notes=''):
    """
    Értesítés a szervezőnek: új jelentkezés érkezett
    """
    message = (
        f"{participant_user.full_name} (@{participant_user.username}) "
        f"jelentkezett a(z) \"{event.title}\" eseményedre."
    )
    if notes:
        message += f"\n\nÜzenet a jelentkezőtől:\n{notes}"

    send_notification(
        recipient=event.creator,
        notification_type='join_request',
        title='Új jelentkezés érkezett',
        message=message,
        related_event_id=event.id,
        related_event_title=event.title
    )


def notify_participant_status_change(event, participant_user, new_status):
    """
    Értesítés a résztvevőnek: jóváhagyás vagy elutasítás
    """
    if new_status == 'confirmed':
        title = 'Jelentkezésed jóváhagyva!'
        message = (
            f"A szervező jóváhagyta a jelentkezésedet a(z) \"{event.title}\" eseményre. "
            f"Találkozunk {event.start_date_time.strftime('%Y. %m. %d. %H:%M')}-kor, "
            f"{event.location_name} helyszínen!"
        )
        notif_type = 'join_approved'
    else:  # rejected
        title = 'Jelentkezésed elutasítva'
        message = (
            f"Sajnos a szervező elutasította a jelentkezésedet a(z) "
            f"\"{event.title}\" eseményre."
        )
        notif_type = 'join_rejected'

    send_notification(
        recipient=participant_user,
        notification_type=notif_type,
        title=title,
        message=message,
        related_event_id=event.id,
        related_event_title=event.title
    )