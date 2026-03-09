"""
Performance indexes for practice models.

Adds composite indexes used by dashboard and analytics queries.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('practice', '0007_attempt_practice_at_session_6aa164_idx_and_more'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='usersession',
            index=models.Index(
                fields=['user', 'started_at'],
                name='practice_session_user_idx',
            ),
        ),
    ]
