"""
Management command to delete user audio files older than N days.

Dry-run by default. Pass --delete to actually remove files.
Use --days N to change retention period (default: 7).
"""

import logging
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.practice.models import Attempt

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Delete user audio files older than N days (default 7)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days', type=int, default=7,
            help='Delete audio files older than this many days (default: 7)',
        )
        parser.add_argument(
            '--delete', action='store_true',
            help='Actually delete files. Without this flag, runs as dry-run.',
        )

    def handle(self, *args, **options):
        days = options['days']
        do_delete = options['delete']
        cutoff = timezone.now() - timedelta(days=days)

        old_attempts = Attempt.objects.filter(
            created_at__lt=cutoff,
        ).exclude(audio_file='').exclude(audio_file__isnull=True)

        count = old_attempts.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS('No audio files older than %d days.' % days))
            return

        if not do_delete:
            self.stdout.write(self.style.WARNING(
                '[DRY-RUN] Would delete %d audio files older than %d days. '
                'Run with --delete to actually remove them.' % (count, days)
            ))
            return

        deleted = 0
        errors = 0
        for attempt in old_attempts.iterator():
            try:
                if attempt.audio_file:
                    attempt.audio_file.delete(save=False)
                    attempt.audio_file = None
                    attempt.save(update_fields=['audio_file'])
                    deleted += 1
            except Exception as e:
                errors += 1
                logger.warning('Failed to delete audio for attempt %s: %s', attempt.id, e)

        self.stdout.write(self.style.SUCCESS(
            'Deleted %d audio files (%d errors).' % (deleted, errors)
        ))
