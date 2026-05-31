from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from decimal import Decimal
from api.models import Dp030, Dp031, Dp033, Ba010, Ba015, Ba055, Dp002, Mr035

Mr035._meta.managed = True


class Dp040ImportCandidatesTests(APITestCase):

    def setUp(self):
        # 1. 建立基礎字庫資料
        self.customer = Ba010.objects.create(custno='CUST001', shortname='Test Customer')
        self.other_customer = Ba010.objects.create(custno='CUST002', shortname='Other Customer')
        self.factory = Ba015.objects.create(factno='FTY001', shortname='Test Factory')
        self.season = Ba055.objects.create(groupcode='SS26', serialno=Decimal('1'))
        self.sample_type = Dp002.objects.create(sampletype='FIT', serialno=Decimal('1'))

        # 2. 建立預設符合條件的樣品資料 (Mode 1: (10 + 2) - 3 = 9 > 0)
        self.dp030 = Dp030.objects.create(
            sampleno='SMP-001',
            year='2026',
            ba010gkey=self.customer,
            ba015gkey=self.factory,
            ba055gkey=self.season,
            dp002gkey=self.sample_type,
            status='1'
        )
        self.dp031 = Dp031.objects.create(
            dp030gkey=self.dp030,
            styleno='STYLE-001',
            color='紅/黑',
            ecolor='Red/Black',
            status='1',
            serialno=1,
            totalpairs=12
        )
        self.dp033 = Dp033.objects.create(
            dp030gkey=self.dp030,
            dp031gkey=self.dp031,
            size='8',
            custpairs=Decimal('10.0'),
            keeppairs=Decimal('2.0'),
            sentpairs=Decimal('3.0'),
            receive=Decimal('1.0'),
            finishpairs=Decimal('0.0'),
            serialno=1
        )

        self.url = reverse('dp040-import-candidates')

    def test_import_candidates_requires_customer(self):
        """1. 未傳 ba010gkey 時回傳 400"""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ba010gkey is required', response.data.get('detail', ''))

    def test_import_candidates_excludes_cancelled(self):
        """2. Dp030.status='0' 或 Dp031.status='0' 不出現在結果"""
        # 作廢主單
        cancelled_dp030 = Dp030.objects.create(
            sampleno='SMP-002',
            ba010gkey=self.customer,
            status='0'
        )
        cancelled_dp031 = Dp031.objects.create(
            dp030gkey=cancelled_dp030,
            styleno='STYLE-002',
            status='1',
            serialno=1
        )
        Dp033.objects.create(
            dp030gkey=cancelled_dp030,
            dp031gkey=cancelled_dp031,
            size='8',
            custpairs=Decimal('10.0'),
            serialno=1
        )

        # 作廢配色
        active_dp030 = Dp030.objects.create(
            sampleno='SMP-003',
            ba010gkey=self.customer,
            status='1'
        )
        cancelled_color_dp031 = Dp031.objects.create(
            dp030gkey=active_dp030,
            styleno='STYLE-003',
            status='0',
            serialno=1
        )
        Dp033.objects.create(
            dp030gkey=active_dp030,
            dp031gkey=cancelled_color_dp031,
            size='8',
            custpairs=Decimal('10.0'),
            serialno=1
        )

        response = self.client.get(self.url, {'ba010gkey': self.customer.gkey})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # 僅有 setUp 的 SMP-001 應該出現
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['sampleno'], 'SMP-001')

    def test_import_candidates_excludes_completed_or_no_outstanding(self):
        """3. Dp030.status='3' 或 outstanding_to_send <= 0 不出現在結果"""
        # 已完成主單 (status='3')
        completed_dp030 = Dp030.objects.create(
            sampleno='SMP-004',
            ba010gkey=self.customer,
            status='3'
        )
        completed_dp031 = Dp031.objects.create(
            dp030gkey=completed_dp030,
            styleno='STYLE-004',
            status='1',
            serialno=1
        )
        Dp033.objects.create(
            dp030gkey=completed_dp030,
            dp031gkey=completed_dp031,
            size='8',
            custpairs=Decimal('10.0'),
            serialno=1
        )

        # 無欠數的尺碼 (sentpairs >= custpairs + keeppairs in Mode 1)
        no_outstanding_dp030 = Dp030.objects.create(
            sampleno='SMP-005',
            ba010gkey=self.customer,
            status='1'
        )
        no_outstanding_dp031 = Dp031.objects.create(
            dp030gkey=no_outstanding_dp030,
            styleno='STYLE-005',
            status='1',
            serialno=1
        )
        Dp033.objects.create(
            dp030gkey=no_outstanding_dp030,
            dp031gkey=no_outstanding_dp031,
            size='8',
            custpairs=Decimal('10.0'),
            keeppairs=Decimal('2.0'),
            sentpairs=Decimal('12.0'),  # 12 >= 10 + 2, outstanding = 0
            serialno=1
        )

        response = self.client.get(self.url, {'ba010gkey': self.customer.gkey})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['sampleno'], 'SMP-001')

    def test_import_candidates_mode1_formula(self):
        """4. Mode 1：outstanding = custpairs + keeppairs - sentpairs"""
        # Mode 1: (10 + 2) - 3 = 9
        response = self.client.get(self.url, {
            'ba010gkey': self.customer.gkey,
            'samplestatus': '1'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['outstanding_to_send'], 9.0)

    def test_import_candidates_mode2_formula(self):
        """5. Mode 2：outstanding = custpairs - sentpairs (排除 keeppairs)"""
        # Mode 2: 10 - 3 = 7
        response = self.client.get(self.url, {
            'ba010gkey': self.customer.gkey,
            'samplestatus': '2'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['outstanding_to_send'], 7.0)

    def test_import_candidates_mode3_formula(self):
        """6. Mode 3：outstanding = custpairs + keeppairs - receive - sentpairs"""
        # Mode 3: (10 + 2 - 1) - 3 = 8
        response = self.client.get(self.url, {
            'ba010gkey': self.customer.gkey,
            'samplestatus': '3'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['outstanding_to_send'], 8.0)

    def test_import_candidates_filters_by_sampleno_and_styleno(self):
        """7. 確認模糊查詢與客戶隔離有效"""
        # 其他客戶樣品不應出現
        other_dp030 = Dp030.objects.create(
            sampleno='SMP-999',
            ba010gkey=self.other_customer,
            status='1'
        )
        other_dp031 = Dp031.objects.create(
            dp030gkey=other_dp030,
            styleno='STYLE-999',
            status='1',
            serialno=1
        )
        Dp033.objects.create(
            dp030gkey=other_dp030,
            dp031gkey=other_dp031,
            size='8',
            custpairs=Decimal('10.0'),
            serialno=1
        )

        # 搜尋無效樣品單號
        response = self.client.get(self.url, {
            'ba010gkey': self.customer.gkey,
            'sampleno': 'NON-EXISTENT'
        })
        self.assertEqual(len(response.data), 0)

        # 搜尋有效樣品單號 (模糊)
        response = self.client.get(self.url, {
            'ba010gkey': self.customer.gkey,
            'sampleno': 'SMP'
        })
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['sampleno'], 'SMP-001')


from api.services.sample_status_service import recalculate_sample_status, get_sample_status_mode

class Dp040SampleStatusServiceTests(APITestCase):

    def setUp(self):
        self.customer = Ba010.objects.create(custno='CUST100', shortname='Test Customer 2')
        self.dp030 = Dp030.objects.create(
            sampleno='SMP-100',
            ba010gkey=self.customer,
            status='1'
        )
        self.dp031 = Dp031.objects.create(
            dp030gkey=self.dp030,
            styleno='STYLE-100',
            color='Black',
            status='1',
            serialno=1,
            totalpairs=10
        )
        self.dp033 = Dp033.objects.create(
            dp030gkey=self.dp030,
            dp031gkey=self.dp031,
            size='8',
            custpairs=Decimal('5.0'),
            keeppairs=Decimal('1.0'),
            sentpairs=Decimal('0.0'),
            receive=Decimal('0.0'),
            finishpairs=Decimal('0.0'),
            serialno=1
        )

    def test_import_and_fallback(self):
        # Verify get_sample_status_mode returns '1' and no ImportError
        self.assertEqual(get_sample_status_mode(), '1')

    def test_mode1_status_recalculation(self):
        # 1. Initially, sentpairs=0, so status should be '1' after recalculation
        recalculate_sample_status(dp033_keys=[self.dp033.gkey])
        self.dp031.refresh_from_db()
        self.dp030.refresh_from_db()
        self.assertEqual(self.dp031.status, '1')
        self.assertEqual(self.dp030.status, '1')

        # 2. Partially sent: sentpairs = 3 (< 6) -> status should be '2'
        self.dp033.sentpairs = Decimal('3.0')
        self.dp033.save()
        recalculate_sample_status(dp033_keys=[self.dp033.gkey])
        self.dp031.refresh_from_db()
        self.dp030.refresh_from_db()
        self.assertEqual(self.dp031.status, '2')
        self.assertEqual(self.dp030.status, '2')

        # 3. Fully sent: sentpairs = 6 (>= 5+1) -> status should be '3'
        self.dp033.sentpairs = Decimal('6.0')
        self.dp033.save()
        recalculate_sample_status(dp033_keys=[self.dp033.gkey])
        self.dp031.refresh_from_db()
        self.dp030.refresh_from_db()
        self.assertEqual(self.dp031.status, '3')
        self.assertEqual(self.dp030.status, '3')

    def test_cancelled_records_not_reopened(self):
        # If status is '0', it should not be changed by recalculate_sample_status
        self.dp031.status = '0'
        self.dp031.save()
        self.dp030.status = '0'
        self.dp030.save()

        # Update sentpairs to completion level
        self.dp033.sentpairs = Decimal('6.0')
        self.dp033.save()

        recalculate_sample_status(dp033_keys=[self.dp033.gkey])
        self.dp031.refresh_from_db()
        self.dp030.refresh_from_db()
        self.assertEqual(self.dp031.status, '0')
        self.assertEqual(self.dp030.status, '0')


class Dp050ApiTests(APITestCase):

    def setUp(self):
        self.customer = Ba010.objects.create(custno='CUST050', shortname='Test Cust 050')
        self.factory = Ba015.objects.create(factno='FTY050', shortname='Test Fty 050')
        self.season = Ba055.objects.create(groupcode='AW26', serialno=Decimal('2'))
        self.sample_type = Dp002.objects.create(sampletype='CFM', serialno=Decimal('2'))

        self.dp030 = Dp030.objects.create(
            sampleno='SMP-050',
            year='2026',
            ba010gkey=self.customer,
            ba015gkey=self.factory,
            ba055gkey=self.season,
            dp002gkey=self.sample_type,
            status='1'
        )
        self.dp031 = Dp031.objects.create(
            dp030gkey=self.dp030,
            styleno='STYLE-050',
            color='Blue',
            status='1',
            serialno=1,
            totalpairs=5
        )
        self.dp033 = Dp033.objects.create(
            dp030gkey=self.dp030,
            dp031gkey=self.dp031,
            size='9',
            custpairs=Decimal('3.0'),
            keeppairs=Decimal('2.0'),
            sentpairs=Decimal('1.0'),
            receive=Decimal('4.0'),
            finishpairs=Decimal('2.0'),
            serialno=1
        )

        # Cancelled sample for testing filters
        self.cancelled_dp030 = Dp030.objects.create(
            sampleno='SMP-CAN',
            year='2026',
            ba010gkey=self.customer,
            status='0'
        )
        self.cancelled_dp031 = Dp031.objects.create(
            dp030gkey=self.cancelled_dp030,
            styleno='STYLE-CAN',
            color='Green',
            status='0',
            serialno=1
        )

        self.query_url = reverse('dp031-dp050-query')
        self.sizes_url = reverse('dp033-dp050-sizes')

    def test_dp050_query_default_excludes_cancelled(self):
        """1. 預設不含 status='0' 的配色"""
        response = self.client.get(self.query_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # 只有一個主單配色（SMP-050）應該出現，取消的（SMP-CAN）不應出現
        self.assertTrue(any(item['sampleno'] == 'SMP-050' for item in response.data))
        self.assertFalse(any(item['sampleno'] == 'SMP-CAN' for item in response.data))

    def test_dp050_query_status_list_includes_cancelled_when_requested(self):
        """2. status_list 包含 0 時可查出取消資料"""
        response = self.client.get(self.query_url, {'status_list': '0,1'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item['sampleno'] == 'SMP-050' for item in response.data))
        self.assertTrue(any(item['sampleno'] == 'SMP-CAN' for item in response.data))

    def test_dp050_query_filters_by_customer_and_sampleno(self):
        """3. ba010gkey 與 sampleno 篩選有效"""
        # 篩選正確的
        response = self.client.get(self.query_url, {'ba010gkey': self.customer.gkey, 'sampleno': 'SMP-050'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['sampleno'], 'SMP-050')

        # 篩選無效的
        response = self.client.get(self.query_url, {'sampleno': 'SMP-NON'})
        self.assertEqual(len(response.data), 0)

    def test_dp050_query_returns_required_fields(self):
        """4. 回傳欄位包含 gkey, dp030gkey, sampleno, styleno, status, remark"""
        response = self.client.get(self.query_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row = response.data[0]
        self.assertIn('gkey', row)
        self.assertIn('dp030gkey', row)
        self.assertIn('sampleno', row)
        self.assertIn('styleno', row)
        self.assertIn('status', row)
        self.assertIn('remark', row)

    def test_dp050_sizes_requires_dp031gkey(self):
        """5. 缺少 dp031gkey 回傳 400"""
        response = self.client.get(self.sizes_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('dp031gkey is required', response.data.get('detail', ''))

    def test_dp050_sizes_returns_received_thisreceive_receive(self):
        """6. received = 原 receive, thisreceive = 0, receive = 原 receive"""
        response = self.client.get(self.sizes_url, {'dp031gkey': self.dp031.gkey})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        row = response.data[0]
        self.assertEqual(row['received'], 4.0)
        self.assertEqual(row['thisreceive'], 0.0)
        self.assertEqual(row['receive'], 4.0)

    def test_dp050_sizes_does_not_modify_db(self):
        """7. 呼叫 API 後 dp033.receive / finishpairs / sentpairs 不變"""
        response = self.client.get(self.sizes_url, {'dp031gkey': self.dp031.gkey})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 重新從 DB 載入，確認不變
        self.dp033.refresh_from_db()
        self.assertEqual(self.dp033.receive, Decimal('4.0'))
        self.assertEqual(self.dp033.finishpairs, Decimal('2.0'))
        self.assertEqual(self.dp033.sentpairs, Decimal('1.0'))

    def test_batch_save_updates_receive_by_thisreceive(self):
        """1. 初始 receive = 4, thisreceive = 3, 儲存後 receive = 7"""
        url = reverse('dp031-batch-save')
        payload = {
            "dp033_updates": [
                {
                    "gkey": self.dp033.gkey,
                    "thisreceive": 3.0
                }
            ]
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.dp033.refresh_from_db()
        self.assertEqual(self.dp033.receive, Decimal('7.0'))

    def test_batch_save_updates_finishpairs(self):
        """2. finishpairs 可更新"""
        url = reverse('dp031-batch-save')
        payload = {
            "dp033_updates": [
                {
                    "gkey": self.dp033.gkey,
                    "finishpairs": 5.0
                }
            ]
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.dp033.refresh_from_db()
        self.assertEqual(self.dp033.finishpairs, Decimal('5.0'))

    def test_batch_save_does_not_modify_sentpairs(self):
        """3. payload 即使帶 sentpairs，也不能改變 DB 中 sentpairs"""
        url = reverse('dp031-batch-save')
        payload = {
            "dp033_updates": [
                {
                    "gkey": self.dp033.gkey,
                    "sentpairs": 99.0
                }
            ]
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.dp033.refresh_from_db()
        self.assertEqual(self.dp033.sentpairs, Decimal('1.0')) # Unchanged

    def test_batch_save_rejects_negative_thisreceive(self):
        """4. thisreceive < 0 回傳 400"""
        url = reverse('dp031-batch-save')
        payload = {
            "dp033_updates": [
                {
                    "gkey": self.dp033.gkey,
                    "thisreceive": -1.0
                }
            ]
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get('detail'), "本次點收數不可為負數。")

    def test_batch_save_rejects_negative_finishpairs(self):
        """5. finishpairs < 0 回傳 400"""
        url = reverse('dp031-batch-save')
        payload = {
            "dp033_updates": [
                {
                    "gkey": self.dp033.gkey,
                    "finishpairs": -1.0
                }
            ]
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get('detail'), "完成雙數不可為負數。")

    def test_batch_save_updates_dp031_status_remark(self):
        """6. status 可更新（remark 欄位目前不在 DB 中，略過 remark 驗證）"""
        url = reverse('dp031-batch-save')
        payload = {
            "dp031_updates": [
                {
                    "gkey": self.dp031.gkey,
                    "status": "3",
                    "remark": "Updated Remark"  # ignored: column not in DB
                }
            ]
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.dp031.refresh_from_db()
        self.assertEqual(self.dp031.status, "3")
        # dp031.remark not in PostgreSQL DB — skip remark assertion

    def test_batch_save_rejects_invalid_status(self):
        """7. status 不在 0/1/2/3 回傳 400"""
        url = reverse('dp031-batch-save')
        payload = {
            "dp031_updates": [
                {
                    "gkey": self.dp031.gkey,
                    "status": "9"
                }
            ]
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get('detail'), "狀態值不合法。")

    def test_batch_save_calls_status_recalculation(self):
        """8. 儲存後 dp030.status / dp031.status 有依 service 重新計算"""
        url = reverse('dp031-batch-save')
        self.dp033.sentpairs = Decimal('5.0')
        self.dp033.save()
        
        payload = {
            "dp033_updates": [
                {
                    "gkey": self.dp033.gkey,
                    "finishpairs": 3.0
                }
            ]
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.dp031.refresh_from_db()
        self.dp030.refresh_from_db()
        self.assertEqual(self.dp031.status, "3")
        self.assertEqual(self.dp030.status, "3")

    def test_batch_save_cancelled_color_not_reopened(self):
        """9. 原 status='0' 不可被改成 '1'/'2'/'3'"""
        self.dp031.status = '0'
        self.dp031.save()
        url = reverse('dp031-batch-save')
        payload = {
            "dp031_updates": [
                {
                    "gkey": self.dp031.gkey,
                    "status": "1"
                }
            ]
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get('detail'), "取消狀態的配色不可於 DP050 重新啟用。")

    def test_batch_save_missing_dp033_returns_chinese_error(self):
        """10. 找不到 dp033 時回傳中文 detail"""
        url = reverse('dp031-batch-save')
        payload = {
            "dp033_updates": [
                {
                    "gkey": "nonexistent_gkey",
                    "thisreceive": 1.0
                }
            ]
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get('detail'), "找不到對應的尺碼資料，可能已被刪除，請重新查詢後再操作。")


from api.models import Mr015, Mr016, Mr030, Mr035
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.files.storage import default_storage
from django.db import connection

def ensure_mr035_table():
    with connection.cursor() as cursor:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS mr035 (
                gkey VARCHAR(20) PRIMARY KEY,
                mstkno VARCHAR(60) UNIQUE,
                mname VARCHAR(100),
                mr015gkey VARCHAR(20),
                mr016gkey VARCHAR(20),
                mr030gkey VARCHAR(20)
            )
        """)

class Mr015ViewSetTests(APITestCase):
    def setUp(self):
        ensure_mr035_table()
        self.mr015_url = reverse('mr015-list')
        self.bulk_save_url = reverse('mr015-bulk-save')

    def test_mr015_crud(self):
        # Create
        response = self.client.post(self.mr015_url, {'matno': 'M15', 'cname': '大類A', 'serialno': 1}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Mr015.objects.count(), 1)
        gkey = response.data['gkey']

        # Read
        response = self.client.get(self.mr015_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        # Update
        update_url = reverse('mr015-detail', kwargs={'pk': gkey})
        response = self.client.patch(update_url, {'cname': '大類A_updated'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Mr015.objects.get(gkey=gkey).cname, '大類A_updated')

        # Delete
        response = self.client.delete(update_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Mr015.objects.count(), 0)

    def test_mr015_duplicate_check(self):
        # Create first
        Mr015.objects.create(matno='M15_DUP', cname='First', serialno=1)
        # Create second with same matno
        response = self.client.post(self.mr015_url, {'matno': 'M15_DUP', 'cname': 'Second', 'serialno': 2}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("已存在，不可重複", str(response.data))

    def test_mr015_reference_check(self):
        # Create Master
        master = Mr015.objects.create(matno='M15_REF', cname='Ref Master', serialno=1)
        # Create reference in Mr035
        mr035 = Mr035.objects.create(mstkno='MAT_REF_1', mname='Ref Material', mr015gkey=master.gkey)

        # Try to delete master
        detail_url = reverse('mr015-detail', kwargs={'pk': master.gkey})
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("已被料號主檔引用", str(response.data))

        # Try to update matno
        response = self.client.patch(detail_url, {'matno': 'M15_REF_CHG'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("已被料號主檔引用", str(response.data))

        # Try bulk save delete
        response = self.client.post(self.bulk_save_url, {
            'upsert': [],
            'delete': [master.gkey]
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("已被料號主檔引用", str(response.data))

        # Clean reference and delete should work
        mr035.delete()
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)


class Mr016ViewSetTests(APITestCase):
    def setUp(self):
        ensure_mr035_table()
        self.master = Mr015.objects.create(matno='M15_DETAIL', cname='Master', serialno=1)
        self.mr016_url = reverse('mr016-list')
        self.bulk_save_url = reverse('mr016-bulk-save')

    def test_mr016_crud_and_query_filter(self):
        # Create
        response = self.client.post(self.mr016_url, {
            'mr015gkey': self.master.gkey,
            'smatno': 'S16',
            'cname': '小類A',
            'serialno': 1
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Mr016.objects.count(), 1)
        gkey = response.data['gkey']

        # Query filter by mr015gkey
        response = self.client.get(self.mr016_url, {'mr015gkey': self.master.gkey})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        # Query filter by other key (should return 0)
        response = self.client.get(self.mr016_url, {'mr015gkey': 'nonexistent'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

        # Update
        detail_url = reverse('mr016-detail', kwargs={'pk': gkey})
        response = self.client.patch(detail_url, {'cname': '小類A_updated'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Mr016.objects.get(gkey=gkey).cname, '小類A_updated')

        # Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_mr016_duplicate_check(self):
        # Same matno under same master is duplicate
        Mr016.objects.create(mr015gkey=self.master, smatno='S16_DUP', cname='First', serialno=1)
        response = self.client.post(self.mr016_url, {
            'mr015gkey': self.master.gkey,
            'smatno': 'S16_DUP',
            'cname': 'Second',
            'serialno': 2
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("已存在，不可重複", str(response.data))

    def test_mr016_scoped_serialno_different_masters(self):
        # Different masters can have the same serialno for their details
        master2 = Mr015.objects.create(matno='M15_2', cname='Master 2', serialno=2)
        
        # Detail 1 under master 1, serialno = 1
        Mr016.objects.create(mr015gkey=self.master, smatno='S16_A', cname='Detail A', serialno=1)
        
        # Detail 2 under master 2, serialno = 1
        response = self.client.post(self.mr016_url, {
            'mr015gkey': master2.gkey,
            'smatno': 'S16_B',
            'cname': 'Detail B',
            'serialno': 1
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Mr016.objects.get(gkey=response.data['gkey']).serialno, 1)

    def test_mr016_reference_check(self):
        detail = Mr016.objects.create(mr015gkey=self.master, smatno='S16_REF', cname='Ref Detail', serialno=1)
        mr035 = Mr035.objects.create(mstkno='MAT_REF_2', mname='Ref Material', mr016gkey=detail.gkey)

        detail_url = reverse('mr016-detail', kwargs={'pk': detail.gkey})
        
        # Try delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("已被料號主檔引用", str(response.data))

        # Try update smatno
        response = self.client.patch(detail_url, {'smatno': 'S16_REF_CHG'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("已被料號主檔引用", str(response.data))


class Mr030ViewSetTests(APITestCase):
    def setUp(self):
        ensure_mr035_table()
        self.mr030_url = reverse('mr030-list')
        self.bulk_save_url = reverse('mr030-bulk-save')

    def test_mr030_crud_and_duplicate(self):
        # Create
        response = self.client.post(self.mr030_url, {
            'veinno': 'V30',
            'cname': '紋路A',
            'serialno': 1
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        gkey = response.data['gkey']

        # Duplicate check
        response = self.client.post(self.mr030_url, {
            'veinno': 'V30',
            'cname': '紋路B',
            'serialno': 2
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Delete
        detail_url = reverse('mr030-detail', kwargs={'pk': gkey})
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_mr030_reference_check(self):
        vein = Mr030.objects.create(veinno='V30_REF', cname='Ref Vein', serialno=1)
        mr035 = Mr035.objects.create(mstkno='MAT_REF_3', mname='Ref Material', mr030gkey=vein.gkey)

        detail_url = reverse('mr030-detail', kwargs={'pk': vein.gkey})

        # Try delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("已被料號主檔引用", str(response.data))

        # Try update veinno
        response = self.client.patch(detail_url, {'veinno': 'V30_REF_CHG'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("已被料號主檔引用", str(response.data))


class ImageUploadTests(APITestCase):
    def setUp(self):
        self.upload_url = reverse('upload_image')
        from django.contrib.auth.models import User
        self.user = User.objects.create_user(username='testuploader', password='password')
        self.client.force_authenticate(user=self.user)

    def test_upload_success(self):
        img_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
        uploaded_file = SimpleUploadedFile("test.png", img_data, content_type="image/png")
        
        response = self.client.post(self.upload_url, {'image': uploaded_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('url', response.data)
        self.assertIn('path', response.data)
        self.assertIn('filename', response.data)

        # Cleanup uploaded file
        path = response.data['path']
        if default_storage.exists(path):
            default_storage.delete(path)

    def test_upload_reject_non_image(self):
        uploaded_file = SimpleUploadedFile("test.txt", b"plain text data", content_type="text/plain")
        response = self.client.post(self.upload_url, {'image': uploaded_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("檔案類型必須是圖片", str(response.data.get('detail', '')))

    def test_upload_reject_large_file(self):
        large_data = b'0' * (5 * 1024 * 1024 + 100) # > 5MB
        uploaded_file = SimpleUploadedFile("large.png", large_data, content_type="image/png")
        response = self.client.post(self.upload_url, {'image': uploaded_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("圖片大小不能超過 5MB", str(response.data.get('detail', '')))




