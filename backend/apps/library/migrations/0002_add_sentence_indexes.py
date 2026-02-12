from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('library', '0001_initial'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='referencesentence',
            index=models.Index(fields=['difficulty_level', '-created_at'], name='library_ref_difficu_idx'),
        ),
        migrations.AddIndex(
            model_name='referencesentence',
            index=models.Index(fields=['source', '-created_at'], name='library_ref_source_idx'),
        ),
    ]
