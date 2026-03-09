"""
Performance indexes for analytics models.

Adds composite indexes used by dashboard queries.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analytics', '0002_phonemeprogress_analytics_p_user_id_d6b317_idx'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='userprogress',
            index=models.Index(
                fields=['user', '-date'],
                name='analytics_up_user_date_idx',
            ),
        ),
    ]
