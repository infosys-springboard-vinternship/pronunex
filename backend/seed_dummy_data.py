"""
Seed 3 days of realistic dummy data for user maurya972137@gmail.com.

Run: python seed_dummy_data.py
"""

import os
import sys
import random
import django
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.utils import timezone
from apps.accounts.models import User
from apps.practice.models import (
    UserSession, Attempt, PhonemeError, SublevelProgress, SublevelSession
)
from apps.analytics.models import UserProgress, PhonemeProgress, StreakRecord
from apps.library.models import ReferenceSentence, Phoneme

TARGET_EMAIL = 'maurya972137@gmail.com'

def get_user():
    try:
        return User.objects.get(email=TARGET_EMAIL)
    except User.DoesNotExist:
        print(f"User '{TARGET_EMAIL}' not found in the database.")
        sys.exit(1)


def seed_data():
    user = get_user()
    now = timezone.now()
    
    # Last 3 days: today, yesterday, day-before-yesterday
    days = [
        now - timedelta(days=2),  # Day 1 (oldest)
        now - timedelta(days=1),  # Day 2
        now,                      # Day 3 (today)
    ]
    
    # Fetch existing sentences and phonemes
    sentences = list(ReferenceSentence.objects.filter(is_validated=True)[:30])
    phonemes = list(Phoneme.objects.all()[:20])
    
    if not sentences:
        print("No validated ReferenceSentences found. Seed sentences first.")
        sys.exit(1)
    
    print(f"Found user: {user.email} (id={user.pk})")
    print(f"Using {len(sentences)} sentences, {len(phonemes)} phonemes")
    print("-" * 50)
    
    # Track created objects
    created = {
        'sessions': 0, 'attempts': 0, 'phoneme_errors': 0,
        'user_progress': 0, 'phoneme_progress': 0,
        'sublevel_progress': 0, 'streak': 0,
    }
    
    # Scores improve over the 3 days (simulating learning)
    day_score_ranges = [
        (0.45, 0.70),   # Day 1: beginner range
        (0.55, 0.80),   # Day 2: improving
        (0.65, 0.90),   # Day 3: getting good
    ]
    
    weak_phoneme_arpabets = ['TH', 'R', 'L', 'S', 'Z']  # Common difficult phonemes
    
    for day_idx, day_base in enumerate(days):
        day_label = ['Day 1 (2 days ago)', 'Day 2 (yesterday)', 'Day 3 (today)'][day_idx]
        score_min, score_max = day_score_ranges[day_idx]
        
        print(f"\n--- {day_label}: {day_base.date()} ---")
        
        # Create 2-3 sessions per day
        num_sessions = random.randint(2, 3)
        day_attempts_all = []
        
        for s_idx in range(num_sessions):
            session_start = day_base.replace(
                hour=random.choice([9, 11, 14, 16, 19, 21]),
                minute=random.randint(0, 59),
                second=0
            ) + timedelta(hours=s_idx)
            
            session = UserSession(
                user=user,
                session_type=random.choice(['practice', 'practice', 'assessment']),
                overall_score=None,
                total_attempts=0,
            )
            session.save()
            # Override auto_now_add
            UserSession.objects.filter(pk=session.pk).update(started_at=session_start)
            session.ended_at = session_start + timedelta(minutes=random.randint(8, 25))
            session.save()
            
            created['sessions'] += 1
            
            # 3-5 attempts per session
            num_attempts = random.randint(3, 5)
            session_scores = []
            
            for a_idx in range(num_attempts):
                sentence = random.choice(sentences)
                score = round(random.uniform(score_min, score_max), 3)
                fluency = round(random.uniform(score_min - 0.05, score_max + 0.05), 3)
                fluency = max(0.0, min(1.0, fluency))
                
                # Build phoneme_scores from the sentence's phoneme_sequence
                phoneme_scores_list = []
                if sentence.phoneme_sequence:
                    for ph in sentence.phoneme_sequence[:8]:
                        ph_score = round(random.uniform(score_min - 0.1, min(1.0, score_max + 0.1)), 3)
                        ph_score = max(0.0, min(1.0, ph_score))
                        phoneme_scores_list.append({
                            "phoneme": ph,
                            "score": ph_score
                        })
                
                attempt_time = session_start + timedelta(minutes=a_idx * 3)
                
                attempt = Attempt(
                    session=session,
                    sentence=sentence,
                    score=score,
                    fluency_score=fluency,
                    phoneme_scores=phoneme_scores_list if phoneme_scores_list else None,
                    llm_feedback={
                        "summary": f"Good attempt! Focus on clarity of consonant sounds.",
                        "phoneme_tips": [
                            {"phoneme": "TH", "tip": "Place tongue between teeth for 'th' sound."},
                            {"phoneme": "R", "tip": "Curl tongue slightly back without touching the roof."},
                        ],
                        "encouragement": random.choice([
                            "Keep practicing, you're making progress!",
                            "Great effort! Your rhythm is improving.",
                            "Nice work on the vowel sounds!",
                            "You're getting more confident each time!",
                        ])
                    },
                    processing_time_ms=random.randint(800, 3500),
                )
                attempt.save()
                # Override auto_now_add
                Attempt.objects.filter(pk=attempt.pk).update(created_at=attempt_time)
                
                session_scores.append(score)
                day_attempts_all.append(score)
                created['attempts'] += 1
                
                # Add 1-3 phoneme errors per attempt
                error_phonemes = random.sample(phonemes, min(random.randint(1, 3), len(phonemes)))
                for ph in error_phonemes:
                    words = sentence.text.split()
                    word_ctx = random.choice(words) if words else 'unknown'
                    
                    PhonemeError(
                        attempt=attempt,
                        target_phoneme=ph,
                        similarity_score=round(random.uniform(0.3, 0.65), 3),
                        word_context=word_ctx,
                        position_in_word=random.choice(['initial', 'medial', 'final']),
                        start_time=round(random.uniform(0.2, 2.0), 2),
                        end_time=round(random.uniform(2.1, 4.0), 2),
                    ).save()
                    created['phoneme_errors'] += 1
            
            # Update session metrics
            if session_scores:
                session.overall_score = round(sum(session_scores) / len(session_scores), 3)
                session.total_attempts = len(session_scores)
                session.save()
        
        # --- UserProgress (daily aggregate) ---
        avg_score = round(sum(day_attempts_all) / len(day_attempts_all), 3) if day_attempts_all else 0
        best_score = round(max(day_attempts_all), 3) if day_attempts_all else 0
        
        progress, prog_created = UserProgress.objects.update_or_create(
            user=user,
            date=day_base.date(),
            defaults={
                'sessions_count': num_sessions,
                'total_practice_minutes': round(random.uniform(15, 45), 1),
                'attempts_count': len(day_attempts_all),
                'average_score': avg_score,
                'best_score': best_score,
                'weak_phonemes': random.sample(weak_phoneme_arpabets, random.randint(2, 4)),
                'improved_phonemes': random.sample(weak_phoneme_arpabets, random.randint(0, 2)),
            }
        )
        created['user_progress'] += 1
        print(f"  UserProgress: avg={avg_score}, best={best_score}, attempts={len(day_attempts_all)}")
    
    # --- SublevelProgress (completion records) ---
    levels_sublevels = [
        ('core', '1'), ('core', '2'),
        ('edge', '1'),
    ]
    for level, sublevel in levels_sublevels:
        day_offset = levels_sublevels.index((level, sublevel))
        completed_time = days[min(day_offset, 2)]
        
        sp = SublevelProgress(
            user=user,
            level=level,
            sublevel=sublevel,
            attempts=random.randint(1, 3),
            average_score=round(random.uniform(0.55, 0.85), 3),
            completed=True,
        )
        sp.save()
        # Override auto_now_add
        SublevelProgress.objects.filter(pk=sp.pk).update(completed_at=completed_time)
        created['sublevel_progress'] += 1
    
    # --- PhonemeProgress ---
    for ph in phonemes[:10]:
        score = round(random.uniform(0.4, 0.92), 3)
        PhonemeProgress.objects.update_or_create(
            user=user,
            phoneme=ph,
            defaults={
                'current_score': score,
                'attempts_count': random.randint(5, 25),
                'first_attempt_score': round(max(0, score - random.uniform(0.1, 0.3)), 3),
                'best_score': round(min(1.0, score + random.uniform(0.02, 0.1)), 3),
                'improvement_rate': round(random.uniform(0.01, 0.08), 4),
                'first_practiced': days[0],
                'last_practiced': days[2],
            }
        )
        created['phoneme_progress'] += 1
    
    # --- StreakRecord ---
    streak, _ = StreakRecord.objects.update_or_create(
        user=user,
        defaults={
            'current_streak': 3,
            'longest_streak': 3,
            'last_practice_date': now.date(),
        }
    )
    created['streak'] = 1
    
    # --- Summary ---
    print("\n" + "=" * 50)
    print("SEED COMPLETE")
    print("=" * 50)
    for key, count in created.items():
        print(f"  {key}: {count}")
    print(f"\nUser: {user.email}")
    print(f"Date range: {days[0].date()} to {days[2].date()}")


if __name__ == '__main__':
    seed_data()
