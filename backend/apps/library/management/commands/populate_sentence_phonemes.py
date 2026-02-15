"""
Management command to populate SentencePhoneme junction table.

This links sentences to their phonemes for targeted practice recommendations.
"""

from django.core.management.base import BaseCommand
from apps.library.models import ReferenceSentence, Phoneme, SentencePhoneme


class Command(BaseCommand):
    help = 'Populate SentencePhoneme junction table from sentence phoneme_sequence data'

    def handle(self, *args, **options):
        self.stdout.write('Populating SentencePhoneme junction table...')
        
        # Clear existing entries
        deleted_count = SentencePhoneme.objects.all().delete()[0]
        self.stdout.write(f'Deleted {deleted_count} old entries')
        
        sentences = ReferenceSentence.objects.filter(is_validated=True)
        phoneme_objs = {p.arpabet: p for p in Phoneme.objects.all()}
        
        created_count = 0
        skipped_count = 0
        
        for sentence in sentences:
            if not sentence.phoneme_sequence:
                skipped_count += 1
                continue
            
            # Extract unique phonemes from sequence
            phonemes_in_sentence = set(sentence.phoneme_sequence)
            
            # Get words from sentence for context
            words = sentence.text.split()
            
            for phoneme_str in phonemes_in_sentence:
                # Strip stress markers (0,1,2) from vowels
                base_phoneme = ''.join(c for c in phoneme_str if not c.isdigit())
                
                if base_phoneme in phoneme_objs:
                    # Try to find word context (simple approach - use first word)
                    word_context = words[0] if words else sentence.text[:20]
                    
                    SentencePhoneme.objects.create(
                        sentence=sentence,
                        phoneme=phoneme_objs[base_phoneme],
                        position='medial',  # Default
                        word_context=word_context
                    )
                    created_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nCreated {created_count} SentencePhoneme entries'
            )
        )
        self.stdout.write(f'Skipped {skipped_count} sentences without phoneme_sequence')
        
        # Show stats
        total = SentencePhoneme.objects.count()
        unique_sentences = SentencePhoneme.objects.values('sentence').distinct().count()
        unique_phonemes = SentencePhoneme.objects.values('phoneme').distinct().count()
        
        self.stdout.write(f'\nStatistics:')
        self.stdout.write(f'  Total entries: {total}')
        self.stdout.write(f'  Sentences covered: {unique_sentences}')
        self.stdout.write(f'  Phonemes covered: {unique_phonemes}')
