from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from rest_framework import status, viewsets
from django.db.models import Max
from django.db import transaction
from .models import (
    Ab230, Ab231,
    Ba001, Ba002, Ba003, Ba004, Ba005, Ba009, Ba010, Ba011, Ba012, Ba013, Ba014, Ba015, Ba016, Ba020, Ba040,
    Ba045, Ba050, Ba055, Ba060, Ba061, Ba065, Ba070, Ba075, Ba076,
    Ba080, Ba085, Ba090, Ba091, Ba092, SysAccount, Es101, Es102, Es103, Es104,
    Dp001, Dp002, Dp003, Dp004, Dp004A, Dp005, Dp006, Dp008, Dp009, Dp007,
    Dp010, Dp015, Dp020,
    Dp016, Dp017, Dp018,
    Dp011, Dp012, Dp013, Dp014, Dp023,
    Dp025, Dp026, Dp027, Dp028,
    Dp030, Dp031, Dp032, Dp033, Dp034, Dp035, Dp104,
    Dp040, Dp041, Dp042, Dp043, Dp080, Dp081, Dp082, Dp100, Dp101
)
from .serializers import (
    Ab230Serializer, Ab231Serializer,
    Ba001Serializer, Ba002Serializer, Ba003Serializer, Ba004Serializer, Ba005Serializer, Ba009Serializer, Ba020Serializer, Ba040Serializer,
    Ba045Serializer, Ba050Serializer, Ba055Serializer, Ba060Serializer, Ba061Serializer, Ba065Serializer, Ba070Serializer,
    Ba075Serializer, Ba076Serializer, Ba080Serializer, Ba090Serializer, Ba091Serializer,
    Ba092Serializer, Ba015Serializer, Ba016Serializer,
    Ba010Serializer, Ba011Serializer, Ba012Serializer, Ba013Serializer, Ba014Serializer,
    Ba085Serializer, SysAccountSerializer, Es101Serializer, Es102Serializer, Es103Serializer, Es104Serializer,
    Dp001Serializer, Dp002Serializer, Dp003Serializer, Dp004Serializer, Dp004ASerializer, Dp005Serializer, Dp006Serializer, Dp008Serializer, Dp009Serializer,
    Dp007Serializer, Dp010Serializer, Dp015Serializer, Dp020Serializer,
    Dp016Serializer, Dp017Serializer, Dp018Serializer,
    Dp011Serializer, Dp012Serializer, Dp013Serializer, Dp014Serializer, Dp023Serializer,
    Dp025Serializer, Dp026Serializer, Dp027Serializer, Dp028Serializer,
    Dp030Serializer, Dp031Serializer, Dp032Serializer, Dp033Serializer, Dp034Serializer, Dp035Serializer, Dp104Serializer,
    Dp040Serializer, Dp041Serializer, Dp042Serializer, Dp043Serializer,
    Dp080Serializer, Dp081Serializer, Dp082Serializer,
    Dp100Serializer, Dp101Serializer
)

@api_view(['GET'])
def system_health(request):
    return Response({
        "status": "online",
        "system": "PB ERP Backend Engine",
        "version": "1.0.0-prototype",
        "message": "Backend infrastructure is responding normally."
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
def dashboard_stats(request):
    return Response({
        "success": True,
        "data": {
            "daily_orders": 32,
            "daily_orders_growth": 12.5,
            "inventory_alerts": 8,
            "monthly_pairs": 152400,
            "shipping_on_time_rate": 98.7
        }
    }, status=status.HTTP_200_OK)


class Ba001ViewSet(viewsets.ModelViewSet):
    """
    個人片語字庫 API 視圖，全面還原 PB 業務邏輯 (特規：具有 ADMIN 人員資料隔離)
    """
    serializer_class = Ba001Serializer
    
    def get_queryset(self):
        return Ba001.objects.filter(es101gkey='ADMIN')

    @action(detail=False, methods=['post'], url_path='bulk_save')
    def bulk_save(self, request):
        upsert_data = request.data.get('upsert', [])
        delete_keys = request.data.get('delete', [])
        try:
            with transaction.atomic():
                if delete_keys:
                    Ba001.objects.filter(gkey__in=delete_keys, es101gkey='ADMIN').delete()
                current_max = self.get_queryset().aggregate(Max('serialno'))['serialno__max'] or 0
                for item in upsert_data:
                    data_copy = {k: v for k, v in item.items()}
                    gkey = data_copy.get('gkey')
                    if gkey and str(gkey).startswith('temp_'): 
                        data_copy.pop('gkey', None)
                        data_copy.pop('serialno', None)
                        data_copy.pop('es101gkey', None)
                        current_max += 1
                        serializer = Ba001Serializer(data=data_copy)
                        serializer.is_valid(raise_exception=True)
                        serializer.save(es101gkey='ADMIN', serialno=current_max)
                    elif gkey:
                        data_copy.pop('serialno', None)
                        data_copy.pop('es101gkey', None)
                        instance = Ba001.objects.get(gkey=gkey, es101gkey='ADMIN')
                        serializer = Ba001Serializer(instance, data=data_copy, partial=True)
                        serializer.is_valid(raise_exception=True)
                        serializer.save()
            return Response({"success": True, "message": "個人片語存檔成功"})
        except Exception as e:
            return Response({"success": False, "detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class BaseDictionaryViewSet(viewsets.ModelViewSet):
    """
    🚀 通用字典 API 視圖基底 (100% DRY)
    自動繼承高度相容 PB 髒資料批次交易存檔演算法。
    """
    def get_queryset(self):
        try:
            self.queryset.model._meta.get_field('serialno')
            return self.queryset.order_by('serialno')
        except Exception:
            return self.queryset.all()

    @action(detail=False, methods=['post'], url_path='bulk_save')
    def bulk_save(self, request):
        upsert_data = request.data.get('upsert', [])
        delete_keys = request.data.get('delete', [])
        model_cls = self.queryset.model
        serializer_cls = self.get_serializer_class()

        try:
            # 動態偵測物理模型是否包含 serialno
            has_serialno = False
            try:
                model_cls._meta.get_field('serialno')
                has_serialno = True
            except Exception:
                has_serialno = False

            with transaction.atomic():
                # 1. 物理刪除
                if delete_keys:
                    model_cls.objects.filter(gkey__in=delete_keys).delete()
                
                # 2. 物理新增或異動修改
                current_max = 0
                if has_serialno:
                    current_max = self.queryset.aggregate(Max('serialno'))['serialno__max'] or 0
                
                upserted_instances = []
                for item in upsert_data:
                    data_copy = {k: v for k, v in item.items()}
                    gkey = data_copy.get('gkey')
                    
                    if gkey and str(gkey).startswith('temp_'): 
                        # 自動新增 (觸發 generate_pb_gkey)
                        data_copy.pop('gkey', None)
                        provided_serialno = data_copy.pop('serialno', None)
                        
                        serializer = serializer_cls(data=data_copy)
                        serializer.is_valid(raise_exception=True)
                        if has_serialno:
                            # 💡 物理優化：如果前端有給有效數字序號則優先採用 (支持手動排序)
                            try:
                                final_sn = int(provided_serialno)
                            except (TypeError, ValueError):
                                current_max += 1
                                final_sn = current_max
                            instance = serializer.save(serialno=final_sn)
                        else:
                            instance = serializer.save()
                        upserted_instances.append(instance)
                    elif gkey:
                        # 單行物理更新
                        # 💡 物理優化：不再強制 pop serialno，允許前端異動排序
                        instance = model_cls.objects.get(gkey=gkey)
                        serializer = serializer_cls(instance, data=data_copy, partial=True)
                        serializer.is_valid(raise_exception=True)
                        instance = serializer.save()
                        upserted_instances.append(instance)
                    else:
                        # 例外防呆
                        data_copy.pop('serialno', None)
                        serializer = serializer_cls(data=data_copy)
                        serializer.is_valid(raise_exception=True)
                        if has_serialno:
                            current_max += 1
                            instance = serializer.save(serialno=current_max)
                        else:
                            instance = serializer.save()
                        upserted_instances.append(instance)
                
                # 回傳序列化後的結果，讓前端獲取新產生的 gkey
                upserted_records = serializer_cls(upserted_instances, many=True).data
                        
            return Response({
                "success": True, 
                "message": "通用字典資料批次交易成功",
                "upserted_records": upserted_records
            })
        except Exception as e:
            # 強迫報出具體 unique 錯誤等細節
            return Response({"success": False, "detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# 💎 具體實作：極速宣告
class Ba002ViewSet(BaseDictionaryViewSet):
    """國家基本資料"""
    queryset = Ba002.objects.all()
    serializer_class = Ba002Serializer

class Ba003ViewSet(BaseDictionaryViewSet):
    """產地基本資料"""
    queryset = Ba003.objects.all()
    serializer_class = Ba003Serializer

class Ba004ViewSet(BaseDictionaryViewSet):
    """區域基本資料"""
    queryset = Ba004.objects.all()
    serializer_class = Ba004Serializer

class Ba005ViewSet(viewsets.ModelViewSet):
    """公司基本資料設定 (標準 REST，因為無 serialno 且有特規 Form)"""
    queryset = Ba005.objects.all()
    serializer_class = Ba005Serializer

class Ba009ViewSet(BaseDictionaryViewSet):
    """品牌資料"""
    queryset = Ba009.objects.all()
    serializer_class = Ba009Serializer

class Ba020ViewSet(BaseDictionaryViewSet):
    """材料供應商類別設定"""
    queryset = Ba020.objects.all()
    serializer_class = Ba020Serializer

class Ba040ViewSet(viewsets.ModelViewSet):
    """銀行基本資料設定 (標準 REST)"""
    queryset = Ba040.objects.all()
    serializer_class = Ba040Serializer

class Ba045ViewSet(BaseDictionaryViewSet):
    """部門設定"""
    queryset = Ba045.objects.all()
    serializer_class = Ba045Serializer

class Ba050ViewSet(BaseDictionaryViewSet):
    """職務設定"""
    queryset = Ba050.objects.all()
    serializer_class = Ba050Serializer

class Ba055ViewSet(BaseDictionaryViewSet):
    """季節設定"""
    queryset = Ba055.objects.all()
    serializer_class = Ba055Serializer

class Ba060ViewSet(viewsets.ModelViewSet):
    """全域幣別主檔"""
    queryset = Ba060.objects.all()
    serializer_class = Ba060Serializer

    def perform_create(self, serializer):
        current_max = Ba060.objects.aggregate(Max('serialno'))['serialno__max'] or 0
        serializer.save(serialno=current_max + 1)

class Ba061ViewSet(viewsets.ModelViewSet):
    """全域幣別歷史匯率"""
    queryset = Ba061.objects.all()
    serializer_class = Ba061Serializer

    def get_queryset(self):
        queryset = Ba061.objects.all()
        ba060gkey = self.request.query_params.get('ba060gkey')
        if ba060gkey:
            queryset = queryset.filter(ba060gkey=ba060gkey)
        return queryset

class Ab230ViewSet(viewsets.ModelViewSet):
    """財務交叉匯率主檔"""
    queryset = Ab230.objects.all()
    serializer_class = Ab230Serializer

    def perform_create(self, serializer):
        current_max = Ab230.objects.aggregate(Max('serialno'))['serialno__max'] or 0
        serializer.save(serialno=current_max + 1)

class Ab231ViewSet(viewsets.ModelViewSet):
    """財務交叉匯率明細檔"""
    queryset = Ab231.objects.all()
    serializer_class = Ab231Serializer

    def get_queryset(self):
        queryset = Ab231.objects.all()
        ab230gkey = self.request.query_params.get('ab230gkey')
        if ab230gkey:
            queryset = queryset.filter(ab230gkey=ab230gkey)
        return queryset

    def perform_create(self, serializer):
        ab230gkey = self.request.data.get('ab230gkey')
        current_max = Ab231.objects.filter(ab230gkey=ab230gkey).aggregate(Max('serialno'))['serialno__max'] or 0
        serializer.save(serialno=current_max + 1)

class Ba065ViewSet(BaseDictionaryViewSet):
    """交易港口"""
    queryset = Ba065.objects.all()
    serializer_class = Ba065Serializer

class Ba070ViewSet(BaseDictionaryViewSet):
    """交易條件"""
    queryset = Ba070.objects.all()
    serializer_class = Ba070Serializer

class Ba075ViewSet(BaseDictionaryViewSet):
    """付款條件大類"""
    queryset = Ba075.objects.all()
    serializer_class = Ba075Serializer

class Ba080ViewSet(BaseDictionaryViewSet):
    """配件設定"""
    queryset = Ba080.objects.all()
    serializer_class = Ba080Serializer

class Ba090ViewSet(BaseDictionaryViewSet):
    """快遞公司"""
    queryset = Ba090.objects.all()
    serializer_class = Ba090Serializer

class Ba091ViewSet(BaseDictionaryViewSet):
    """運輸方式"""
    queryset = Ba091.objects.all()
    serializer_class = Ba091Serializer

class Ba092ViewSet(BaseDictionaryViewSet):
    """單位設定"""
    queryset = Ba092.objects.all()
    serializer_class = Ba092Serializer


class Ba015ViewSet(viewsets.ModelViewSet):
    """供應鏈實體 (工廠/材料商/供應商) 三合一多態 ViewSet"""
    queryset = Ba015.objects.all()
    serializer_class = Ba015Serializer

    def get_queryset(self):
        entity_type = self.request.query_params.get('type', '1')
        qs = super().get_queryset().filter(type=entity_type)
        if entity_type == '1':
            # 工廠類型僅選取總廠 (parentgkey 為空)，以便做自引用明細
            qs = qs.filter(parentgkey__isnull=True)
        return qs

    def perform_create(self, serializer):
        entity_type = self.request.query_params.get('type', '1')
        # 自動強轉大寫 factno，並帶入 type
        factno = self.request.data.get('factno', '').upper()
        serializer.save(type=entity_type, factno=factno)

    def perform_update(self, serializer):
        factno = self.request.data.get('factno', '').upper()
        serializer.save(factno=factno)


class Ba016ViewSet(viewsets.ModelViewSet):
    """統一聯絡人 ViewSet"""
    queryset = Ba016.objects.all()
    serializer_class = Ba016Serializer

    def get_queryset(self):
        queryset = Ba016.objects.all()
        ba015gkey = self.request.query_params.get('ba015gkey')
        if ba015gkey:
            queryset = queryset.filter(ba015gkey=ba015gkey)
        return queryset


class Ba010ViewSet(viewsets.ModelViewSet):
    """製鞋客戶大主檔 ViewSet"""
    queryset = Ba010.objects.all()
    serializer_class = Ba010Serializer

    def perform_create(self, serializer):
        custno = self.request.data.get('custno', '').upper()
        serializer.save(custno=custno)

    def perform_update(self, serializer):
        custno = self.request.data.get('custno', '').upper()
        serializer.save(custno=custno)

    @action(detail=False, methods=['post'], url_path='deep_save')
    def deep_save(self, request):
        """
        🚀 原子交易同步引擎：客戶主檔 + 經營品牌 (ba011) + 指定 QC (ba012) + 客供配件 (ba013) + 業務窗口 (ba014)
        """
        data = request.data
        master_data = data.get('master', {})
        brands = data.get('brands', [])
        qcs = data.get('qcs', [])
        accessories = data.get('accessories', [])
        contacts = data.get('contacts', [])

        try:
            with transaction.atomic():
                # 1. 保存客戶主檔 Ba010
                gkey = master_data.get('gkey')
                if gkey and not str(gkey).startswith('temp_'):
                    instance = Ba010.objects.get(gkey=gkey)
                    serializer = Ba010Serializer(instance, data=master_data, partial=True)
                else:
                    master_data.pop('gkey', None)
                    serializer = Ba010Serializer(data=master_data)
                
                serializer.is_valid(raise_exception=True)
                custno_upper = master_data.get('custno', '').upper()
                master_obj = serializer.save(custno=custno_upper)

                # 2. 保存 ba011 客戶經營品牌
                Ba011.objects.filter(ba010gkey=master_obj).delete()
                for b_item in brands:
                    if not b_item.get('ba009gkey'):
                        continue
                    b_item.pop('gkey', None)
                    b_item['ba010gkey'] = master_obj.gkey
                    b_ser = Ba011Serializer(data=b_item)
                    b_ser.is_valid(raise_exception=True)
                    b_ser.save()

                # 3. 保存 ba012 客戶 QC 驗貨官
                Ba012.objects.filter(ba010gkey=master_obj).delete()
                for q_item in qcs:
                    if not q_item.get('qccontact'):
                        continue
                    q_item.pop('gkey', None)
                    q_item['ba010gkey'] = master_obj.gkey
                    # 避免空值
                    if not q_item.get('tel'): q_item['tel'] = None
                    if not q_item.get('fax'): q_item['fax'] = None
                    if not q_item.get('mobilephone'): q_item['mobilephone'] = None
                    if not q_item.get('email'): q_item['email'] = None

                    q_ser = Ba012Serializer(data=q_item)
                    q_ser.is_valid(raise_exception=True)
                    q_ser.save()

                # 4. 保存 ba013 客戶提供配件
                Ba013.objects.filter(ba010gkey=master_obj).delete()
                for idx, a_item in enumerate(accessories):
                    if not a_item.get('ba080gkey'):
                        continue
                    a_item.pop('gkey', None)
                    a_item['ba010gkey'] = master_obj.gkey
                    a_item['serialno'] = idx + 1
                    # 避免空值
                    if not a_item.get('description'): a_item['description'] = None
                    if not a_item.get('unit'): a_item['unit'] = '1'
                    if not a_item.get('pairs'): a_item['pairs'] = 0
                    if not a_item.get('supplytype'): a_item['supplytype'] = '1'

                    a_ser = Ba013Serializer(data=a_item)
                    a_ser.is_valid(raise_exception=True)
                    a_ser.save()

                # 5. 保存 ba014 客戶業務聯絡窗口
                Ba014.objects.filter(ba010gkey=master_obj).delete()
                for c_item in contacts:
                    if not c_item.get('contact'):
                        continue
                    c_item.pop('gkey', None)
                    c_item['ba010gkey'] = master_obj.gkey
                    # 避免空值
                    if not c_item.get('department'): c_item['department'] = None
                    if not c_item.get('jobposition'): c_item['jobposition'] = None
                    if not c_item.get('tel'): c_item['tel'] = None
                    if not c_item.get('fax'): c_item['fax'] = None
                    if not c_item.get('mobilephone'): c_item['mobilephone'] = None
                    if not c_item.get('email'): c_item['email'] = None

                    c_ser = Ba014Serializer(data=c_item)
                    c_ser.is_valid(raise_exception=True)
                    c_ser.save()

            return Response({
                "success": True,
                "message": "客戶主從明細原子儲存成功！",
                "gkey": master_obj.gkey
            })
        except Exception as e:
            return Response({"success": False, "detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class Ba011ViewSet(viewsets.ModelViewSet):
    """客戶經營品牌 ViewSet"""
    queryset = Ba011.objects.all()
    serializer_class = Ba011Serializer

    def get_queryset(self):
        queryset = Ba011.objects.all()
        ba010gkey = self.request.query_params.get('ba010gkey')
        if ba010gkey:
            queryset = queryset.filter(ba010gkey=ba010gkey)
        return queryset


class Ba012ViewSet(viewsets.ModelViewSet):
    """客戶 QC 驗貨官 ViewSet"""
    queryset = Ba012.objects.all()
    serializer_class = Ba012Serializer

    def get_queryset(self):
        queryset = Ba012.objects.all()
        ba010gkey = self.request.query_params.get('ba010gkey')
        if ba010gkey:
            queryset = queryset.filter(ba010gkey=ba010gkey)
        return queryset


class Ba013ViewSet(viewsets.ModelViewSet):
    """客戶提供配件 ViewSet"""
    queryset = Ba013.objects.all()
    serializer_class = Ba013Serializer

    def get_queryset(self):
        queryset = Ba013.objects.all()
        ba010gkey = self.request.query_params.get('ba010gkey')
        if ba010gkey:
            queryset = queryset.filter(ba010gkey=ba010gkey)
        return queryset

    def perform_create(self, serializer):
        ba010gkey = self.request.data.get('ba010gkey')
        current_max = Ba013.objects.filter(ba010gkey=ba010gkey).aggregate(Max('serialno'))['serialno__max'] or 0
        serializer.save(serialno=current_max + 1)


class Ba014ViewSet(viewsets.ModelViewSet):
    """客戶業務聯絡人 ViewSet"""
    queryset = Ba014.objects.all()
    serializer_class = Ba014Serializer

    def get_queryset(self):
        queryset = Ba014.objects.all()
        ba010gkey = self.request.query_params.get('ba010gkey')
        if ba010gkey:
            queryset = queryset.filter(ba010gkey=ba010gkey)
        return queryset


class Ba085ViewSet(viewsets.ModelViewSet):
    """SIZERUN 尺碼設定 ViewSet"""
    queryset = Ba085.objects.all()
    serializer_class = Ba085Serializer

    def perform_create(self, serializer):
        current_max = Ba085.objects.aggregate(Max('serialno'))['serialno__max'] or 0
        serializer.save(serialno=current_max + 1)


class SysAccountViewSet(viewsets.ModelViewSet):
    """系統帳號授權 ViewSet"""
    queryset = SysAccount.objects.all()
    serializer_class = SysAccountSerializer


class Es101ViewSet(viewsets.ModelViewSet):
    """員工帳號基本資料 ViewSet"""
    queryset = Es101.objects.all()
    serializer_class = Es101Serializer

    def perform_create(self, serializer):
        employeeno = self.request.data.get('employeeno', '').upper()
        serializer.save(employeeno=employeeno)

    def perform_update(self, serializer):
        employeeno = self.request.data.get('employeeno', '').upper()
        serializer.save(employeeno=employeeno)


class Es102ViewSet(viewsets.ModelViewSet):
    """員工學歷 ViewSet"""
    queryset = Es102.objects.all()
    serializer_class = Es102Serializer

    def get_queryset(self):
        queryset = Es102.objects.all()
        es101gkey = self.request.query_params.get('es101gkey')
        if es101gkey:
            queryset = queryset.filter(es101gkey=es101gkey)
        return queryset


class Es103ViewSet(viewsets.ModelViewSet):
    """員工經歷 ViewSet"""
    queryset = Es103.objects.all()
    serializer_class = Es103Serializer

    def get_queryset(self):
        queryset = Es103.objects.all()
        es101gkey = self.request.query_params.get('es101gkey')
        if es101gkey:
            queryset = queryset.filter(es101gkey=es101gkey)
        return queryset


class Es104ViewSet(viewsets.ModelViewSet):
    """員工眷屬 ViewSet"""
    queryset = Es104.objects.all()
    serializer_class = Es104Serializer

    def get_queryset(self):
        queryset = Es104.objects.all()
        es101gkey = self.request.query_params.get('es101gkey')
        if es101gkey:
            queryset = queryset.filter(es101gkey=es101gkey)
        return queryset


# ============================================================================
# 👞 開發部門管理系統 (Product Development) ViewSets
# ============================================================================

class Dp001ViewSet(BaseDictionaryViewSet):
    """
    開發片語字庫 API，模仿 ba001 支援個人隔離，
    因為繼承 BaseDictionaryViewSet，自帶高度相容 PB 的 bulk_save 髒交易存檔演算法。
    """
    queryset = Dp001.objects.all()
    serializer_class = Dp001Serializer

    def get_queryset(self):
        # 模仿 ba001 將其過濾出登入者 'ADMIN' 筆記，物理隔離
        return Dp001.objects.filter(es101gkey='ADMIN').order_by('serialno')

    @action(detail=False, methods=['post'], url_path='bulk_save')
    def bulk_save(self, request):
        # 個人隔離版需覆寫 bulk_save 寫死 es101gkey = 'ADMIN'
        upsert_data = request.data.get('upsert', [])
        delete_keys = request.data.get('delete', [])
        try:
            with transaction.atomic():
                if delete_keys:
                    Dp001.objects.filter(gkey__in=delete_keys, es101gkey='ADMIN').delete()
                
                current_max = Dp001.objects.filter(es101gkey='ADMIN').aggregate(Max('serialno'))['serialno__max'] or 0
                
                for item in upsert_data:
                    data_copy = {k: v for k, v in item.items()}
                    gkey = data_copy.get('gkey')
                    
                    if gkey and str(gkey).startswith('temp_'):
                        data_copy.pop('gkey', None)
                        provided_serialno = data_copy.pop('serialno', None)
                        
                        serializer = Dp001Serializer(data=data_copy)
                        serializer.is_valid(raise_exception=True)
                        
                        try:
                            final_sn = int(provided_serialno)
                        except (TypeError, ValueError):
                            current_max += 1
                            final_sn = current_max
                        
                        serializer.save(es101gkey='ADMIN', serialno=final_sn)
                    elif gkey:
                        # 💡 物理優化：允許更新 serialno
                        data_copy.pop('es101gkey', None)
                        instance = Dp001.objects.get(gkey=gkey, es101gkey='ADMIN')
                        serializer = Dp001Serializer(instance, data=data_copy, partial=True)
                        serializer.is_valid(raise_exception=True)
                        serializer.save()
            return Response({"success": True, "message": "開發片語存檔成功"})
        except Exception as e:
            return Response({"success": False, "detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class Dp002ViewSet(BaseDictionaryViewSet):
    """樣品類別設定 ViewSet"""
    queryset = Dp002.objects.all()
    serializer_class = Dp002Serializer


class Dp003ViewSet(BaseDictionaryViewSet):
    """鞋種類別設定 ViewSet"""
    queryset = Dp003.objects.all()
    serializer_class = Dp003Serializer


class Dp004ViewSet(BaseDictionaryViewSet):
    """鞋種性別 Size Type ViewSet (Master)"""
    queryset = Dp004.objects.all()
    serializer_class = Dp004Serializer

    @action(detail=False, methods=['post'], url_path='deep_save')
    def deep_save(self, request):
        """
        🚀 核心主從同步引擎 (Master-Detail Atomic Sync)
        支援主檔新增/修改，以及明細檔的全面重刷與主檔刪除。
        """
        data = request.data
        master_data = data.get('master', {})
        details_data = data.get('details', [])
        delete_masters = data.get('delete_masters', [])

        try:
            with transaction.atomic():
                # 1. 處理主檔刪除 (Deferred Master Delete)
                if delete_masters:
                    Dp004.objects.filter(gkey__in=delete_masters).delete()
                    # 這裡會連帶觸發資料庫 Cascade Delete 明細，或手動清除
                    Dp004A.objects.filter(dp004gkey__in=delete_masters).delete()
                
                # 2. 處理當前編輯的主檔 (如果沒被刪除)
                master_obj = None
                if master_data and master_data.get('gkey'):
                    gkey = master_data.get('gkey')
                    if str(gkey).startswith('temp_'):
                        # 新增主檔
                        master_data.pop('gkey', None)
                        # 處理序號
                        provided_sn = master_data.pop('serialno', None)
                        try:
                            final_sn = int(provided_sn)
                        except (TypeError, ValueError):
                            max_sn = Dp004.objects.aggregate(Max('serialno'))['serialno__max'] or 0
                            final_sn = max_sn + 1
                        
                        ser = self.get_serializer(data=master_data)
                        ser.is_valid(raise_exception=True)
                        master_obj = ser.save(serialno=final_sn)
                    else:
                        # 更新主檔
                        inst = Dp004.objects.select_for_update().get(pk=gkey)
                        ser = self.get_serializer(inst, data=master_data, partial=True)
                        ser.is_valid(raise_exception=True)
                        master_obj = ser.save()

                # 3. 處理明細檔 (如果主檔存在)
                if master_obj:
                    keep_keys = []
                    for idx, det in enumerate(details_data):
                        det['dp004gkey'] = master_obj.pk
                        det_gkey = det.get('gkey')
                        
                        if not det_gkey or str(det_gkey).startswith('temp_'):
                            det.pop('gkey', None)
                            # 優先採用前端傳入的序號，否則使用索引
                            provided_sn = det.pop('serialno', None)
                            try:
                                final_sn = int(provided_sn)
                            except (TypeError, ValueError):
                                final_sn = idx + 1
                            
                            d_ser = Dp004ASerializer(data=det)
                            d_ser.is_valid(raise_exception=True)
                            saved_d = d_ser.save(serialno=final_sn)
                            keep_keys.append(saved_d.pk)
                        else:
                            d_inst = Dp004A.objects.select_for_update().get(pk=det_gkey)
                            d_ser = Dp004ASerializer(d_inst, data=det, partial=True)
                            d_ser.is_valid(raise_exception=True)
                            saved_d = d_ser.save()
                            keep_keys.append(saved_d.pk)

                    # 物理抹除該主檔下不再需要的明細
                    Dp004A.objects.filter(dp004gkey=master_obj).exclude(pk__in=keep_keys).delete()

            return Response({
                "success": True, 
                "message": "鞋種尺碼級放矩陣存檔成功！", 
                "gkey": master_obj.pk if master_obj else None
            })
        except Exception as e:
            return Response({"success": False, "detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class Dp004AViewSet(BaseDictionaryViewSet):
    """鞋種性別尺碼對照表 ViewSet"""
    queryset = Dp004A.objects.all()
    serializer_class = Dp004ASerializer


class Dp005ViewSet(BaseDictionaryViewSet):
    """部位類別設定 ViewSet"""
    queryset = Dp005.objects.all()
    serializer_class = Dp005Serializer


class Dp006ViewSet(BaseDictionaryViewSet):
    """部位基本資料 ViewSet"""
    queryset = Dp006.objects.all()
    serializer_class = Dp006Serializer


class Dp008ViewSet(BaseDictionaryViewSet):
    """Sock Label 設定 ViewSet"""
    queryset = Dp008.objects.all()
    serializer_class = Dp008Serializer


class Dp009ViewSet(BaseDictionaryViewSet):
    """部件加工方式設定 ViewSet"""
    queryset = Dp009.objects.all()
    serializer_class = Dp009Serializer


class Dp007ViewSet(viewsets.ModelViewSet):
    """
    鞋種部位設定 ViewSet (Master-Detail 多對多關聯維護)
    支持針對鞋種篩選明細，並提供原子級一鍵覆蓋同步功能
    """
    queryset = Dp007.objects.all()
    serializer_class = Dp007Serializer

    def get_queryset(self):
        queryset = Dp007.objects.all()
        dp003gkey = self.request.query_params.get('dp003gkey')
        if dp003gkey:
            queryset = queryset.filter(dp003gkey=dp003gkey)
        return queryset

    @action(detail=False, methods=['post'], url_path='sync_parts')
    def sync_parts(self, request):
        """
        🚀 現代化 Web 優化：一鍵覆蓋原子交易 (Atomic Replacement Transaction)
        解決 PB 原本需要逐行導入的繁雜手續。
        接收：{"dp003gkey": "...", "assigned_dp006_keys": ["gkey1", "gkey2"]}
        """
        dp003gkey = request.data.get('dp003gkey')
        assigned_keys = request.data.get('assigned_dp006_keys', [])

        if not dp003gkey:
            return Response({"success": False, "detail": "缺少必要參數 dp003gkey"}, status=400)

        try:
            with transaction.atomic():
                # 1. 物理抹除該鞋種的舊有綁定
                Dp007.objects.filter(dp003gkey=dp003gkey).delete()

                # 2. 物理重建全新的綁定清單 (批次插入提高吞吐量)
                new_mappings = [
                    Dp007(dp003gkey_id=dp003gkey, dp006gkey_id=k)
                    for k in assigned_keys
                ]
                Dp007.objects.bulk_create(new_mappings)

            return Response({"success": True, "message": "鞋種部位結構同步保存成功！"})
        except Exception as e:
            return Response({"success": False, "detail": str(e)}, status=400)


class Dp010ViewSet(viewsets.ModelViewSet):
    """楦頭基本資料 ViewSet"""
    queryset = Dp010.objects.all()
    serializer_class = Dp010Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        
        lastno = params.get('lastno')
        if lastno:
            qs = qs.filter(lastno__icontains=lastno)
        
        year = params.get('year')
        if year:
            qs = qs.filter(year=year)
            
        ba055gkey = params.get('ba055gkey')
        if ba055gkey:
            qs = qs.filter(ba055gkey=ba055gkey)
            
        ba010gkey = params.get('ba010gkey')
        if ba010gkey:
            qs = qs.filter(ba010gkey=ba010gkey)
            
        ba015gkey = params.get('ba015gkey')
        if ba015gkey:
            qs = qs.filter(ba015gkey=ba015gkey)

        apba015gkey = params.get('apba015gkey')
        if apba015gkey:
            qs = qs.filter(apba015gkey=apba015gkey)

        dp015gkey = params.get('dp015gkey')
        if dp015gkey:
            qs = qs.filter(dp015gkey=dp015gkey)

        dp020gkey = params.get('dp020gkey')
        if dp020gkey:
            qs = qs.filter(dp020gkey=dp020gkey)
            
        ba005gkey = params.get('ba005gkey')
        if ba005gkey:
            qs = qs.filter(ba005gkey=ba005gkey)

        adopted = params.get('adopted')
        if adopted and adopted != ' ':
            qs = qs.filter(adopted=adopted)
        
        return qs.order_by('-year', 'lastno')

    @action(detail=False, methods=['post'], url_path='deep_save')
    def deep_save(self, request):
        """
        🚀 三層數據同步引擎 (Master-Detail-SubDetail Atomic Sync)
        """
        data = request.data
        master_data = data.get('master', {})
        measurements = data.get('measurements', []) # Dp011
        values = data.get('values', [])             # Dp012
        histories = data.get('histories', [])       # Dp013
        stocks = data.get('stocks', [])             # Dp014

        try:
            with transaction.atomic():
                # 1. 保存主檔
                gkey = master_data.get('gkey')
                if gkey and not str(gkey).startswith('temp_'):
                    instance = Dp010.objects.get(gkey=gkey)
                    serializer = Dp010Serializer(instance, data=master_data, partial=True)
                else:
                    master_data.pop('gkey', None)
                    serializer = Dp010Serializer(data=master_data)
                
                serializer.is_valid(raise_exception=True)
                master_obj = serializer.save()

                # 2. 保存 Dp011 (部位量法)
                # 先清除舊的 (物理簡化邏輯：全刷)
                Dp011.objects.filter(dp010gkey=master_obj).delete()
                dp011_map = {} # temp_gkey -> new_obj
                for m_item in measurements:
                    old_gkey = m_item.pop('gkey', None)
                    m_item['dp010gkey'] = master_obj.gkey
                    m_ser = Dp011Serializer(data=m_item)
                    m_ser.is_valid(raise_exception=True)
                    m_obj = m_ser.save()
                    if old_gkey:
                        dp011_map[old_gkey] = m_obj

                # 3. 保存 Dp012 (量值矩陣)
                Dp012.objects.filter(dp010gkey=master_obj).delete()
                for v_item in values:
                    v_item.pop('gkey', None)
                    v_item['dp010gkey'] = master_obj.gkey
                    # 重新連結到新的 Dp011
                    old_p_gkey = v_item.get('dp011gkey')
                    if old_p_gkey in dp011_map:
                        v_item['dp011gkey'] = dp011_map[old_p_gkey].gkey
                    
                    v_ser = Dp012Serializer(data=v_item)
                    v_ser.is_valid(raise_exception=True)
                    v_ser.save()

                # 4. 保存 Dp013 (歷史)
                # 僅保存新增的 temp 歷史
                for h_item in histories:
                    if str(h_item.get('gkey', '')).startswith('temp_'):
                        h_item.pop('gkey', None)
                        h_item['dp010gkey'] = master_obj.gkey
                        h_ser = Dp013Serializer(data=h_item)
                        h_ser.is_valid(raise_exception=True)
                        h_ser.save()

                # 5. 保存 Dp014 (庫存)
                Dp014.objects.filter(dp010gkey=master_obj).delete()
                for s_item in stocks:
                    s_item.pop('gkey', None)
                    s_item['dp010gkey'] = master_obj.gkey
                    s_ser = Dp014Serializer(data=s_item)
                    s_ser.is_valid(raise_exception=True)
                    s_ser.save()

            return Response({"success": True, "message": "楦頭全單資料原子存檔成功！", "gkey": master_obj.gkey})
        except Exception as e:
            return Response({"success": False, "detail": str(e)}, status=400)



class Dp015ViewSet(viewsets.ModelViewSet):
    """大底基本資料 ViewSet"""
    queryset = Dp015.objects.all()
    serializer_class = Dp015Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        bottomno = self.request.query_params.get('bottomno')
        if bottomno:
            qs = qs.filter(bottomno__icontains=bottomno)
        
        # 物理過濾：依據年度與其他關聯
        year = self.request.query_params.get('year')
        if year:
            qs = qs.filter(year=year)
            
        ba010gkey = self.request.query_params.get('ba010gkey')
        if ba010gkey:
            qs = qs.filter(ba010gkey=ba010gkey)

        return qs.order_by('-year', 'bottomno')

    @action(detail=False, methods=['post'], url_path='deep_save')
    def deep_save(self, request):
        """
        🚀 三層原子交易同步引擎：大底主表 + 大底配模明細 + 攤提費用 + 尺寸展開配量
        """
        data = request.data
        master_data = data.get('master', {})
        molds = data.get('molds', [])    # Dp016
        costs = data.get('costs', [])    # Dp017
        sizes = data.get('sizes', [])    # Dp018

        try:
            with transaction.atomic():
                # 1. 保存主檔 Dp015
                gkey = master_data.get('gkey')
                if gkey and not str(gkey).startswith('temp_'):
                    instance = Dp015.objects.get(gkey=gkey)
                    serializer = Dp015Serializer(instance, data=master_data, partial=True)
                else:
                    master_data.pop('gkey', None)
                    serializer = Dp015Serializer(data=master_data)
                
                serializer.is_valid(raise_exception=True)
                master_obj = serializer.save()

                # 2. 保存 Dp016 (大底配模明細)
                Dp016.objects.filter(dp015gkey=master_obj).delete()
                dp016_map = {} # old_gkey -> new_obj
                for mold_item in molds:
                    old_gkey = mold_item.pop('gkey', None)
                    mold_item['dp015gkey'] = master_obj.gkey
                    # 避免外鍵為空字串或無效值
                    if not mold_item.get('bmba015gkey'): mold_item['bmba015gkey'] = None
                    if not mold_item.get('mdba015gkey'): mold_item['mdba015gkey'] = None
                    if not mold_item.get('apba015gkey'): mold_item['apba015gkey'] = None
                    if not mold_item.get('asba015gkey'): mold_item['asba015gkey'] = None
                    if not mold_item.get('dp010gkey'): mold_item['dp010gkey'] = None
                    if not mold_item.get('dp004gkey'): mold_item['dp004gkey'] = None
                    if not mold_item.get('ba060gkey'): mold_item['ba060gkey'] = None

                    m_ser = Dp016Serializer(data=mold_item)
                    m_ser.is_valid(raise_exception=True)
                    m_obj = m_ser.save()
                    if old_gkey:
                        dp016_map[old_gkey] = m_obj

                # 3. 保存 Dp017 (大底攤提費用)
                Dp017.objects.filter(dp015gkey=master_obj).delete()
                dp017_map = {} # old_gkey -> new_obj
                for cost_item in costs:
                    old_gkey = cost_item.pop('gkey', None)
                    cost_item['dp015gkey'] = master_obj.gkey
                    
                    # 重新連結到新的 Dp016
                    old_16_gkey = cost_item.get('dp016gkey')
                    if old_16_gkey in dp016_map:
                        cost_item['dp016gkey'] = dp016_map[old_16_gkey].gkey
                    else:
                        cost_item['dp016gkey'] = None
                    
                    if not cost_item.get('dp004gkey'): cost_item['dp004gkey'] = None
                    if not cost_item.get('ba015gkey'): cost_item['ba015gkey'] = None
                    if not cost_item.get('ba060gkey'): cost_item['ba060gkey'] = None

                    c_ser = Dp017Serializer(data=cost_item)
                    c_ser.is_valid(raise_exception=True)
                    c_obj = c_ser.save()
                    if old_gkey:
                        dp017_map[old_gkey] = c_obj

                # 4. 保存 Dp018 (尺寸展開配量)
                Dp018.objects.filter(dp015gkey=master_obj).delete()
                for size_item in sizes:
                    size_item.pop('gkey', None)
                    size_item['dp015gkey'] = master_obj.gkey
                    
                    # 重新連結到新的 Dp016
                    old_16_gkey = size_item.get('dp016gkey')
                    if old_16_gkey in dp016_map:
                        size_item['dp016gkey'] = dp016_map[old_16_gkey].gkey
                    else:
                        size_item['dp016gkey'] = None
                    
                    # 重新連結到新的 Dp017
                    old_17_gkey = size_item.get('dp017gkey')
                    if old_17_gkey in dp017_map:
                        size_item['dp017gkey'] = dp017_map[old_17_gkey].gkey
                    else:
                        size_item['dp017gkey'] = None
                    
                    s_ser = Dp018Serializer(data=size_item)
                    s_ser.is_valid(raise_exception=True)
                    s_ser.save()

            return Response({"success": True, "message": "大底全單原子交易儲存成功！", "gkey": master_obj.gkey})
        except Exception as e:
            return Response({"success": False, "detail": str(e)}, status=400)


class Dp020ViewSet(BaseDictionaryViewSet):
    """鞋跟基本資料 ViewSet (高保真搜索版本)"""
    queryset = Dp020.objects.all()
    serializer_class = Dp020Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        
        # 1. 物理攔截：主鍵模糊搜索
        heelno = params.get('heelno')
        if heelno:
            qs = qs.filter(heelno__icontains=heelno)
            
        # 2. 物理攔截：年份過濾
        year = params.get('year')
        if year:
            qs = qs.filter(year=year)
            
        # 3. 物理攔截：外鍵穿透 (工廠/楦頭/底)
        ba015gkey = params.get('ba015gkey')
        if ba015gkey:
            qs = qs.filter(ba015gkey=ba015gkey)
            
        dp010gkey = params.get('dp010gkey')
        if dp010gkey:
            qs = qs.filter(dp010gkey=dp010gkey)
            
        dp015gkey = params.get('dp015gkey')
        if dp015gkey:
            qs = qs.filter(dp015gkey=dp015gkey)
            
        # 4. 物理攔截：採用狀態
        adopted = params.get('adopted')
        if adopted and adopted != 'A': # 'A' is for ALL in PB
            qs = qs.filter(adopted=adopted)
            
        return qs


class Dp016ViewSet(BaseDictionaryViewSet):
    """大底配模明細 dp016"""
    queryset = Dp016.objects.all()
    serializer_class = Dp016Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp015gkey = self.request.query_params.get('dp015gkey')
        if dp015gkey:
            qs = qs.filter(dp015gkey=dp015gkey)
        return qs


class Dp017ViewSet(BaseDictionaryViewSet):
    """大底攤提費用 dp017"""
    queryset = Dp017.objects.all()
    serializer_class = Dp017Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp015gkey = self.request.query_params.get('dp015gkey')
        dp016gkey = self.request.query_params.get('dp016gkey')
        if dp015gkey:
            qs = qs.filter(dp015gkey=dp015gkey)
        if dp016gkey:
            qs = qs.filter(dp016gkey=dp016gkey)
        return qs


class Dp018ViewSet(BaseDictionaryViewSet):
    """大底尺碼展開配量 dp018"""
    queryset = Dp018.objects.all()
    serializer_class = Dp018Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp015gkey = self.request.query_params.get('dp015gkey')
        dp016gkey = self.request.query_params.get('dp016gkey')
        if dp015gkey:
            qs = qs.filter(dp015gkey=dp015gkey)
        if dp016gkey:
            qs = qs.filter(dp016gkey=dp016gkey)
        return qs


class Dp011ViewSet(BaseDictionaryViewSet):
    """楦頭量法基本資料 dp011"""
    queryset = Dp011.objects.all()
    serializer_class = Dp011Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp010gkey = self.request.query_params.get('dp010gkey')
        if dp010gkey:
            qs = qs.filter(dp010gkey=dp010gkey)
        return qs


class Dp012ViewSet(BaseDictionaryViewSet):
    """楦頭尺碼明細量值 dp012"""
    queryset = Dp012.objects.all()
    serializer_class = Dp012Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp010gkey = self.request.query_params.get('dp010gkey')
        dp011gkey = self.request.query_params.get('dp011gkey')
        if dp010gkey:
            qs = qs.filter(dp010gkey=dp010gkey)
        if dp011gkey:
            qs = qs.filter(dp011gkey=dp011gkey)
        return qs


class Dp013ViewSet(BaseDictionaryViewSet):
    """楦頭修改紀錄 dp013"""
    queryset = Dp013.objects.all()
    serializer_class = Dp013Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp010gkey = self.request.query_params.get('dp010gkey')
        if dp010gkey:
            qs = qs.filter(dp010gkey=dp010gkey)
        return qs


class Dp014ViewSet(BaseDictionaryViewSet):
    """楦頭庫存明細 dp014"""
    queryset = Dp014.objects.all()
    serializer_class = Dp014Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp010gkey = self.request.query_params.get('dp010gkey')
        if dp010gkey:
            qs = qs.filter(dp010gkey=dp010gkey)
        return qs


class Dp023ViewSet(BaseDictionaryViewSet):
    """組別基本資料 dp023"""
    queryset = Dp023.objects.all()
    serializer_class = Dp023Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        groupname = self.request.query_params.get('groupname')
        if groupname:
            qs = qs.filter(groupname__icontains=groupname)
        return qs


class Dp025ViewSet(BaseDictionaryViewSet):
    """型體基本資料主檔 dp025"""
    queryset = Dp025.objects.all()
    serializer_class = Dp025Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        styleno = self.request.query_params.get('styleno')
        stylename = self.request.query_params.get('stylename')
        year = self.request.query_params.get('year')
        ba055gkey = self.request.query_params.get('ba055gkey')
        dp023gkey = self.request.query_params.get('dp023gkey')
        dp010gkey = self.request.query_params.get('dp010gkey')
        dp015gkey = self.request.query_params.get('dp015gkey')
        dp020gkey = self.request.query_params.get('dp020gkey')
        ba010gkey = self.request.query_params.get('ba010gkey')
        ba015gkey = self.request.query_params.get('ba015gkey')
        es101gkey = self.request.query_params.get('es101gkey')
        sampleno = self.request.query_params.get('sampleno')
        adopted = self.request.query_params.get('adopted')
        dp003gkey = self.request.query_params.get('dp003gkey')
        confirms = self.request.query_params.get('confirms')
        issuedate_start = self.request.query_params.get('issuedate_start')
        issuedate_end = self.request.query_params.get('issuedate_end')
        
        if styleno:
            qs = qs.filter(styleno__icontains=styleno)
        if stylename:
            qs = qs.filter(stylename__icontains=stylename)
        if year:
            qs = qs.filter(year=year)
        if ba055gkey:
            qs = qs.filter(ba055gkey=ba055gkey)
        if dp023gkey:
            qs = qs.filter(dp023gkey=dp023gkey)
        if dp010gkey:
            qs = qs.filter(dp010gkey=dp010gkey)
        if dp015gkey:
            qs = qs.filter(dp015gkey=dp015gkey)
        if dp020gkey:
            qs = qs.filter(dp020gkey=dp020gkey)
        if ba010gkey:
            qs = qs.filter(details_dp026__ba010gkey=ba010gkey).distinct()
        if ba015gkey:
            qs = qs.filter(details_dp026__ba015gkey=ba015gkey).distinct()
        if es101gkey:
            qs = qs.filter(es101gkey=es101gkey)
        if sampleno:
            from .models import Dp031
            matching_gkeys = Dp031.objects.filter(sampleno__icontains=sampleno).values_list('gkey', flat=True)
            qs = qs.filter(dp031gkey__in=matching_gkeys)
        if adopted and adopted != 'A':
            qs = qs.filter(adopted=adopted)
        if dp003gkey:
            qs = qs.filter(dp003gkey=dp003gkey)
        if confirms and confirms != 'A':
            qs = qs.filter(confirms=confirms)
        if issuedate_start:
            qs = qs.filter(issuedate__gte=issuedate_start)
        if issuedate_end:
            qs = qs.filter(issuedate__lte=issuedate_end)
            
        return qs.order_by('-styleno')

    @action(detail=False, methods=['post'], url_path='import_from_sample')
    def import_from_sample(self, request):
        dp031gkey = request.data.get('dp031gkey')
        if not dp031gkey:
            return Response({'success': False, 'detail': '請提供樣品單配色明細鍵 (dp031gkey)'}, status=400)
            
        try:
            from django.utils import timezone
            from .models import Dp031
            # Fetch sample detail (dp031)
            detail = Dp031.objects.get(gkey=dp031gkey)
            master = detail.dp030gkey
            
            # Construct mapped fields to return to frontend form
            data = {
                'styleno': detail.styleno or master.styleno or '',
                'stylename': master.stylename or '',
                'year': master.year or str(timezone.now().year),
                'ba055gkey': master.ba055gkey.gkey if master.ba055gkey else None,
                'dp003gkey': master.dp003gkey.gkey if master.dp003gkey else None,
                'dp004gkey': master.dp004gkey.gkey if master.dp004gkey else None,
                'sizerun': master.size or '',
                'dp010gkey': master.dp010gkey.gkey if master.dp010gkey else None,
                'dp015gkey': master.dp015gkey.gkey if master.dp015gkey else None,
                'dp020gkey': master.dp020gkey.gkey if master.dp020gkey else None,
                'logo': master.logo or '',
                'construction': master.construction or '',
                'upper': detail.upper or '',
                'lining': detail.lining or '',
                'sock': detail.sock or '',
                'bottom': detail.bottom or '',
                'heel': detail.heel or '',
                'tongue': detail.tongue or '',
                'adopted': 'N',
                'confirms': 'N'
            }
            
            return Response({'success': True, 'data': data})
        except Dp031.DoesNotExist:
            return Response({'success': False, 'detail': '指定的樣品單配色明細不存在'}, status=404)
        except Exception as e:
            return Response({'success': False, 'detail': str(e)}, status=500)



class Dp026ViewSet(BaseDictionaryViewSet):
    """型體報價細項 dp026"""
    queryset = Dp026.objects.all()
    serializer_class = Dp026Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp025gkey = self.request.query_params.get('dp025gkey')
        if dp025gkey:
            qs = qs.filter(dp025gkey=dp025gkey)
        return qs.order_by('serialno')


class Dp027ViewSet(BaseDictionaryViewSet):
    """型體技轉資料 dp027"""
    queryset = Dp027.objects.all()
    serializer_class = Dp027Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp025gkey = self.request.query_params.get('dp025gkey')
        if dp025gkey:
            qs = qs.filter(dp025gkey=dp025gkey)
        return qs


class Dp028ViewSet(BaseDictionaryViewSet):
    """型體技術配件細項 dp028"""
    queryset = Dp028.objects.all()
    serializer_class = Dp028Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp025gkey = self.request.query_params.get('dp025gkey')
        if dp025gkey:
            qs = qs.filter(dp025gkey=dp025gkey)
        return qs.order_by('serialno')


class Dp030ViewSet(BaseDictionaryViewSet):
    """樣品單主檔 dp030"""
    queryset = Dp030.objects.all()
    serializer_class = Dp030Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        sampleno = self.request.query_params.get('sampleno')
        styleno = self.request.query_params.get('styleno')
        year = self.request.query_params.get('year')
        if sampleno:
            qs = qs.filter(sampleno__icontains=sampleno)
        if styleno:
            qs = qs.filter(styleno__icontains=styleno)
        if year:
            qs = qs.filter(year=year)
        return qs.order_by('-sampleno')

    @action(detail=False, methods=['get'], url_path='outstanding_samples')
    def outstanding_samples(self, request):
        """
        🎯 樣品欠數看板核心引擎 (Outstanding List Aggregator)
        串聯 dp030 -> dp031 -> dp033 進行即時進度計算。
        """
        from django.db.models import Q
        qs = Dp033.objects.filter(
            Q(dp031gkey__status__in=['1', '2']) |
            Q(dp031gkey__isnull=True, dp030gkey__status__in=['1', '2'])
        ).select_related(
            'dp030gkey', 'dp031gkey', 'dp030gkey__ba010gkey', 'dp030gkey__ba015gkey', 'dp030gkey__dp002gkey',
            'dp030gkey__dp010gkey', 'dp030gkey__dp015gkey', 'dp030gkey__dp020gkey'
        )
        
        cust = request.query_params.get('ba010gkey')
        year = request.query_params.get('year')
        stype = request.query_params.get('dp002gkey')
        sampleno = request.query_params.get('sampleno')

        if cust: qs = qs.filter(dp030gkey__ba010gkey=cust)
        if year: qs = qs.filter(dp030gkey__year=year)
        if stype: qs = qs.filter(dp030gkey__dp002gkey=stype)
        if sampleno: qs = qs.filter(dp030gkey__sampleno__icontains=sampleno)
        
        res = []
        for row in qs:
            req = float(row.custpairs or 0) + float(row.keeppairs or 0)
            fin = float(row.finishpairs or 0)
            outst = req - fin
            if outst < 0: outst = 0
            
            res.append({
                'gkey': row.gkey,
                'sampleno': row.dp030gkey.sampleno,
                'sampletype': row.dp030gkey.dp002gkey.esampletype if row.dp030gkey.dp002gkey else '',
                'issuedate': row.dp030gkey.issuedate,
                'styleno': row.dp031gkey.styleno if row.dp031gkey else row.dp030gkey.styleno,
                'stylename': row.dp030gkey.stylename,
                'stock': row.dp030gkey.stock,
                'customer': row.dp030gkey.ba010gkey.shortname if row.dp030gkey.ba010gkey else '',
                'factory': row.dp030gkey.ba015gkey.shortname if row.dp030gkey.ba015gkey else '',
                'color': row.dp031gkey.color if row.dp031gkey else '',
                'photopath': row.dp031gkey.photopath if row.dp031gkey else '',
                'size': row.size,
                'custpairs': float(row.custpairs or 0),
                'keeppairs': float(row.keeppairs or 0),
                'finishpairs': fin,
                'outstanding': outst,
                'completion_rate': round((fin / req * 100), 2) if req > 0 else 0,
                'lastno': row.dp030gkey.dp010gkey.lastno if row.dp030gkey.dp010gkey else '',
                'bottomno': row.dp030gkey.dp015gkey.bottomno if row.dp030gkey.dp015gkey else '',
                'heelno': row.dp030gkey.dp020gkey.heelno if row.dp030gkey.dp020gkey else '',
                'duedate': row.dp030gkey.duedate,
            })
        
        return Response(res)

    @action(detail=False, methods=['post'], url_path='deep_save')
    def deep_save(self, request):
        """
        🚀 神經中樞級：深度原子儲存引擎 (Full Cascade Atomic Update)
        一次性提交 Master + 所有二階子表的 [增刪改] 集合，保障 100% ERP 交易原子性！
        """
        master_data = request.data.get('master', {})
        details_dp031 = request.data.get('dp031', {}) # Colors
        details_dp032 = request.data.get('dp032', {}) # Materials
        details_dp034 = request.data.get('dp034', {}) # Logos
        details_dp035 = request.data.get('dp035', {}) # Revision
        details_dp104 = request.data.get('dp104', {}) # Tracker

        try:
            with transaction.atomic():
                # 1. Save Master Dp030
                m_gkey = master_data.get('gkey')
                is_new_master = False
                if m_gkey and str(m_gkey).startswith('temp_'):
                    master_data.pop('gkey', None)
                    is_new_master = True
                    serializer = Dp030Serializer(data=master_data)
                    serializer.is_valid(raise_exception=True)
                    master_instance = serializer.save()
                else:
                    master_instance = Dp030.objects.get(gkey=m_gkey)
                    serializer = Dp030Serializer(master_instance, data=master_data, partial=True)
                    serializer.is_valid(raise_exception=True)
                    master_instance = serializer.save()

                # 2. Helper to process dynamic child tables easily
                def process_child(upsert_list, delete_keys, model_cls, serializer_cls, fk_name):
                    # Process Deletes
                    if delete_keys:
                        model_cls.objects.filter(gkey__in=delete_keys).delete()
                    # Process Upserts
                    max_sn = model_cls.objects.filter(**{fk_name: master_instance}).aggregate(Max('serialno'))['serialno__max'] or 0
                    for item in upsert_list:
                        data = {k: v for k, v in item.items()}
                        gkey = data.get('gkey')
                        # Remove special computed bindings to prevent schema errors
                        data.pop('employeeno', None)
                        data.pop('englishname', None)
                        data.pop('chinesename', None)
                        
                        # Specific Nested Cascade: Dp031 -> Dp033
                        sub_sizes = data.pop('details_dp033', {}) # nested size array inside Dp031 row if any
                        
                        if gkey and str(gkey).startswith('temp_'):
                            data.pop('gkey', None)
                            data.pop('serialno', None)
                            max_sn += 1
                            ser = serializer_cls(data=data)
                            ser.is_valid(raise_exception=True)
                            inst = ser.save(**{fk_name: master_instance, 'serialno': max_sn})
                        else:
                            inst = model_cls.objects.get(gkey=gkey)
                            data.pop('serialno', None)
                            ser = serializer_cls(inst, data=data, partial=True)
                            ser.is_valid(raise_exception=True)
                            inst = ser.save()
                        
                        # Process dynamic sub-nested sizes (Dp033) attached directly to Dp031 row
                        if model_cls == Dp031 and sub_sizes:
                            sub_up = sub_sizes.get('upsert', [])
                            sub_del = sub_sizes.get('delete', [])
                            if sub_del:
                                Dp033.objects.filter(gkey__in=sub_del).delete()
                            sub_max = Dp033.objects.filter(dp031gkey=inst).aggregate(Max('serialno'))['serialno__max'] or 0
                            for sz_item in sub_up:
                                sz_data = {k: v for k, v in sz_item.items()}
                                sz_gkey = sz_data.get('gkey')
                                if sz_gkey and str(sz_gkey).startswith('temp_'):
                                    sz_data.pop('gkey', None)
                                    sz_data.pop('serialno', None)
                                    sub_max += 1
                                    sz_ser = Dp033Serializer(data=sz_data)
                                    sz_ser.is_valid(raise_exception=True)
                                    sz_ser.save(dp031gkey=inst, dp030gkey=master_instance, serialno=sub_max)
                                else:
                                    sz_inst = Dp033.objects.get(gkey=sz_gkey)
                                    sz_data.pop('serialno', None)
                                    sz_ser = Dp033Serializer(sz_inst, data=sz_data, partial=True)
                                    sz_ser.is_valid(raise_exception=True)
                                    sz_ser.save()

                # Process each related grid
                if details_dp031:
                    process_child(details_dp031.get('upsert', []), details_dp031.get('delete', []), Dp031, Dp031Serializer, 'dp030gkey')
                if details_dp032:
                    process_child(details_dp032.get('upsert', []), details_dp032.get('delete', []), Dp032, Dp032Serializer, 'dp030gkey')
                if details_dp034:
                    process_child(details_dp034.get('upsert', []), details_dp034.get('delete', []), Dp034, Dp034Serializer, 'dp030gkey')
                if details_dp035:
                    process_child(details_dp035.get('upsert', []), details_dp035.get('delete', []), Dp035, Dp035Serializer, 'dp030gkey')
                if details_dp104:
                    process_child(details_dp104.get('upsert', []), details_dp104.get('delete', []), Dp104, Dp104Serializer, 'dp030gkey')

            return Response({"success": True, "message": "樣品指令單完整聯動儲存成功", "gkey": master_instance.gkey})
        except Exception as e:
            return Response({"success": False, "detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class Dp031ViewSet(BaseDictionaryViewSet):
    """樣品配色明細 ViewSet"""
    queryset = Dp031.objects.all()
    serializer_class = Dp031Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp030gkey = self.request.query_params.get('dp030gkey')
        if dp030gkey:
            qs = qs.filter(dp030gkey=dp030gkey)
        return qs.order_by('serialno')


class Dp032ViewSet(BaseDictionaryViewSet):
    """樣品部位材料明細 ViewSet"""
    queryset = Dp032.objects.all()
    serializer_class = Dp032Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp030gkey = self.request.query_params.get('dp030gkey')
        if dp030gkey:
            qs = qs.filter(dp030gkey=dp030gkey)
        return qs.order_by('serialno')


class Dp033ViewSet(BaseDictionaryViewSet):
    """樣品配色尺碼配比 ViewSet"""
    queryset = Dp033.objects.all()
    serializer_class = Dp033Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp031gkey = self.request.query_params.get('dp031gkey')
        dp030gkey = self.request.query_params.get('dp030gkey')
        
        # Extended trackers for DP095 schedule board
        sampleno = self.request.query_params.get('sampleno')
        styleno = self.request.query_params.get('styleno')
        status = self.request.query_params.get('status')

        if dp031gkey:
            qs = qs.filter(dp031gkey=dp031gkey)
        if dp030gkey:
            qs = qs.filter(dp030gkey=dp030gkey)
        if sampleno:
            qs = qs.filter(dp030gkey__sampleno__icontains=sampleno)
        if styleno:
            qs = qs.filter(dp031gkey__styleno__icontains=styleno)
        if status:
            qs = qs.filter(dp031gkey__status=status)

        return qs.order_by('-dp030gkey__issuedate', 'serialno')

    @action(detail=False, methods=['post'], url_path='receive_samples')
    def receive_samples(self, request):
        """
        🧪 [物理點收遞增算法]:
        Processes incoming physical items arriving at the central R&D warehouse.
        Automatically adds to 'receive' and evaluates Dp031 status lifecycle.
        """
        items = request.data.get('items', [])
        if not items:
            return Response({'success': False, 'detail': '無可執行的點收清單'}, status=400)

        modified_colors = set()

        with transaction.atomic():
            for it in items:
                gkey = it.get('gkey')
                this_rec = float(it.get('thisreceive', 0))
                if not gkey or this_rec <= 0:
                    continue

                try:
                    row = Dp033.objects.select_for_update().get(gkey=gkey)
                    row.receive = float(row.receive or 0) + this_rec
                    row.save()
                    modified_colors.add(row.dp031gkey)
                except Dp033.DoesNotExist:
                    continue

            # Re-evaluate cascade status for impacted Dp031 colors
            for color in modified_colors:
                sizes = Dp033.objects.filter(dp031gkey=color)
                all_done = True
                any_started = False

                for s in sizes:
                    total_fulfilled = float(s.finishpairs or 0) + float(s.receive or 0)
                    requested = float(s.custpairs or 0) + float(s.keeppairs or 0)
                    
                    if total_fulfilled > 0:
                        any_started = True
                    if total_fulfilled < requested:
                        all_done = False

                if all_done and sizes.exists():
                    color.status = '3' # Finished
                elif any_started:
                    color.status = '2' # In Progress
                color.save()

        return Response({
            'success': True,
            'message': '🎉 現場打樣成品已物理點收入庫，生命週期聯鎖同步完畢！'
        })



class Dp034ViewSet(BaseDictionaryViewSet):
    """樣品加工明細 ViewSet"""
    queryset = Dp034.objects.all()
    serializer_class = Dp034Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp030gkey = self.request.query_params.get('dp030gkey')
        if dp030gkey:
            qs = qs.filter(dp030gkey=dp030gkey)
        return qs.order_by('serialno')


class Dp035ViewSet(BaseDictionaryViewSet):
    """樣品大底履歷 ViewSet"""
    queryset = Dp035.objects.all()
    serializer_class = Dp035Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp030gkey = self.request.query_params.get('dp030gkey')
        if dp030gkey:
            qs = qs.filter(dp030gkey=dp030gkey)
        return qs.order_by('serialno')


class Dp104ViewSet(BaseDictionaryViewSet):
    """樣品進度追蹤 ViewSet"""
    queryset = Dp104.objects.all()
    serializer_class = Dp104Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp030gkey = self.request.query_params.get('dp030gkey')
        if dp030gkey:
            qs = qs.filter(dp030gkey=dp030gkey)
        return qs.order_by('serialno')


class Dp040ViewSet(viewsets.ModelViewSet):
    """樣品出貨單主檔 ViewSet"""
    queryset = Dp040.objects.all()
    serializer_class = Dp040Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        invoiceno = self.request.query_params.get('invoiceno')
        year = self.request.query_params.get('year')
        if invoiceno:
            qs = qs.filter(invoiceno__icontains=invoiceno)
        if year:
            qs = qs.filter(year=year)
        return qs.order_by('-sentdate', '-invoiceno')

    @action(detail=False, methods=['post'], url_path='deep_save')
    def deep_save(self, request):
        master_data = request.data.get('master', {})
        details_dp041 = request.data.get('dp041', {})
        details_dp042 = request.data.get('dp042', {})
        details_dp043 = request.data.get('dp043', {})
        
        try:
            with transaction.atomic():
                # 1. Save Dp040 Master
                m_gkey = master_data.get('gkey')
                if m_gkey and str(m_gkey).startswith('temp_'):
                    master_data.pop('gkey', None)
                    serializer = Dp040Serializer(data=master_data)
                    serializer.is_valid(raise_exception=True)
                    master_obj = serializer.save()
                else:
                    master_obj = Dp040.objects.get(gkey=m_gkey)
                    serializer = Dp040Serializer(master_obj, data=master_data, partial=True)
                    serializer.is_valid(raise_exception=True)
                    master_obj = serializer.save()
                
                deleted_41 = details_dp041.get('delete', [])
                deleted_42 = details_dp042.get('delete', [])
                deleted_43 = details_dp043.get('delete', [])
                
                touched_dp033_keys = set()
                
                if deleted_41:
                    for r in Dp041.objects.filter(gkey__in=deleted_41):
                        if r.dp033gkey: touched_dp033_keys.add(r.dp033gkey.pk)
                    Dp041.objects.filter(gkey__in=deleted_41).delete()
                if deleted_42: Dp042.objects.filter(gkey__in=deleted_42).delete()
                if deleted_43: Dp043.objects.filter(gkey__in=deleted_43).delete()
                
                # 2. Upsert Dp042 (Weights first, needed for Dp043 mapping)
                dp042_key_map = {}
                for item in details_dp042.get('upsert', []):
                    original_gkey = item.get('gkey')
                    data_copy = {**item, 'dp040gkey': master_obj.pk}
                    if original_gkey and str(original_gkey).startswith('temp_'):
                        data_copy.pop('gkey', None)
                        ser = Dp042Serializer(data=data_copy)
                        ser.is_valid(raise_exception=True)
                        saved_item = ser.save()
                        dp042_key_map[original_gkey] = saved_item.pk
                    else:
                        inst = Dp042.objects.get(gkey=original_gkey)
                        ser = Dp042Serializer(inst, data=data_copy, partial=True)
                        ser.is_valid(raise_exception=True)
                        saved_item = ser.save()
                        dp042_key_map[original_gkey] = saved_item.pk
                        
                # 3. Upsert Dp041 (Shipment Items)
                dp041_key_map = {}
                for item in details_dp041.get('upsert', []):
                    original_gkey = item.get('gkey')
                    data_copy = {**item, 'dp040gkey': master_obj.pk}
                    
                    if item.get('dp033gkey'):
                        touched_dp033_keys.add(item.get('dp033gkey'))
                    
                    if original_gkey and str(original_gkey).startswith('temp_'):
                        data_copy.pop('gkey', None)
                        ser = Dp041Serializer(data=data_copy)
                        ser.is_valid(raise_exception=True)
                        saved_item = ser.save()
                        dp041_key_map[original_gkey] = saved_item.pk
                    else:
                        inst = Dp041.objects.get(gkey=original_gkey)
                        if inst.dp033gkey: touched_dp033_keys.add(inst.dp033gkey.pk)
                        ser = Dp041Serializer(inst, data=data_copy, partial=True)
                        ser.is_valid(raise_exception=True)
                        saved_item = ser.save()
                        dp041_key_map[original_gkey] = saved_item.pk

                # 4. Upsert Dp043 (Cartons with swapping temp keys)
                for item in details_dp043.get('upsert', []):
                    original_gkey = item.get('gkey')
                    data_copy = {**item, 'dp040gkey': master_obj.pk}
                    
                    mapped_p42 = dp042_key_map.get(item.get('dp042gkey'))
                    if mapped_p42: data_copy['dp042gkey'] = mapped_p42
                    
                    mapped_p41 = dp041_key_map.get(item.get('dp041gkey'))
                    if mapped_p41: data_copy['dp041gkey'] = mapped_p41
                    
                    if original_gkey and str(original_gkey).startswith('temp_'):
                        data_copy.pop('gkey', None)
                        ser = Dp043Serializer(data=data_copy)
                        ser.is_valid(raise_exception=True)
                        ser.save()
                    else:
                        inst = Dp043.objects.get(gkey=original_gkey)
                        ser = Dp043Serializer(inst, data=data_copy, partial=True)
                        ser.is_valid(raise_exception=True)
                        ser.save()

                # 💥 BACKFILL INTEGRATION ENGINE
                parent_dp031_keys = set()
                from django.db.models import Sum
                for d33_key in touched_dp033_keys:
                    if not d33_key: continue
                    try:
                        d33 = Dp033.objects.get(pk=d33_key)
                        total_shipped = Dp041.objects.filter(dp033gkey=d33_key).aggregate(Sum('sentpairs'))['sentpairs__sum'] or 0
                        d33.finishpairs = total_shipped
                        d33.save()
                        if d33.dp031gkey: parent_dp031_keys.add(d33.dp031gkey.pk)
                    except Dp033.DoesNotExist:
                        pass
                
                grandparent_dp030_keys = set()
                for d31_key in parent_dp031_keys:
                    try:
                        d31 = Dp031.objects.get(pk=d31_key)
                        grandparent_dp030_keys.add(d31.dp030gkey.pk)
                        
                        sizes = d31.sizes.all()
                        total_req = sum((float(s.custpairs or 0) + float(s.keeppairs or 0)) for s in sizes)
                        total_fin = sum(float(s.finishpairs or 0) for s in sizes)
                        
                        if total_fin >= total_req and total_req > 0:
                            d31.status = '3' # Done
                        elif total_fin > 0:
                            d31.status = '2' # Part
                        else:
                            d31.status = '1' # Pending
                        d31.save()
                    except Dp031.DoesNotExist:
                        pass
                        
                for d30_key in grandparent_dp030_keys:
                    try:
                        d30 = Dp030.objects.get(pk=d30_key)
                        colors = d30.colors.all()
                        if all(c.status == '3' for c in colors) and colors.exists():
                            d30.status = '3'
                        elif any(c.status in ['2', '3'] for c in colors):
                            d30.status = '2'
                        else:
                            d30.status = '1'
                        d30.save()
                    except Dp030.DoesNotExist:
                        pass
                        
            return Response({
                "success": True,
                "message": "出貨交易與進度回灌演算完畢！",
                "gkey": master_obj.pk
            })
        except Exception as e:
            return Response({"success": False, "detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class Dp041ViewSet(BaseDictionaryViewSet):
    """樣品出貨明細 ViewSet"""
    queryset = Dp041.objects.all()
    serializer_class = Dp041Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp040gkey = self.request.query_params.get('dp040gkey')
        if dp040gkey:
            qs = qs.filter(dp040gkey=dp040gkey)
        return qs.order_by('serialno')


class Dp042ViewSet(BaseDictionaryViewSet):
    """樣品出貨重量規格 ViewSet"""
    queryset = Dp042.objects.all()
    serializer_class = Dp042Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp040gkey = self.request.query_params.get('dp040gkey')
        if dp040gkey:
            qs = qs.filter(dp040gkey=dp040gkey)
        return qs.order_by('carton')


class Dp043ViewSet(BaseDictionaryViewSet):
    """樣品出貨裝箱 ViewSet"""
    queryset = Dp043.objects.all()
    serializer_class = Dp043Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp040gkey = self.request.query_params.get('dp040gkey')
        if dp040gkey:
            qs = qs.filter(dp040gkey=dp040gkey)
        return qs.order_by('styleno', 'size')


class Dp080ViewSet(BaseDictionaryViewSet):
    """樣品試版評語與確認主檔 ViewSet"""
    queryset = Dp080.objects.all()
    serializer_class = Dp080Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        opiniontype = self.request.query_params.get('opiniontype')
        sampleno = self.request.query_params.get('sampleno')
        if opiniontype:
            qs = qs.filter(opiniontype=opiniontype)
        if sampleno:
            qs = qs.filter(sampleno__icontains=sampleno)
        return qs.order_by('styleno', 'serialno')

    @action(detail=False, methods=['post'], url_path='deep_save')
    def deep_save(self, request):
        """
        🧪 [原子試版評語儲存]:
        Concurrency-safe transactional saving for Fitting/CFM reports.
        Handles Parent Header + Detail Opinions (Dp081) + Detail Measurements (Dp082).
        """
        data = request.data
        master_data = data.get('master', {})
        opinions_data = data.get('opinions', [])
        measurements_data = data.get('measurements', [])

        try:
            with transaction.atomic():
                # 1. Resolve or update parent Dp080
                gkey = master_data.get('gkey')
                
                # Automatic auto-numbering for serialno if not provided
                if not gkey:
                    styleno = master_data.get('styleno', '')
                    otype = master_data.get('opiniontype', 'F')
                    max_ser = Dp080.objects.select_for_update().filter(styleno=styleno, opiniontype=otype).aggregate(Max('serialno'))['serialno__max']
                    master_data['serialno'] = (max_ser or 0) + 1
                
                master_serializer = self.get_serializer(data=master_data)
                if gkey:
                    inst = Dp080.objects.select_for_update().get(pk=gkey)
                    master_serializer = self.get_serializer(inst, data=master_data, partial=True)
                
                master_serializer.is_valid(raise_exception=True)
                master_obj = master_serializer.save()

                # 2. Update Opinions (Dp081)
                keep_op_keys = []
                for op in opinions_data:
                    op['dp080gkey'] = master_obj.pk
                    op_gkey = op.get('gkey')
                    
                    if op_gkey and not str(op_gkey).startswith('temp_'):
                        op_inst = Dp081.objects.select_for_update().get(pk=op_gkey)
                        ser = Dp081Serializer(op_inst, data=op, partial=True)
                    else:
                        op.pop('gkey', None)
                        ser = Dp081Serializer(data=op)
                    
                    ser.is_valid(raise_exception=True)
                    saved_op = ser.save()
                    keep_op_keys.append(saved_op.pk)

                # Clean up stale opinions
                Dp081.objects.filter(dp080gkey=master_obj).exclude(pk__in=keep_op_keys).delete()

                # 3. Update Measurements (Dp082)
                keep_meas_keys = []
                for meas in measurements_data:
                    meas['dp080gkey'] = master_obj.pk
                    meas_gkey = meas.get('gkey')
                    
                    if meas_gkey and not str(meas_gkey).startswith('temp_'):
                        meas_inst = Dp082.objects.select_for_update().get(pk=meas_gkey)
                        ser = Dp082Serializer(meas_inst, data=meas, partial=True)
                    else:
                        meas.pop('gkey', None)
                        ser = Dp082Serializer(data=meas)
                    
                    ser.is_valid(raise_exception=True)
                    saved_meas = ser.save()
                    keep_meas_keys.append(saved_meas.pk)

                # Clean up stale measurements
                Dp082.objects.filter(dp080gkey=master_obj).exclude(pk__in=keep_meas_keys).delete()

            return Response({
                "success": True,
                "message": "📝 試版意見與量測規格儲存完成！",
                "gkey": master_obj.pk
            })
        except Exception as e:
            return Response({"success": False, "detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class Dp081ViewSet(BaseDictionaryViewSet):
    queryset = Dp081.objects.all()
    serializer_class = Dp081Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp080gkey = self.request.query_params.get('dp080gkey')
        if dp080gkey:
            qs = qs.filter(dp080gkey=dp080gkey)
        return qs.order_by('partsno')


class Dp082ViewSet(BaseDictionaryViewSet):
    queryset = Dp082.objects.all()
    serializer_class = Dp082Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp080gkey = self.request.query_params.get('dp080gkey')
        if dp080gkey:
            qs = qs.filter(dp080gkey=dp080gkey)
        return qs.order_by('serialno')


class Dp100ViewSet(BaseDictionaryViewSet):
    """開發費用轉嫁單 ViewSet"""
    queryset = Dp100.objects.all()
    serializer_class = Dp100Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        refno = self.request.query_params.get('refno')
        styleno = self.request.query_params.get('styleno')
        if refno:
            qs = qs.filter(refno__icontains=refno)
        if styleno:
            qs = qs.filter(styleno__icontains=styleno)
        return qs.order_by('-issuedate')

    @action(detail=False, methods=['post'], url_path='deep_save')
    def deep_save(self, request):
        """
        🧪 [開發費用轉嫁交易單 - 深層存檔]:
        Atomic master-detail handling for Chargeback document creation & editing.
        Sets automatic total sum on Dp100 based on Dp101 lines.
        """
        data = request.data
        master_data = data.get('master', {})
        details_data = data.get('details', [])

        try:
            with transaction.atomic():
                # Fill current operator as aes101 operator if null
                if 'aes101gkey' not in master_data or not master_data['aes101gkey']:
                    op = Es101.objects.filter(englishname='ADMIN').first()
                    if op:
                        master_data['aes101gkey'] = op.pk

                gkey = master_data.get('gkey')
                
                # Calculate dynamic sum aggregate of lines before save
                line_sum = sum(float(d.get('qty', 0)) * float(d.get('price', 0)) for d in details_data)
                master_data['amount'] = line_sum

                if gkey:
                    inst = Dp100.objects.select_for_update().get(pk=gkey)
                    ser = self.get_serializer(inst, data=master_data, partial=True)
                else:
                    ser = self.get_serializer(data=master_data)
                
                ser.is_valid(raise_exception=True)
                master_obj = ser.save()

                keep_detail_keys = []
                for det in details_data:
                    det['dp100gkey'] = master_obj.pk
                    det['amount'] = float(det.get('qty', 0)) * float(det.get('price', 0))
                    
                    det_gkey = det.get('gkey')
                    if det_gkey and not str(det_gkey).startswith('temp_'):
                        det_inst = Dp101.objects.select_for_update().get(pk=det_gkey)
                        d_ser = Dp101Serializer(det_inst, data=det, partial=True)
                    else:
                        det.pop('gkey', None)
                        d_ser = Dp101Serializer(data=det)
                    
                    d_ser.is_valid(raise_exception=True)
                    saved_d = d_ser.save()
                    keep_detail_keys.append(saved_d.pk)

                # Delete stale child items
                Dp101.objects.filter(dp100gkey=master_obj).exclude(pk__in=keep_detail_keys).delete()

            return Response({
                "success": True,
                "message": "💳 開發費用轉嫁單存檔完成！金額自動累加回灌！",
                "gkey": master_obj.pk
            })
        except Exception as e:
            return Response({"success": False, "detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class Dp101ViewSet(BaseDictionaryViewSet):
    queryset = Dp101.objects.all()
    serializer_class = Dp101Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp100gkey = self.request.query_params.get('dp100gkey')
        if dp100gkey:
            qs = qs.filter(dp100gkey=dp100gkey)
        return qs.order_by('gkey')


from django.db.models import Count, Sum

@api_view(['GET'])
def dashboard_analytics(request):
    """
    📊 [量產投產決策看板數據端點] (DP060~DP070):
    Computes real-time sample-to-production conversions and seasonal stats.
    """
    # 1. Conversion Chart: Count of samples by Status
    conv = Dp030.objects.values('status').annotate(count=Count('gkey'))
    status_map = {'1': '進行中', '2': '已寄出', '3': '確認簽結 (量產投產)', '0': '取消/封存'}
    conv_data = [{'label': status_map.get(x['status'], x['status']), 'value': x['count']} for x in conv]

    # 2. Seasonal Distribution (DP070): Sample count by Season group
    season_stats = Dp030.objects.values('ba055gkey__groupcode').annotate(
        total_samples=Count('gkey')
    ).exclude(ba055gkey__groupcode__isnull=True).order_by('-total_samples')[:8]
    season_data = [{'season': x['ba055gkey__groupcode'], 'count': x['total_samples']} for x in season_stats]

    # 3. Bottom Mold Usage (DP060): Top 8 bottoms used in Sample development
    bottom_stats = Dp030.objects.values('dp015gkey__bottomno').annotate(
        count=Count('gkey')
    ).exclude(dp015gkey__bottomno__isnull=True).order_by('-count')[:8]
    bottom_data = [{'bottom': x['dp015gkey__bottomno'], 'count': x['count']} for x in bottom_stats]

    return Response({
        "conversion": conv_data,
        "seasons": season_data,
        "bottoms": bottom_data
    })








