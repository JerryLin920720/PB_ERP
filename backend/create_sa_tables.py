import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

def create_and_seed_sa_tables():
    with connection.cursor() as cursor:
        print("Checking/Creating sa030 table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sa030 (
                gkey VARCHAR(20) PRIMARY KEY,
                pono VARCHAR(50),
                ba010gkey VARCHAR(20),
                ba015gkey VARCHAR(20),
                orddate DATE,
                year VARCHAR(4),
                ba055gkey VARCHAR(20),
                status VARCHAR(2),
                pairs DECIMAL(10, 2)
            );
        """)

        print("Checking/Creating sa031 table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sa031 (
                gkey VARCHAR(20) PRIMARY KEY,
                sa030gkey VARCHAR(20),
                dp015gkey VARCHAR(20),
                dp010gkey VARCHAR(20),
                styleno VARCHAR(50),
                dp004gkey VARCHAR(20),
                pairs DECIMAL(10, 2),
                photopath VARCHAR(255)
            );
        """)

        print("Checking/Creating sa032 table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sa032 (
                gkey VARCHAR(20) PRIMARY KEY,
                sa031gkey VARCHAR(20),
                sizerun VARCHAR(50),
                status VARCHAR(2),
                pairs DECIMAL(10, 2)
            );
        """)

        # Check if tables are empty before seeding mock data
        cursor.execute("SELECT COUNT(*) FROM sa030;")
        count = cursor.fetchone()[0]
        if count == 0:
            print("Seeding mock order data...")
            # Outsole: 2605280643171511703A (AC179)
            # Last: 2605280642430067075A (testDP010v1)
            # Customer: 2605280453250167089A (testBA010)
            # Factory: 2605280453414624135A (testBA015)
            # Gender: 2605280515256551093A (mens)
            # Season: 2605280553256551000A (mock season, or None)
            
            # Order 1: Normal Order
            cursor.execute("""
                INSERT INTO sa030 (gkey, pono, ba010gkey, ba015gkey, orddate, year, status, pairs)
                VALUES ('ORD001GKEY', 'PO-2026-0001', '2605280453250167089A', '2605280453414624135A', '2026-05-15', '2026', '1', 500.0);
            """)
            cursor.execute("""
                INSERT INTO sa031 (gkey, sa030gkey, dp015gkey, dp010gkey, styleno, dp004gkey, pairs, photopath)
                VALUES ('ORDD001GKEY', 'ORD001GKEY', '2605280643171511703A', '2605280642430067075A', 'TESTDP030V1', '2605280515256551093A', 500.0, 'https://raw.githubusercontent.com/ant-design/ant-design/master/logo.svg');
            """)
            cursor.execute("""
                INSERT INTO sa032 (gkey, sa031gkey, sizerun, status, pairs)
                VALUES ('ORDS001GKEY', 'ORDD001GKEY', 'US 7-10', '1', 500.0);
            """)

            # Order 2: Normal Order 2 (different style, same outsole)
            cursor.execute("""
                INSERT INTO sa030 (gkey, pono, ba010gkey, ba015gkey, orddate, year, status, pairs)
                VALUES ('ORD002GKEY', 'PO-2026-0002', '2605280453250167089A', '2605280453414624135A', '2026-05-20', '2026', '1', 350.0);
            """)
            cursor.execute("""
                INSERT INTO sa031 (gkey, sa030gkey, dp015gkey, dp010gkey, styleno, dp004gkey, pairs, photopath)
                VALUES ('ORDD002GKEY', 'ORD002GKEY', '2605280643171511703A', '2605280642430067075A', 'TESTDP030V2', '2605280515256551093A', 350.0, 'https://raw.githubusercontent.com/ant-design/ant-design/master/logo.svg');
            """)
            cursor.execute("""
                INSERT INTO sa032 (gkey, sa031gkey, sizerun, status, pairs)
                VALUES ('ORDS002GKEY', 'ORDD002GKEY', 'US 8-11', '1', 350.0);
            """)

            # Order 3: Cancelled Order (status = '0')
            cursor.execute("""
                INSERT INTO sa030 (gkey, pono, ba010gkey, ba015gkey, orddate, year, status, pairs)
                VALUES ('ORD003GKEY', 'PO-2026-0003', '2605280453250167089A', '2605280453414624135A', '2026-05-22', '2026', '0', 200.0);
            """)
            cursor.execute("""
                INSERT INTO sa031 (gkey, sa030gkey, dp015gkey, dp010gkey, styleno, dp004gkey, pairs, photopath)
                VALUES ('ORDD003GKEY', 'ORD003GKEY', '2605280643171511703A', '2605280642430067075A', 'TESTDP030V1', '2605280515256551093A', 200.0, 'https://raw.githubusercontent.com/ant-design/ant-design/master/logo.svg');
            """)
            cursor.execute("""
                INSERT INTO sa032 (gkey, sa031gkey, sizerun, status, pairs)
                VALUES ('ORDS003GKEY', 'ORDD003GKEY', 'US 7-10', '0', 200.0);
            """)
            print("Successfully seeded order tables.")
        else:
            print("Order tables already populated.")

if __name__ == '__main__':
    create_and_seed_sa_tables()
