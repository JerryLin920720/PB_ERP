from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from django.db import DatabaseError
from api.common.permissions.program_permission import HasProgramPermission
from rest_framework import viewsets
from api.modules.common.views import BaseDictionaryViewSet
from api.models import Ba001
from .models import *
from .serializers import *

class Sa001ViewSet(BaseDictionaryViewSet):
    """
    sa001 業務片語字庫
    重用 ba001 表，以 f2type='SA' 區分業務部門片語。
    新增行時自動帶入 f2type='SA'。
    """
    program_id = 'w_sa001'
    queryset = Ba001.objects.filter(f2type='SA')
    serializer_class = Sa001Serializer

    def perform_create(self, serializer):
        """強制指定 f2type='SA'，防止覟份其他模組的片語資料。"""
        current_max = self.queryset.aggregate(Max('serialno'))['serialno__max'] or 0
        serializer.save(f2type='SA', serialno=current_max + 1)

    @action(detail=False, methods=['post'], url_path='bulk_save')
    def bulk_save(self, request):
        """批次存檔 (upsert + delete)，限定在 f2type='SA' 範圍內。"""
        upsert_data = request.data.get('upsert', [])
        delete_keys = request.data.get('delete', [])

        try:
            with transaction.atomic():
                if delete_keys:
                    Ba001.objects.filter(gkey__in=delete_keys, f2type='SA').delete()

                current_max = self.queryset.aggregate(Max('serialno'))['serialno__max'] or 0
                upserted_instances = []

                for item in upsert_data:
                    data_copy = {k: v for k, v in item.items()}
                    gkey = data_copy.get('gkey')

                    if gkey and str(gkey).startswith('temp_'):
                        data_copy.pop('gkey', None)
                        data_copy.pop('serialno', None)
                        data_copy['f2type'] = 'SA'
                        current_max += 1
                        ser = Sa001Serializer(data=data_copy)
                        ser.is_valid(raise_exception=True)
                        inst = ser.save(f2type='SA', serialno=current_max)
                    elif gkey:
                        inst = Ba001.objects.get(gkey=gkey, f2type='SA')
                        data_copy['f2type'] = 'SA'
                        ser = Sa001Serializer(inst, data=data_copy, partial=True)
                        ser.is_valid(raise_exception=True)
                        inst = ser.save()
                    else:
                        data_copy['f2type'] = 'SA'
                        current_max += 1
                        ser = Sa001Serializer(data=data_copy)
                        ser.is_valid(raise_exception=True)
                        inst = ser.save(f2type='SA', serialno=current_max)

                    upserted_instances.append(inst)

                upserted_records = Sa001Serializer(upserted_instances, many=True).data

            return Response({
                'success': True,
                'message': '業務片語存檔成功',
                'upserted_records': upserted_records
            })
        except Exception as e:
            return Response({'success': False, 'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)



class Sa006ViewSet(BaseDictionaryViewSet):
    """
    sa006 其他費用設定
    訂單 (sa030) / 預告訂單 (sa020) 附加費用項目與公式設定。
    """
    program_id = 'w_sa006'
    queryset = Sa006.objects.all()
    serializer_class = Sa006Serializer



class Sa007ViewSet(BaseDictionaryViewSet):
    """
    sa007 報價其他費用設定
    報價單 (sa010) 所屬其他附加費用項目設定。
    """
    program_id = 'w_sa007'
    queryset = Sa007.objects.all()
    serializer_class = Sa007Serializer





from rest_framework import viewsets
from api.modules.sa.models import *
from api.modules.sa.serializers import *
from api.modules.common.views import BaseDictionaryViewSet

class Sa005ViewSet(BaseDictionaryViewSet):
    """
    sa005 Assortment 尺碼配比設定
    訂單裝筱配比設定，包含 22 個尺碼的雙數展開。
    """
    program_id = 'w_sa005'
    queryset = Sa005.objects.all()
    serializer_class = Sa005Serializer

