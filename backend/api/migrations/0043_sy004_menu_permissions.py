from django.db import migrations

def seed_menu_and_popedom(apps, schema_editor):
    from django.db import connection
    tables = connection.introspection.table_names()
    if 'sys_menu' not in tables or 'sys_popedom_desc' not in tables:
        return

    SysMenu = apps.get_model('api', 'SysMenu')
    SysPopedomDesc = apps.get_model('api', 'SysPopedomDesc')

    # Seed SY004 Menu
    SysMenu.objects.get_or_create(
        prg_code='SY004',
        defaults={
            'obj_name': 'w_sy004',
            'prg_name': '系統參數設定',
            'parent_code': 'SS',
            'fram_class': '1',
            'prg_serialno': 3.0,
            'sysflag': '0'
        }
    )

    # Seed w_sy004 Popedom Descriptions (search: 1, edit: 2)
    SysPopedomDesc.objects.get_or_create(
        hisystem='01',
        obj_name='w_sy004',
        popedom_id='search',
        defaults={'popedom_desc': '查詢', 'popedom_index': 1}
    )
    SysPopedomDesc.objects.get_or_create(
        hisystem='01',
        obj_name='w_sy004',
        popedom_id='edit',
        defaults={'popedom_desc': '修改', 'popedom_index': 2}
    )

def reverse_seed(apps, schema_editor):
    SysMenu = apps.get_model('api', 'SysMenu')
    SysPopedomDesc = apps.get_model('api', 'SysPopedomDesc')

    SysMenu.objects.filter(prg_code='SY004').delete()
    SysPopedomDesc.objects.filter(obj_name='w_sy004').delete()

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0042_sysparameter'),
    ]

    operations = [
        migrations.RunPython(seed_menu_and_popedom, reverse_code=reverse_seed),
    ]
