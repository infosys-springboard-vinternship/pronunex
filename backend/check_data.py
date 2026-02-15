import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.library.models import SentencePhoneme, ReferenceSentence, Phoneme

sentence_phoneme_count = SentencePhoneme.objects.count()
sentence_count = ReferenceSentence.objects.filter(is_validated=True).count()
phoneme_count = Phoneme.objects.count()

print(f"SentencePhoneme entries: {sentence_phoneme_count}")
print(f"Validated sentences: {sentence_count}")
print(f"Phonemes: {phoneme_count}")

if sentence_phoneme_count == 0:
    print("\n⚠️ ISSUE FOUND: SentencePhoneme table is EMPTY!")
    print("This is why no reinforcement sentences are shown.")
    print("\nSolution: Populate SentencePhoneme junction table")
else:
    print(f"\n✅ SentencePhoneme table has {sentence_phoneme_count} entries")
    
    # Test a query similar to what the view does
    from django.db.models import Count, Q
    
    test_phonemes = ['T', 'IH1', 'M']  # Example weak phonemes
    results = (
        ReferenceSentence.objects
        .filter(
            sentence_phonemes__phoneme__arpabet__in=test_phonemes,
            is_validated=True
        )
        .annotate(
            weak_phoneme_count=Count(
                'sentence_phonemes',
                filter=Q(sentence_phonemes__phoneme__arpabet__in=test_phonemes)
            )
        )
        .order_by('-weak_phoneme_count')
        .distinct()[:5]
    )
    print(f"\nTest query returned: {results.count()} sentences")
