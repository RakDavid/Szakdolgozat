from django.core.management.base import BaseCommand
from accounts.models import SportType


class Command(BaseCommand):
    help = 'Feltölti az alapértelmezett sportágakat'

    def handle(self, *args, **kwargs):
        sports = [
            {'name': 'Foci', 'icon': '⚽'},
            {'name': 'Futás', 'icon': '🏃'},
            {'name': 'Kosárlabda', 'icon': '🏀'},
            {'name': 'Tenisz', 'icon': '🎾'},
            {'name': 'Úszás', 'icon': '🏊'},
            {'name': 'Kerékpározás', 'icon': '🚴'},
            {'name': 'Röplabda', 'icon': '🏐'},
            {'name': 'Tollaslabda', 'icon': '🏸'},
            {'name': 'Asztalitenisz', 'icon': '🏓'},
            {'name': 'Jóga', 'icon': '🧘'},
            {'name': 'Fitnesz', 'icon': '💪'},
            {'name': 'Túrázás', 'icon': '🥾'},
            {'name': 'Evezés', 'icon': '🚣'},
            {'name': 'Golf', 'icon': '⛳'},
            {'name': 'Síelés', 'icon': '⛷️'},
            {'name': 'Görkorcsolya', 'icon': '🛼'},
            {'name': 'Harcművészet', 'icon': '🥋'},
            {'name': 'Crossfit', 'icon': '🔥'},
            {'name': 'Kézilabda', 'icon': '🤾'},
            {'name': 'Vízilabda', 'icon': '🤽'},
            {'name': 'Atlétika', 'icon': '🏅'},
            {'name': 'Cselgáncs', 'icon': '🥋'},
            {'name': 'Baseball', 'icon': '⚾'},
            {'name': 'Amerikaifoci', 'icon': '🏈'},
            {'name': 'Rögbi', 'icon': '🏉'},
            {'name': 'Bowling', 'icon': '🎳'},
            {'name': 'Dart', 'icon': '🎯'},
            {'name': 'Sakk', 'icon': '♟️'},
            {'name': 'Pilates', 'icon': '🤸'},
            {'name': 'Kajak-kenu', 'icon': '🛶'},
        ]

        created = 0
        skipped = 0
        for sport in sports:
            obj, was_created = SportType.objects.get_or_create(
                name=sport['name'],
                defaults={
                    'icon': sport['icon'],
                    'is_active': True,
                }
            )
            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f"  ✓ Létrehozva: {sport['name']}"))
            else:
                # Frissíti az ikont ha már létezik
                if obj.icon != sport['icon']:
                    obj.icon = sport['icon']
                    obj.save()
                skipped += 1
                self.stdout.write(f"  - Már létezik: {sport['name']}")

        self.stdout.write(self.style.SUCCESS(
            f'\nKész! {created} új sportág létrehozva, {skipped} már létezett.'
        ))