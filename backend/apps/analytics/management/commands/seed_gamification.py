from django.core.management.base import BaseCommand
from apps.analytics.models import Achievement, League


class Command(BaseCommand):
    help = 'Seed initial achievements and league tiers for gamification'

    def handle(self, *args, **options):
        self.stdout.write('Seeding gamification data...')
        
        self._seed_achievements()
        self._seed_leagues()
        
        self.stdout.write(self.style.SUCCESS('[OK] Gamification data seeded successfully'))

    def _seed_achievements(self):
        achievements_data = [
            {
                'name': 'First Steps',
                'description': 'Complete your first pronunciation exercise',
                'category': 'practice',
                'icon': 'footprints',
                'xp_reward': 50,
                'requirement_type': 'total_attempts',
                'requirement_value': 1,
            },
            {
                'name': 'Practice Makes Perfect',
                'description': 'Complete 10 practice sessions',
                'category': 'practice',
                'icon': 'target',
                'xp_reward': 100,
                'requirement_type': 'total_attempts',
                'requirement_value': 10,
            },
            {
                'name': 'Half Century',
                'description': 'Complete 50 practice sessions',
                'category': 'practice',
                'icon': 'star',
                'xp_reward': 200,
                'requirement_type': 'total_attempts',
                'requirement_value': 50,
            },
            {
                'name': 'Century Club',
                'description': 'Complete 100 practice sessions',
                'category': 'practice',
                'icon': 'award',
                'xp_reward': 500,
                'requirement_type': 'total_attempts',
                'requirement_value': 100,
            },
            {
                'name': 'Practice Warrior',
                'description': 'Complete 500 practice sessions',
                'category': 'practice',
                'icon': 'shield',
                'xp_reward': 1000,
                'requirement_type': 'total_attempts',
                'requirement_value': 500,
            },
            {
                'name': 'Week Warrior',
                'description': 'Maintain a 7-day practice streak',
                'category': 'streak',
                'icon': 'flame',
                'xp_reward': 150,
                'requirement_type': 'streak_days',
                'requirement_value': 7,
            },
            {
                'name': 'Month Master',
                'description': 'Maintain a 30-day practice streak',
                'category': 'streak',
                'icon': 'fire',
                'xp_reward': 500,
                'requirement_type': 'streak_days',
                'requirement_value': 30,
            },
            {
                'name': 'Streak Legend',
                'description': 'Maintain a 50-day practice streak',
                'category': 'streak',
                'icon': 'zap',
                'xp_reward': 1000,
                'requirement_type': 'streak_days',
                'requirement_value': 50,
            },
            {
                'name': 'Century Streak',
                'description': 'Maintain a 100-day practice streak',
                'category': 'streak',
                'icon': 'crown',
                'xp_reward': 2000,
                'requirement_type': 'streak_days',
                'requirement_value': 100,
            },
            {
                'name': 'Year Long Dedication',
                'description': 'Maintain a 365-day practice streak',
                'category': 'streak',
                'icon': 'trophy',
                'xp_reward': 5000,
                'requirement_type': 'streak_days',
                'requirement_value': 365,
            },
            {
                'name': 'Level 5 Champion',
                'description': 'Reach Level 5',
                'category': 'mastery',
                'icon': 'star',
                'xp_reward': 100,
                'requirement_type': 'user_level',
                'requirement_value': 5,
            },
            {
                'name': 'Level 10 Expert',
                'description': 'Reach Level 10',
                'category': 'mastery',
                'icon': 'award',
                'xp_reward': 250,
                'requirement_type': 'user_level',
                'requirement_value': 10,
            },
            {
                'name': 'Level 25 Master',
                'description': 'Reach Level 25',
                'category': 'mastery',
                'icon': 'trophy',
                'xp_reward': 1000,
                'requirement_type': 'user_level',
                'requirement_value': 25,
            },
            {
                'name': 'Level 50 Legend',
                'description': 'Reach Level 50',
                'category': 'mastery',
                'icon': 'crown',
                'xp_reward': 5000,
                'requirement_type': 'user_level',
                'requirement_value': 50,
            },
        ]

        created_count = 0
        updated_count = 0

        for data in achievements_data:
            achievement, created = Achievement.objects.get_or_create(
                name=data['name'],
                defaults=data
            )
            if created:
                created_count += 1
                self.stdout.write(f'  Created: {achievement.name}')
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(f'[OK] Achievements: {created_count} created, {updated_count} already exist')
        )

    def _seed_leagues(self):
        leagues_data = [
            {
                'name': 'bronze',
                'min_rank': 15,
                'order': 1,
                'icon': 'medal',
            },
            {
                'name': 'silver',
                'min_rank': 10,
                'order': 2,
                'icon': 'medal',
            },
            {
                'name': 'gold',
                'min_rank': 7,
                'order': 3,
                'icon': 'award',
            },
            {
                'name': 'platinum',
                'min_rank': 5,
                'order': 4,
                'icon': 'star',
            },
            {
                'name': 'diamond',
                'min_rank': 3,
                'order': 5,
                'icon': 'gem',
            },
        ]

        created_count = 0
        updated_count = 0

        for data in leagues_data:
            league, created = League.objects.get_or_create(
                name=data['name'],
                defaults=data
            )
            if created:
                created_count += 1
                self.stdout.write(f'  Created: {league.get_name_display()} League')
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(f'[OK] Leagues: {created_count} created, {updated_count} already exist')
        )
