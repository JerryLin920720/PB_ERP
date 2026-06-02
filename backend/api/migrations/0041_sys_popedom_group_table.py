# Generated manually to create unmanaged sys_popedom_group and sys_accounts_group tables in PostgreSQL

from django.db import migrations

def seed_data(apps, schema_editor):
    # We can write raw SQL to insert seed data if the table is empty
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM sys_popedom_group;")
        count = cursor.fetchone()[0]
        if count == 0:
            cursor.execute("""
                INSERT INTO sys_popedom_group (hisystem, group_code, group_name)
                VALUES ('01', 'ADMIN', '管理員群組');
            """)

class Migration(migrations.Migration):

    dependencies = [
        ("api", "0040_sysaccountsgroup"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            CREATE TABLE IF NOT EXISTS sys_popedom_group (
                hisystem VARCHAR(10) NOT NULL,
                group_code VARCHAR(20) NOT NULL,
                group_name VARCHAR(20),
                accounts_id VARCHAR(40),
                PRIMARY KEY (hisystem, group_code)
            );
            
            CREATE TABLE IF NOT EXISTS sys_accounts_group (
                hisystem VARCHAR(10) NOT NULL,
                accounts_id VARCHAR(50) NOT NULL,
                group_code VARCHAR(20) NOT NULL,
                PRIMARY KEY (hisystem, accounts_id, group_code)
            );
            """,
            reverse_sql="""
            DROP TABLE IF EXISTS sys_accounts_group;
            DROP TABLE IF EXISTS sys_popedom_group;
            """
        ),
        migrations.RunPython(seed_data, reverse_code=migrations.RunPython.noop),
    ]
