"""
Management command to seed Learning Paths and Skill Tree structure.

Creates 3 learning paths with progressive difficulty and organizes
phonemes into units with crown levels for mastery tracking.

Run with: python manage.py seed_learning_paths
"""

from django.core.management.base import BaseCommand
from apps.library.models import (
    LearningPath, PhonemeUnit, UnitPhoneme, Phoneme
)


class Command(BaseCommand):
    help = 'Seed Learning Paths and Phoneme Units for skill tree'

    def handle(self, *args, **options):
        self.stdout.write('Seeding Learning Paths...')
        
        self._seed_learning_paths()
        
        self.stdout.write(
            self.style.SUCCESS('[OK] Learning Paths and Units seeded successfully')
        )

    def _seed_learning_paths(self):
        """Create 3 difficulty tiers and organize phonemes into units."""
        
        beginner_path, _ = LearningPath.objects.get_or_create(
            name='Sound Explorer',
            defaults={
                'difficulty': 'beginner',
                'description': 'Start your pronunciation journey! Master basic vowel and consonant sounds.',
                'unlock_criteria_accuracy': 0,
                'order': 1,
                'is_active': True,
            }
        )
        self.stdout.write(f'  Created/Updated: {beginner_path.name}')
        
        intermediate_path, _ = LearningPath.objects.get_or_create(
            name='Fluency Adventurer',
            defaults={
                'difficulty': 'intermediate',
                'description': 'Challenge yourself with complex sounds and diphthongs.',
                'unlock_criteria_accuracy': 0.7,
                'unlock_criteria_previous_path': beginner_path,
                'order': 2,
                'is_active': True,
            }
        )
        self.stdout.write(f'  Created/Updated: {intermediate_path.name}')
        
        advanced_path, _ = LearningPath.objects.get_or_create(
            name='Pronunciation Champion',
            defaults={
                'difficulty': 'advanced',
                'description': 'Master the most challenging consonant blends and subtle distinctions.',
                'unlock_criteria_accuracy': 0.85,
                'unlock_criteria_previous_path': intermediate_path,
                'order': 3,
                'is_active': True,
            }
        )
        self.stdout.write(f'  Created/Updated: {advanced_path.name}')
        
        self._create_beginner_units(beginner_path)
        self._create_intermediate_units(intermediate_path)
        self._create_advanced_units(advanced_path)

    def _create_beginner_units(self, path):
        """Create beginner units with basic vowels and consonants."""
        
        unit1, _ = PhonemeUnit.objects.get_or_create(
            learning_path=path,
            order=1,
            defaults={
                'name': 'Short Vowels',
                'description': 'Master the 5 basic short vowel sounds',
                'icon': 'circle',
            }
        )
        
        self._add_phonemes_to_unit(unit1, ['IH', 'EH', 'AE', 'AH', 'UH'])
        
        unit2, _ = PhonemeUnit.objects.get_or_create(
            learning_path=path,
            order=2,
            defaults={
                'name': 'Long Vowels',
                'description': 'Practice long vowel sounds',
                'icon': 'circle',
                'unlock_criteria_previous_unit': unit1,
            }
        )
        
        self._add_phonemes_to_unit(unit2, ['IY', 'EY', 'AY', 'OW', 'UW'])
        
        unit3, _ = PhonemeUnit.objects.get_or_create(
            learning_path=path,
            order=3,
            defaults={
                'name': 'Stop Consonants',
                'description': 'Learn plosive consonant sounds',
                'icon': 'square',
                'unlock_criteria_previous_unit': unit2,
            }
        )
        
        self._add_phonemes_to_unit(unit3, ['P', 'B', 'T', 'D', 'K', 'G'])
        
        unit4, _ = PhonemeUnit.objects.get_or_create(
            learning_path=path,
            order=4,
            defaults={
                'name': 'Fricatives',
                'description': 'Practice continuous consonant sounds',
                'icon': 'wind',
                'unlock_criteria_previous_unit': unit3,
            }
        )
        
        self._add_phonemes_to_unit(unit4, ['F', 'V', 'S', 'Z', 'SH', 'ZH'])

    def _create_intermediate_units(self, path):
        """Create intermediate units with diphthongs and nasals."""
        
        unit1, _ = PhonemeUnit.objects.get_or_create(
            learning_path=path,
            order=1,
            defaults={
                'name': 'Diphthongs',
                'description': 'Master complex vowel combinations',
                'icon': 'waves',
            }
        )
        
        self._add_phonemes_to_unit(unit1, ['OY', 'AW', 'ER'])
        
        unit2, _ = PhonemeUnit.objects.get_or_create(
            learning_path=path,
            order=2,
            defaults={
                'name': 'Nasal Sounds',
                'description': 'Practice nasal consonants',
                'icon': 'airplay',
                'unlock_criteria_previous_unit': unit1,
            }
        )
        
        self._add_phonemes_to_unit(unit2, ['M', 'N', 'NG'])
        
        unit3, _ = PhonemeUnit.objects.get_or_create(
            learning_path=path,
            order=3,
            defaults={
                'name': 'Liquids & Glides',
                'description': 'Master flowing consonant sounds',
                'icon': 'droplet',
                'unlock_criteria_previous_unit': unit2,
            }
        )
        
        self._add_phonemes_to_unit(unit3, ['L', 'R', 'W', 'Y'])
        
        unit4, _ = PhonemeUnit.objects.get_or_create(
            learning_path=path,
            order=4,
            defaults={
                'name': 'Dental Sounds',
                'description': 'Practice TH sounds',
                'icon': 'message-circle',
                'unlock_criteria_previous_unit': unit3,
            }
        )
        
        self._add_phonemes_to_unit(unit4, ['TH', 'DH'])

    def _create_advanced_units(self, path):
        """Create advanced units with consonant clusters."""
        
        unit1, _ = PhonemeUnit.objects.get_or_create(
            learning_path=path,
            order=1,
            defaults={
                'name': 'Affricates',
                'description': 'Master combined stop-fricative sounds',
                'icon': 'zap',
            }
        )
        
        self._add_phonemes_to_unit(unit1, ['CH', 'JH'])
        
        unit2, _ = PhonemeUnit.objects.get_or_create(
            learning_path=path,
            order=2,
            defaults={
                'name': 'Back Vowels',
                'description': 'Perfect back vowel articulation',
                'icon': 'chevron-left',
                'unlock_criteria_previous_unit': unit1,
            }
        )
        
        self._add_phonemes_to_unit(unit2, ['AA', 'AO'])
        
        unit3, _ = PhonemeUnit.objects.get_or_create(
            learning_path=path,
            order=3,
            defaults={
                'name': 'Glottal Sounds',
                'description': 'Practice voiceless glottal sounds',
                'icon': 'speaker',
                'unlock_criteria_previous_unit': unit2,
            }
        )
        
        self._add_phonemes_to_unit(unit3, ['HH'])

    def _add_phonemes_to_unit(self, unit, arpabet_list):
        """Link phonemes to a unit."""
        for order, arpabet in enumerate(arpabet_list, start=1):
            try:
                phoneme = Phoneme.objects.get(arpabet=arpabet)
                UnitPhoneme.objects.get_or_create(
                    unit=unit,
                    phoneme=phoneme,
                    defaults={'order': order}
                )
                self.stdout.write(f'    Added {phoneme.arpabet} to {unit.name}')
            except Phoneme.DoesNotExist:
                self.stdout.write(
                    self.style.WARNING(f'    Phoneme {arpabet} not found, skipping')
                )
