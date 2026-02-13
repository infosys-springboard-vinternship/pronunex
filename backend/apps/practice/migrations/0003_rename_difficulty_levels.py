from django.db import migrations


def rename_difficulty_levels(apps, schema_editor):
    """
    Rename difficulty levels in SublevelProgress from old naming to branded naming:
    - beginner -> core
    - intermediate -> edge
    - advanced -> elite
    """
    SublevelProgress = apps.get_model('practice', 'SublevelProgress')
    
    mapping = {
        'beginner': 'core',
        'intermediate': 'edge',
        'advanced': 'elite',
    }
    
    for old_value, new_value in mapping.items():
        SublevelProgress.objects.filter(level=old_value).update(
            level=new_value
        )


def reverse_rename_difficulty_levels(apps, schema_editor):
    """
    Reverse migration: restore old difficulty level names.
    """
    SublevelProgress = apps.get_model('practice', 'SublevelProgress')
    
    mapping = {
        'core': 'beginner',
        'edge': 'intermediate',
        'elite': 'advanced',
    }
    
    for new_value, old_value in mapping.items():
        SublevelProgress.objects.filter(level=new_value).update(
            level=old_value
        )


class Migration(migrations.Migration):

    dependencies = [
        ('practice', '0002_sublevelprogress'),
    ]

    operations = [
        migrations.RunPython(
            rename_difficulty_levels,
            reverse_code=reverse_rename_difficulty_levels
        ),
    ]
