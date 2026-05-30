import os
import sys
import django

# Initialize Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from rest_framework.test import APIClient
from api.models import Dp030, Dp031, Dp032, Dp033, Ba010, Ba015, Dp002, Ba055, Dp005
import json

def run_verification():
    print("==================================================")
    print("🚀 STARTING DP032 (BOM GRID) END-TO-END FLOW TESTS")
    print("==================================================")

    # 1. Gather master lookup records
    try:
        cust = Ba010.objects.get(gkey='2605280453250167089A')
        fty = Ba015.objects.get(gkey='2605280454452518134A')
        stype = Dp002.objects.get(gkey='2605281438275073717A')
        season = Ba055.objects.get(gkey='2605280456135942754A')
    except Exception as e:
        print(f"Error fetching master records: {e}")
        return

    # Clean up old test data if any
    Dp030.objects.filter(sampleno='2026TESTBOM').delete()

    client = APIClient()

    # 2. Test Step A: Create Dp030 Master + Dp031 Colors
    print("\n--- STEP 1: Creating Dp030 master and two colors in Dp031 ---")
    payload_step1 = {
        "master": {
            "gkey": "temp_m_1",
            "sampleno": "2026TESTBOM",
            "year": "2026",
            "issuedate": "2026-05-29",
            "styleno": "ST-TEST1",
            "stylename": "BOM Test Shoe",
            "status": "1",
            "ba010gkey": cust.gkey,
            "ba015gkey": fty.gkey,
            "dp002gkey": stype.gkey,
            "ba055gkey": season.gkey
        },
        "dp031": {
            "upsert": [
                {
                    "gkey": "temp_c_1",
                    "colorcode": "01",
                    "color": "黑色",
                    "ecolor": "BLACK",
                    "styleno": "ST-TEST1",
                    "status": "1"
                },
                {
                    "gkey": "temp_c_2",
                    "colorcode": "02",
                    "color": "白色",
                    "ecolor": "WHITE",
                    "styleno": "ST-TEST1",
                    "status": "1"
                }
            ],
            "delete": []
        }
    }

    res = client.post('/api/dp030/deep_save/', payload_step1, format='json')
    if res.status_code != 200:
        print(f"Failed Step 1: {res.data}")
        return
    
    m_gkey = res.data.get('gkey')
    print(f"Success! Master Dp030 created with gkey={m_gkey}")

    master_inst = Dp030.objects.get(gkey=m_gkey)
    colors = list(Dp031.objects.filter(dp030gkey=master_inst).order_by('colorcode'))
    print(f"Created colors in DB: {[(c.gkey, c.colorcode, c.color) for c in colors]}")
    c1_gkey = colors[0].gkey
    c2_gkey = colors[1].gkey

    # Add dummy sizes to Dp033 for recalculating totalpairs
    Dp033.objects.create(dp030gkey=master_inst, dp031gkey=colors[0], size='8', custpairs=5.0, keeppairs=1.0, serialno=1)
    Dp033.objects.create(dp030gkey=master_inst, dp031gkey=colors[1], size='9', custpairs=10.0, keeppairs=2.0, serialno=1)

    # 3. Test Step B: Upsert Dp032 BOM Rows
    print("\n--- STEP 2: Adding two BOM rows in Dp032 (costing, unit, qprp, loss, etc.) ---")
    tongue_group = Dp005.objects.get(gkey='2605280518044299233A') # TONGUE
    outsole_group = Dp005.objects.get(gkey='2605280518044287994A') # OUTSOLE/BOTTOM
    
    payload_step2 = {
        "master": {
            "gkey": m_gkey,
            "sampleno": "2026TESTBOM",
            "year": "2026",
            "issuedate": "2026-05-29",
            "styleno": "ST-TEST1",
            "stylename": "BOM Test Shoe",
            "status": "1",
            "ba010gkey": cust.gkey,
            "ba015gkey": fty.gkey,
            "dp002gkey": stype.gkey,
            "ba055gkey": season.gkey
        },
        "dp032": {
            "upsert": [
                {
                    "gkey": "temp_b_1",
                    "parts": "鞋舌",
                    "eparts": "tongue",
                    "dp005gkey": tongue_group.gkey,
                    "makedescription": "車線加工",
                    "unit": "PRS",
                    "qprp": 1.25,
                    "loss": 3.5,
                    "costing": "1",
                    
                    # Channel 1: Black Color
                    "mr010gkey1": "clr_gkey_1",
                    "clrnm1": "酷炫黑",
                    "clrenm1": "COOL BLACK",
                    "mr035gkey1": "mat_gkey_1",
                    "cmaterial1": "EVA 橡膠大底材料",
                    "ematerial1": "EVA Rubber",
                    "ba015gkey1": fty.gkey,
                    "pantone1": "PANTONE-011",
                    
                    # Channel 2: White Color
                    "mr010gkey2": "clr_gkey_2",
                    "clrnm2": "極光白",
                    "clrenm2": "AURORA WHITE",
                    "mr035gkey2": "mat_gkey_2",
                    "cmaterial2": "EVA 溫發泡中底材料",
                    "ematerial2": "EVA Foam",
                    "ba015gkey2": fty.gkey,
                    "pantone2": "PANTONE-022",
                },
                {
                    "gkey": "temp_b_2",
                    "parts": "大底",
                    "eparts": "outsole",
                    "dp005gkey": outsole_group.gkey,
                    "makedescription": "射出成型",
                    "unit": "PRS",
                    "qprp": 2.10,
                    "loss": 1.2,
                    "costing": "0",
                    
                    # Channel 1: Black Color
                    "mr010gkey1": "clr_gkey_3",
                    "clrnm1": "玫瑰金",
                    "clrenm1": "ROSE GOLD",
                    "mr035gkey1": "mat_gkey_3",
                    "cmaterial1": "PU 高彈大底複合材料",
                    "ematerial1": "PU Outsole",
                    "ba015gkey1": fty.gkey,
                    "pantone1": "PANTONE-033",
                }
            ],
            "delete": []
        }
    }

    res2 = client.post('/api/dp030/deep_save/', payload_step2, format='json')
    if res2.status_code != 200:
        print(f"Failed Step 2: {res2.data}")
        return
    print("Success! BOM rows upserted.")

    # Check database writes for Dp032
    db_parts = list(Dp032.objects.filter(dp030gkey=master_inst).order_by('serialno'))
    print(f"BOM rows found in DB: {len(db_parts)}")
    for p in db_parts:
        print(f"  - gkey={p.gkey}, serialno={p.serialno}, parts={p.parts}, dp005={p.dp005gkey.partgroup if p.dp005gkey else 'None'}, costing={p.costing}, qprp={p.qprp}, loss={p.loss}")
        print(f"    Channel 1 Color={p.clrnm1}, Material={p.cmaterial1}, Supplier={p.ba015gkey1}, Pantone={p.pantone1}")
        print(f"    Channel 2 Color={p.clrnm2}, Material={p.cmaterial2}")

    # Check backfilled values in Dp031 Colors after recalculation
    c1 = Dp031.objects.get(gkey=c1_gkey)
    c2 = Dp031.objects.get(gkey=c2_gkey)
    print("\n--- STEP 3: Checking backfilled material columns in Dp031 ---")
    print(f"Color 1 ({c1.color}) recalculated:")
    print(f"  - tongue (鞋舌): {c1.tongue}")
    print(f"  - bottom (大底): {c1.bottom}")
    print(f"  - totalpairs: {c1.totalpairs} (Expected: 5.0 + 1.0 = 6.0)")

    print(f"Color 2 ({c2.color}) recalculated:")
    print(f"  - tongue (鞋舌): {c2.tongue}")
    print(f"  - bottom (大底): {c2.bottom}")
    print(f"  - totalpairs: {c2.totalpairs} (Expected: 10.0 + 2.0 = 12.0)")

    # 4. Test Step C: Retrieve Single Record Details via API (Joined Display Check)
    print("\n--- STEP 4: Querying /api/dp032/?dp030gkey=... to test joins ---")
    res_get = client.get(f'/api/dp032/?dp030gkey={m_gkey}')
    if res_get.status_code != 200:
        print(f"Failed to retrieve BOM detail: {res_get.data}")
        return
    
    print(f"Returned {len(res_get.data)} rows.")
    for idx, row in enumerate(res_get.data):
        print(f"Row {idx+1}: parts={row.get('parts')}, eparts={row.get('eparts')}, dp005gkey={row.get('dp005gkey')}, partgroup_name={row.get('partgroup_name')}")
        print(f"  - clrcode1={row.get('clrcode1')}, mstkno1={row.get('mstkno1')}, supplierno1={row.get('supplierno1')}, shortname1={row.get('shortname1')}")
        print(f"  - clrcode2={row.get('clrcode2')}, mstkno2={row.get('mstkno2')}, supplierno2={row.get('supplierno2')}, shortname2={row.get('shortname2')}")

    # 5. Test Step D: Modify one row, Delete another row, check Recalculate updates
    p1_gkey = db_parts[0].gkey
    p2_gkey = db_parts[1].gkey
    print(f"\n--- STEP 5: Updating row 1 (gkey={p1_gkey}) and Deleting row 2 (gkey={p2_gkey}) ---")
    
    payload_step3 = {
        "master": {
            "gkey": m_gkey,
            "sampleno": "2026TESTBOM"
        },
        "dp032": {
            "upsert": [
                {
                    "gkey": p1_gkey,
                    "parts": "鞋舌-修改版",
                    "eparts": "tongue-modified",
                    "dp005gkey": tongue_group.gkey,
                    "makedescription": "車線加工-已調整",
                    "unit": "PRS",
                    "qprp": 1.45,
                    "loss": 4.0,
                    "costing": "1",
                    
                    # Channel 1: Black Color
                    "mr010gkey1": "clr_gkey_1",
                    "clrnm1": "酷炫黑-亮",
                    "clrenm1": "COOL BLACK SHINY",
                    "mr035gkey1": "mat_gkey_1",
                    "cmaterial1": "EVA 橡膠大底材料-加強",
                    "ematerial1": "EVA Rubber Reinforced",
                    "ba015gkey1": fty.gkey,
                    "pantone1": "PANTONE-011-UPDATED"
                }
            ],
            "delete": [p2_gkey]
        }
    }

    res3 = client.post('/api/dp030/deep_save/', payload_step3, format='json')
    if res3.status_code != 200:
        print(f"Failed Step 5: {res3.data}")
        return
    print("Success! Row 2 deleted, Row 1 updated.")

    # Check Dp032 database count and recalculation in Dp031
    db_parts_after = list(Dp032.objects.filter(dp030gkey=master_inst).order_by('serialno'))
    print(f"BOM rows remaining in DB: {len(db_parts_after)}")
    for p in db_parts_after:
        print(f"  - gkey={p.gkey}, parts={p.parts}, costing={p.costing}, qprp={p.qprp}, loss={p.loss}")
        print(f"    Channel 1 Color={p.clrnm1}, Material={p.cmaterial1}")

    c1_after = Dp031.objects.get(gkey=c1_gkey)
    print(f"Color 1 ({c1_after.color}) recalculated:")
    print(f"  - tongue (鞋舌): {c1_after.tongue}")
    print(f"  - bottom (大底): {c1_after.bottom} (Expected to be cleared/empty because '大底' row was deleted)")

    # 6. Test Step E: Clear all remaining BOM rows, check that dp031 material fields are completely cleared
    print("\n--- STEP 6: Clearing all remaining BOM rows (testing empty parts recalculation) ---")
    payload_step4 = {
        "master": {
            "gkey": m_gkey,
            "sampleno": "2026TESTBOM"
        },
        "dp032": {
            "upsert": [],
            "delete": [p1_gkey]
        }
    }
    
    res4 = client.post('/api/dp030/deep_save/', payload_step4, format='json')
    if res4.status_code != 200:
        print(f"Failed Step 6: {res4.data}")
        return
    print("Success! All BOM rows cleared.")

    db_parts_final = list(Dp032.objects.filter(dp030gkey=master_inst))
    print(f"BOM rows remaining in DB: {len(db_parts_final)} (Expected: 0)")

    c1_final = Dp031.objects.get(gkey=c1_gkey)
    print(f"Color 1 ({c1_final.color}) recalculated after clearing BOM:")
    print(f"  - tongue (鞋舌): '{c1_final.tongue}' (Expected: '')")
    print(f"  - bottom (大底): '{c1_final.bottom}' (Expected: '')")

    # Clean up test master record from DB
    Dp030.objects.filter(sampleno='2026TESTBOM').delete()
    print("\nTest completed and database cleaned up.")
    print("==================================================")

if __name__ == '__main__':
    run_verification()
