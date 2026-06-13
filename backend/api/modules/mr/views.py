from rest_framework.decorators import action
from rest_framework import viewsets
from api.modules.common.views import BaseDictionaryViewSet
from api.common.permissions.program_permission import HasProgramPermission
from api.models import Phrase
from api.serializers import PhraseSerializer
from .models import *
from .serializers import *

class Mr001ViewSet(BaseDictionaryViewSet):
    """資材片語字庫設定 (MR001)"""
    permission_classes = [HasProgramPermission]
    program_id = 'w_mr001'
    queryset = Phrase.objects.all()
    serializer_class = PhraseSerializer

    def get_queryset(self):
        return Phrase.objects.filter(f2type='MR').order_by('serialno')

    def perform_create(self, serializer):
        serializer.save(f2type='MR')

    @action(detail=False, methods=['post'], url_path='bulk_save')
    def bulk_save(self, request):
        if 'upsert' in request.data:
            for item in request.data['upsert']:
                item['f2type'] = 'MR'
        return super().bulk_save(request)



class Mr002ViewSet(BaseDictionaryViewSet):
    """顏色大類設定 (MR002)"""
    permission_classes = [HasProgramPermission]
    program_id = 'w_mr002'
    queryset = Mr002.objects.all()
    serializer_class = Mr002Serializer



class Mr020ViewSet(BaseDictionaryViewSet):
    """材料厚度設定 (MR020)"""
    permission_classes = [HasProgramPermission]
    program_id = 'w_mr020'
    queryset = Mr020.objects.all()
    serializer_class = Mr020Serializer



class Mr025ViewSet(BaseDictionaryViewSet):
    """材料幅度設定 (MR025)"""
    permission_classes = [HasProgramPermission]
    program_id = 'w_mr025'
    queryset = Mr025.objects.all()
    serializer_class = Mr025Serializer



class Mr031ViewSet(BaseDictionaryViewSet):
    """加工方式設定 (MR031)"""
    permission_classes = [HasProgramPermission]
    program_id = 'w_mr031'
    queryset = Mr031.objects.all()
    serializer_class = Mr031Serializer


from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import parser_classes
import os
import uuid

from django.db import DatabaseError

def check_mr035_exists_and_filter(**kwargs):
    try:
        return Mr035.objects.filter(**kwargs).exists()
    except DatabaseError as e:
        err_msg = str(e).lower()
        if 'relation "mr035" does not exist' in err_msg or 'no such table: mr035' in err_msg or ('relation' in err_msg and 'not exist' in err_msg):
            # If the mr035 table doesn't exist locally yet, assume no references exist
            return False
        raise


class Mr010ViewSet(viewsets.ViewSet):
    """Mock顏色明細設定 (MR010)"""
    program_id = 'w_mr010'

    def list(self, request):
        return Response([
            {"gkey": "clr_gkey_1", "colorcode": "01", "colorname": "紅色"},
            {"gkey": "clr_gkey_2", "colorcode": "02", "colorname": "黑色"},
            {"gkey": "clr_gkey_3", "colorcode": "03", "colorname": "白色"},
            {"gkey": "clr_gkey_4", "colorcode": "04", "colorname": "藍色"},
            {"gkey": "clr_gkey_5", "colorcode": "05", "colorname": "黃色"},
        ])


class Mr015ViewSet(BaseDictionaryViewSet):
    """材料大類設定 (MR015)"""
    permission_classes = [HasProgramPermission]
    program_id = 'w_mr015'
    queryset = Mr015.objects.all()
    serializer_class = Mr015Serializer

    def perform_destroy(self, instance):
        if check_mr035_exists_and_filter(mr015gkey=instance.gkey):
            raise ValidationError("此材料大類已被料號主檔引用，不可刪除！")
        super().perform_destroy(instance)

    def perform_update(self, serializer):
        instance = serializer.instance
        if 'matno' in serializer.validated_data and serializer.validated_data['matno'] != instance.matno:
            if check_mr035_exists_and_filter(mr015gkey=instance.gkey):
                raise ValidationError("此材料大類已被料號主檔引用，不可修改大類代號！")
        super().perform_update(serializer)

    @action(detail=False, methods=['post'], url_path='bulk_save')
    def bulk_save(self, request):
        delete_keys = request.data.get('delete', [])
        upsert_data = request.data.get('upsert', [])

        if delete_keys:
            if check_mr035_exists_and_filter(mr015gkey__in=delete_keys):
                raise ValidationError("有材料大類已被料號主檔引用，不可刪除！")

        for item in upsert_data:
            gkey = item.get('gkey')
            if gkey and not str(gkey).startswith('temp_'):
                try:
                    instance = Mr015.objects.get(gkey=gkey)
                    new_matno = item.get('matno')
                    if new_matno and new_matno != instance.matno:
                        if check_mr035_exists_and_filter(mr015gkey=gkey):
                            raise ValidationError(f"材料大類 '{instance.matno}' 已被料號主檔引用，不可修改大類代號！")
                except Mr015.DoesNotExist:
                    pass

        return super().bulk_save(request)


class Mr016ViewSet(BaseDictionaryViewSet):
    """材料小類設定 (MR016)"""
    permission_classes = [HasProgramPermission]
    program_id = 'w_mr015'
    queryset = Mr016.objects.all()
    serializer_class = Mr016Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        mr015gkey = self.request.query_params.get('mr015gkey')
        if mr015gkey:
            qs = qs.filter(mr015gkey=mr015gkey)
        return qs

    def perform_destroy(self, instance):
        if check_mr035_exists_and_filter(mr016gkey=instance.gkey):
            raise ValidationError("此材料小類已被料號主檔引用，不可刪除！")
        super().perform_destroy(instance)

    def perform_update(self, serializer):
        instance = serializer.instance
        if 'smatno' in serializer.validated_data and serializer.validated_data['smatno'] != instance.smatno:
            if check_mr035_exists_and_filter(mr016gkey=instance.gkey):
                raise ValidationError("此材料小類已被料號主檔引用，不可修改小類代號！")
        super().perform_update(serializer)

    @action(detail=False, methods=['post'], url_path='bulk_save')
    def bulk_save(self, request):
        print('[MR016 REQUEST DATA]', request.data)
        delete_keys = request.data.get('delete', [])
        upsert_data = request.data.get('upsert', [])

        if delete_keys:
            if check_mr035_exists_and_filter(mr016gkey__in=delete_keys):
                raise ValidationError("有材料小類已被料號主檔引用，不可刪除！")

        for item in upsert_data:
            gkey = item.get('gkey')
            if gkey and not str(gkey).startswith('temp_'):
                try:
                    instance = Mr016.objects.get(gkey=gkey)
                    new_smatno = item.get('smatno')
                    if new_smatno and new_smatno != instance.smatno:
                        if check_mr035_exists_and_filter(mr016gkey=gkey):
                            raise ValidationError(f"材料小類 '{instance.smatno}' 已被料號主檔引用，不可修改小類代號！")
                except Mr016.DoesNotExist:
                    pass

        return super().bulk_save(request)


class Mr030ViewSet(BaseDictionaryViewSet):
    """材料紋路設定 (MR030)"""
    permission_classes = [HasProgramPermission]
    program_id = 'w_mr030'
    queryset = Mr030.objects.all()
    serializer_class = Mr030Serializer

    validation_config = {
        "required_fields": [
            {"field": "graincode", "label": "代號"},
            {"field": "cname", "label": "中文名稱"}
        ],
        "string_rules": [
            {"field": "graincode", "label": "代號", "max_length": 6},
            {"field": "cname", "label": "中文名稱", "max_length": 60}
        ]
    }

    def perform_destroy(self, instance):
        if check_mr035_exists_and_filter(mr030gkey=instance.gkey):
            raise ValidationError("此材料紋路已被料號主檔引用，不可刪除！")
        super().perform_destroy(instance)

    def perform_update(self, serializer):
        instance = serializer.instance
        if 'veinno' in serializer.validated_data and serializer.validated_data['veinno'] != instance.veinno:
            if check_mr035_exists_and_filter(mr030gkey=instance.gkey):
                raise ValidationError("此材料紋路已被料號主檔引用，不可修改紋路代號！")
        super().perform_update(serializer)

    @action(detail=False, methods=['post'], url_path='bulk_save')
    def bulk_save(self, request):
        delete_keys = request.data.get('delete', [])
        upsert_data = request.data.get('upsert', [])

        if delete_keys:
            if check_mr035_exists_and_filter(mr030gkey__in=delete_keys):
                raise ValidationError("有材料紋路已被料號主檔引用，不可刪除！")

        for item in upsert_data:
            gkey = item.get('gkey')
            if gkey and not str(gkey).startswith('temp_'):
                try:
                    instance = Mr030.objects.get(gkey=gkey)
                    new_veinno = item.get('veinno')
                    if new_veinno and new_veinno != instance.veinno:
                        if check_mr035_exists_and_filter(mr030gkey=gkey):
                            raise ValidationError(f"材料紋路 '{instance.veinno}' 已被料號主檔引用，不可修改紋路代號！")
                except Mr030.DoesNotExist:
                    pass

        return super().bulk_save(request)


class Mr035ViewSet(viewsets.ViewSet):
    """Mock材料品名設定 (MR035)"""
    program_id = 'w_mr035'

    def list(self, request):
        return Response([
            {"gkey": "mat_gkey_1", "mstkno": "MAT-001", "mname": "皮革"},
            {"gkey": "mat_gkey_2", "mstkno": "MAT-002", "mname": "網布"},
            {"gkey": "mat_gkey_3", "mstkno": "MAT-003", "mname": "橡膠"},
            {"gkey": "mat_gkey_4", "mstkno": "MAT-004", "mname": "帆布"},
            {"gkey": "mat_gkey_5", "mstkno": "MAT-005", "mname": "PU"},
        ])


