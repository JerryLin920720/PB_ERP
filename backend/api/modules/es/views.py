from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from api.modules.es.models import *
from api.modules.es.serializers import *

class Es101ViewSet(viewsets.ModelViewSet):
    """員工帳號基本資料 ViewSet"""
    program_id = 'w_es101'
    queryset = Es101.objects.all()
    serializer_class = Es101Serializer

    def perform_create(self, serializer):
        employeeno = self.request.data.get('employeeno', '').upper()
        serializer.save(employeeno=employeeno)

    def perform_update(self, serializer):
        employeeno = self.request.data.get('employeeno', '').upper()
        serializer.save(employeeno=employeeno)

    @action(detail=False, methods=['post'], url_path='deep_save')
    def deep_save(self, request):
        data = request.data
        master_data = data.get('master', {})
        educations_data = data.get('educations', [])
        experiences_data = data.get('experiences', [])
        families_data = data.get('families', [])

        try:
            with transaction.atomic():
                # 1. Save or Update Master (Es101)
                master_obj = None
                if master_data and master_data.get('gkey'):
                    gkey = master_data.get('gkey')
                    if str(gkey).startswith('temp_'):
                        # Create new master
                        master_data.pop('gkey', None)
                        employeeno = master_data.get('employeeno', '').upper()
                        master_data['employeeno'] = employeeno
                        serializer = self.get_serializer(data=master_data)
                        serializer.is_valid(raise_exception=True)
                        master_obj = serializer.save()
                    else:
                        # Update existing master
                        inst = Es101.objects.select_for_update().get(pk=gkey)
                        employeeno = master_data.get('employeeno', inst.employeeno).upper()
                        master_data['employeeno'] = employeeno
                        serializer = self.get_serializer(inst, data=master_data, partial=True)
                        serializer.is_valid(raise_exception=True)
                        master_obj = serializer.save()

                if master_obj:
                    # 2. Sync Educations (Es102)
                    keep_edu_keys = []
                    for item in educations_data:
                        edu_gkey = item.get('gkey')
                        item['es101gkey'] = master_obj.gkey
                        if not edu_gkey or str(edu_gkey).startswith('temp_'):
                            item.pop('gkey', None)
                            edu_ser = Es102Serializer(data=item)
                            edu_ser.is_valid(raise_exception=True)
                            edu_obj = edu_ser.save()
                            keep_edu_keys.append(edu_obj.gkey)
                        else:
                            edu_inst = Es102.objects.get(pk=edu_gkey)
                            edu_ser = Es102Serializer(edu_inst, data=item, partial=True)
                            edu_ser.is_valid(raise_exception=True)
                            edu_obj = edu_ser.save()
                            keep_edu_keys.append(edu_obj.gkey)
                    Es102.objects.filter(es101gkey=master_obj.gkey).exclude(gkey__in=keep_edu_keys).delete()

                    # 3. Sync Experiences (Es103)
                    keep_exp_keys = []
                    for item in experiences_data:
                        exp_gkey = item.get('gkey')
                        item['es101gkey'] = master_obj.gkey
                        if not exp_gkey or str(exp_gkey).startswith('temp_'):
                            item.pop('gkey', None)
                            exp_ser = Es103Serializer(data=item)
                            exp_ser.is_valid(raise_exception=True)
                            exp_obj = exp_ser.save()
                            keep_exp_keys.append(exp_obj.gkey)
                        else:
                            exp_inst = Es103.objects.get(pk=exp_gkey)
                            exp_ser = Es103Serializer(exp_inst, data=item, partial=True)
                            exp_ser.is_valid(raise_exception=True)
                            exp_obj = exp_ser.save()
                            keep_exp_keys.append(exp_obj.gkey)
                    Es103.objects.filter(es101gkey=master_obj.gkey).exclude(gkey__in=keep_exp_keys).delete()

                    # 4. Sync Families (Es104)
                    keep_fam_keys = []
                    for item in families_data:
                        fam_gkey = item.get('gkey')
                        item['es101gkey'] = master_obj.gkey
                        if not fam_gkey or str(fam_gkey).startswith('temp_'):
                            item.pop('gkey', None)
                            fam_ser = Es104Serializer(data=item)
                            fam_ser.is_valid(raise_exception=True)
                            fam_obj = fam_ser.save()
                            keep_fam_keys.append(fam_obj.gkey)
                        else:
                            fam_inst = Es104.objects.get(pk=fam_gkey)
                            fam_ser = Es104Serializer(fam_inst, data=item, partial=True)
                            fam_ser.is_valid(raise_exception=True)
                            fam_obj = fam_ser.save()
                            keep_fam_keys.append(fam_obj.gkey)
                    Es104.objects.filter(es101gkey=master_obj.gkey).exclude(gkey__in=keep_fam_keys).delete()

            master_serializer = self.get_serializer(master_obj)
            return Response({
                "success": True,
                "message": "員工帳號基本資料及明細儲存成功！",
                "master": master_serializer.data
            })
        except Exception as e:
            return Response({
                "success": False,
                "detail": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

class Es102ViewSet(viewsets.ModelViewSet):
    """員工學歷 ViewSet (明細：隸屬員工資料管理)"""
    program_id = 'w_es101'  # 明細：隸屬 Es101 員工帳號主檔
    queryset = Es102.objects.all()
    serializer_class = Es102Serializer

    def get_queryset(self):
        queryset = Es102.objects.all()
        es101gkey = self.request.query_params.get('es101gkey')
        if es101gkey:
            queryset = queryset.filter(es101gkey=es101gkey)
        return queryset

class Es103ViewSet(viewsets.ModelViewSet):
    """員工經歷 ViewSet (明細：隸屬員工資料管理)"""
    program_id = 'w_es101'  # 明細：隸屬 Es101 員工帳號主檔
    queryset = Es103.objects.all()
    serializer_class = Es103Serializer

    def get_queryset(self):
        queryset = Es103.objects.all()
        es101gkey = self.request.query_params.get('es101gkey')
        if es101gkey:
            queryset = queryset.filter(es101gkey=es101gkey)
        return queryset

class Es104ViewSet(viewsets.ModelViewSet):
    """員工眷屬 ViewSet (明細：隸屬員工資料管理)"""
    program_id = 'w_es101'  # 明細：隸屬 Es101 員工帳號主檔
    queryset = Es104.objects.all()
    serializer_class = Es104Serializer

    def get_queryset(self):
        queryset = Es104.objects.all()
        es101gkey = self.request.query_params.get('es101gkey')
        if es101gkey:
            queryset = queryset.filter(es101gkey=es101gkey)
        return queryset


