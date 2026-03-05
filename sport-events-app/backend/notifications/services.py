from django.core.mail import send_mail
from django.conf import settings
from .models import Notification
from django.utils.timezone import localtime

def send_notification(recipient, notification_type, title, message, 
                      html_message=None, related_event_id=None, related_event_title=None):
    """
    In-app értesítés létrehozása + email küldése (sima és HTML formátumban is)
    """
    Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        title=title,
        message=message,
        related_event_id=related_event_id,
        related_event_title=related_event_title
    )

    if recipient.email:
        try:
            send_mail(
                subject=f'[SportEvents] {title}',
                message=message, 
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient.email],
                html_message=html_message or message, 
                fail_silently=True,
            )
        except Exception as e:
            print(f'Email küldési hiba: {e}')


def notify_join_request(event, participant_user, notes='', extra_guests=0):
    """
    Értesítés a szervezőnek: új jelentkezés érkezett
    """
    guest_text = f" (+{extra_guests} fő)" if extra_guests > 0 else ""
    guest_html = f" <strong style='color: #5a67d8;'>(+{extra_guests} fő)</strong>" if extra_guests > 0 else ""

    plain_message = f"{participant_user.full_name} (@{participant_user.username}){guest_text} jelentkezett a(z) \"{event.title}\" eseményedre."
    if notes:
        plain_message += f"\n\nÜzenet a jelentkezőtől:\n{notes}"

    html_message = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #667eea; margin-top: 0;">Új jelentkezés érkezett! 🎉</h2>
        <p style="color: #4a5568; font-size: 16px;">Kedves Szervező!</p>
        <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
            <strong>{participant_user.full_name}</strong> (@{participant_user.username}){guest_html} szeretne csatlakozni a(z) <strong>{event.title}</strong> eseményedhez.
        </p>
    """
    if notes:
        html_message += f"""
        <div style="background-color: #f8fafc; padding: 15px 20px; border-left: 4px solid #667eea; border-radius: 4px; margin: 25px 0;">
            <p style="margin: 0; color: #4a5568; font-style: italic; font-size: 15px;">"{notes}"</p>
        </div>
        """
    html_message += """
        <hr style="border: none; border-top: 1px solid #edf2f7; margin: 30px 0;">
        <p style="color: #718096; font-size: 14px; text-align: center;">
            Kérlek, lépj be az alkalmazásba a jelentkezés elfogadásához vagy elutasításához!
        </p>
    </div>
    """

    send_notification(
        recipient=event.creator,
        notification_type='join_request',
        title='Új jelentkezés érkezett',
        message=plain_message,
        html_message=html_message,
        related_event_id=event.id,
        related_event_title=event.title
    )


def notify_participant_status_change(event, participant_user, new_status):
    """
    Értesítés a résztvevőnek: jóváhagyás vagy elutasítás
    """
    local_time = localtime(event.start_date_time)
    formatted_time = local_time.strftime('%Y. %m. %d. %H:%M')

    location_text = event.location_name
    if event.location_address:
        location_text += f" ({event.location_address})"

    if new_status == 'confirmed':
        title = 'Jelentkezésed jóváhagyva! '
        plain_message = (
            f"A szervező jóváhagyta a jelentkezésedet a(z) \"{event.title}\" eseményre. "
            f"Találkozunk {formatted_time}-kor, {location_text} helyszínen!"
        )
        
        html_message = f"""
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <h2 style="color: #48bb78; margin-top: 0;">Szuper hír! Csatlakoztál! </h2>
            <p style="color: #4a5568; font-size: 16px;">Szia <strong>{participant_user.first_name}</strong>!</p>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                A szervező örömmel fogadta a jelentkezésedet a(z) <strong>{event.title}</strong> eseményre. 
                Íme a legfontosabb részletek, hogy biztosan odaérj:
            </p>
            
            <div style="background-color: #f0fff4; border: 1px solid #c6f6d5; padding: 20px; border-radius: 10px; margin: 25px 0;">
                <p style="margin: 0 0 10px 0; color: #276749; font-size: 16px;">📅 <strong>Mikor?</strong><br>{formatted_time}</p>
                <p style="margin: 0; color: #276749; font-size: 16px;">📍 <strong>Hol?</strong><br>{location_text}</p>
            </div>
            
            <p style="color: #4a5568; font-size: 16px; text-align: center; font-weight: bold;">Jó sportolást kívánunk!</p>
        </div>
        """
        notif_type = 'join_approved'
        
    else: 
        title = 'Jelentkezésed elutasítva '
        plain_message = f"Sajnos a szervező elutasította a jelentkezésedet a(z) \"{event.title}\" eseményre."
        
        html_message = f"""
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <h2 style="color: #e53e3e; margin-top: 0;">Sajnos most nem sikerült </h2>
            <p style="color: #4a5568; font-size: 16px;">Szia <strong>{participant_user.first_name}</strong>!</p>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                A szervező sajnos nem tudta jóváhagyni a jelentkezésedet a(z) <strong>{event.title}</strong> eseményre. 
                Ennek oka lehet létszámkorlát vagy más szervezési ok.
            </p>
            <p style="color: #718096; font-size: 14px; margin-top: 25px; text-align: center;">
                Ne csüggedj, keress bátran más hasonló eseményeket az alkalmazásban!
            </p>
        </div>
        """
        notif_type = 'join_rejected'

    send_notification(
        recipient=participant_user,
        notification_type=notif_type,
        title=title,
        message=plain_message,
        html_message=html_message,
        related_event_id=event.id,
        related_event_title=event.title
    )

def notify_recommended_event(user, event):
    """
    Értesítés a felhasználónak: egy neki ajánlott esemény jött létre
    """
    plain_message = f"Egy új {event.sport_type.name} esemény ('{event.title}') jött létre a közeledben!"

    html_message = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #667eea; margin-top: 0;">Új esemény a közeledben! 📍</h2>
        <p style="color: #4a5568; font-size: 16px;">Kedves {user.first_name or user.username}!</p>
        <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
            Egy új neked való eseményt hoztak létre a platformon:
        </p>
        <div style="background-color: #f8fafc; padding: 15px 20px; border-left: 4px solid #48bb78; border-radius: 4px; margin: 25px 0;">
            <p style="margin: 0; color: #2d3748; font-weight: bold; font-size: 18px;">{event.title}</p>
            <p style="margin: 5px 0 0 0; color: #4a5568; font-size: 15px;">Sportág: {event.sport_type.name}</p>
            <p style="margin: 5px 0 0 0; color: #4a5568; font-size: 15px;">Időpont: {event.start_date_time.strftime('%Y. %m. %d. %H:%M')}</p>
        </div>
        <p style="color: #718096; font-size: 14px; text-align: center;">
            Lépj be az alkalmazásba a további részletekért és a jelentkezéshez!
        </p>
    </div>
    """

    send_notification(
        recipient=user,
        notification_type='event_update',
        title='Új ajánlott esemény',
        message=plain_message,
        html_message=html_message,
        related_event_id=event.id,
        related_event_title=event.title
    )