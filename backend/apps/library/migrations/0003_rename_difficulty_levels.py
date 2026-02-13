from django.db import migrations


def rename_difficulty_levels(apps, schema_editor):
    """
    Rename difficulty levels from old naming to branded naming:
    - beginner -> core
    - intermediate -> edge
    - advanced -> elite
    """
    ReferenceSentence = apps.get_model('library', 'ReferenceSentence')
    
    mapping = {
        'beginner': 'core',
        'intermediate': 'edge',
        'advanced': 'elite',
    }
    
    for old_value, new_value in mapping.items():
        ReferenceSentence.objects.filter(difficulty_level=old_value).update(
            difficulty_level=new_value
        )


def reverse_rename_difficulty_levels(apps, schema_editor):
    """
    Reverse migration: restore old difficulty level names.
    """
    ReferenceSentence = apps.get_model('library', 'ReferenceSentence')
    
    mapping = {
        'core': 'beginner',
        'edge': 'intermediate',
        'elite': 'advanced',
    }
    
    for new_value, old_value in mapping.items():
        ReferenceSentence.objects.filter(difficulty_level=new_value).update(
            difficulty_level=old_value
        )


class Migration(migrations.Migration):

    dependencies = [
        ('library', '0002_referencesentence_sublevel'),
    ]

    operations = [
        migrations.RunPython(
            rename_difficulty_levels,
            reverse_code=reverse_rename_difficulty_levels
        ),
    ]
