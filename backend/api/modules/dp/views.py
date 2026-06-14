from rest_framework import filters
from api.common.mixins.validation import ValidationMixin
from api.common.mixins.deep_save_v2 import DeepSaveMixinV2
from api.common.filters.data_constraint import DataConstraintFilterBackend
from rest_framework.decorators import action
from api.common.permissions.program_permission import HasProgramPermission
from rest_framework import viewsets
from api.common.mixins.deep_save import DeepSaveMixin
from api.common.mixins.approval import ApprovalMixin
from api.common.mixins.billno import BillNoMixin
from django.db.models import Max
from api.modules.common.views import BaseDictionaryViewSet
from api.modules.dp.models import *
from api.modules.dp.serializers import *

class Dp010ViewSet(DeepSaveMixinV2, ValidationMixin, viewsets.ModelViewSet):
    """楦頭基本資料 ViewSet"""
    permission_classes = [HasProgramPermission]
    program_id = 'w_dp010'
    queryset = Dp010.objects.all()
    serializer_class = Dp010Serializer
    filter_backends = [filters.SearchFilter, DataConstraintFilterBackend]

    deep_save_config = {
        "master_serializer": Dp010Serializer,
        "master_lookup_field": "gkey",
        "details": {} # Dp011 / Dp012 / Dp013 / Dp014 bypass standard details
    }

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

    # Dp011 / Dp012 為 DP010 Matrix private child records，外部模組不得 FK 依賴其 gkey。
    # Dp013 為歷史，Dp014 為庫存，為維持相容，在此 hook 一併處理。
    def post_master_save_hook(self, master_instance, master_data, request):
        """
        🚀 三層數據同步引擎 (Master-Detail-SubDetail Atomic Sync) Hook
        在 DeepSaveMixinV2 的 transaction.atomic 內執行
        """
        data = request.data
        measurements = data.get('measurements', []) # Dp011
        values = data.get('values', [])             # Dp012
        histories = data.get('histories', [])       # Dp013
        stocks = data.get('stocks', [])             # Dp014

        # 2. 保存 Dp011 (部位量法)
        # 先清除舊的 (物理簡化邏輯：全刷)
        Dp011.objects.filter(dp010gkey=master_instance).delete()
        dp011_map = {} # temp_gkey -> new_obj
        for m_item in measurements:
            old_gkey = m_item.pop('gkey', None)
            m_item['dp010gkey'] = master_instance.gkey
            m_ser = Dp011Serializer(data=m_item)
            m_ser.is_valid(raise_exception=True)
            m_obj = m_ser.save()
            if old_gkey:
                dp011_map[old_gkey] = m_obj

        # 3. 保存 Dp012 (量值矩陣)
        Dp012.objects.filter(dp010gkey=master_instance).delete()
        for v_item in values:
            v_item.pop('gkey', None)
            v_item['dp010gkey'] = master_instance.gkey
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
                h_item['dp010gkey'] = master_instance.gkey
                h_ser = Dp013Serializer(data=h_item)
                h_ser.is_valid(raise_exception=True)
                h_ser.save()

        # 5. 保存 Dp014 (庫存)
        Dp014.objects.filter(dp010gkey=master_instance).delete()
        for s_item in stocks:
            s_item.pop('gkey', None)
            s_item['dp010gkey'] = master_instance.gkey
            s_ser = Dp014Serializer(data=s_item)
            s_ser.is_valid(raise_exception=True)
            s_ser.save()




class Dp015ViewSet(DeepSaveMixinV2, ValidationMixin, viewsets.ModelViewSet):
    """大底基本資料 ViewSet"""
    permission_classes = [HasProgramPermission]
    program_id = 'w_dp015'
    queryset = Dp015.objects.all()
    serializer_class = Dp015Serializer

    # DeepSaveMixinV2 Configuration
    deep_save_config = {
        "master_serializer": Dp015Serializer,
        "master_lookup_field": "gkey",
        "details": {
            "dp016": {
                "model": Dp016,
                "serializer": Dp016Serializer,
                "parent_field": "dp015gkey",
                "lookup_field": "gkey",
                "delete_mode": "hard"
            },
            "dp017": {
                "model": Dp017,
                "serializer": Dp017Serializer,
                "parent_field": "dp015gkey",
                "lookup_field": "gkey",
                "delete_mode": "hard"
            },
            "dp018": {
                "model": Dp018,
                "serializer": Dp018Serializer,
                "parent_field": "dp015gkey",
                "lookup_field": "gkey",
                "delete_mode": "hard"
            }
        }
    }

    def pre_deep_save_hook(self, master_data, details_data, request):
        # 處理字串陣列轉換
        for dk in ['dp016', 'dp017', 'dp018']:
            del_list = details_data.get(dk, {}).get('delete', [])
            if del_list and isinstance(del_list[0], str):
                details_data[dk]['delete'] = [{'gkey': k} for k in del_list]

    def _save_detail_group(self, master_instance, master_pk_val, detail_key, rows, detail_config, context):
        if detail_key in ['dp017', 'dp018']:
            for row in rows:
                if row.get('dp016gkey') in context.get("gkey_map", {}):
                    row['dp016gkey'] = context["gkey_map"][row['dp016gkey']]
                if detail_key == 'dp018':
                    if row.get('dp017gkey') in context.get("gkey_map", {}):
                        row['dp017gkey'] = context["gkey_map"][row['dp017gkey']]
        return super()._save_detail_group(master_instance, master_pk_val, detail_key, rows, detail_config, context)

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

    @action(detail=False, methods=['post'], url_path='legacy_deep_save')
    def legacy_deep_save(self, request):
        """
        [DEPRECATED] 🚀 三層原子交易同步引擎：大底主表 + 大底配模明細 + 攤提費用 + 尺寸展開配量
        已降級為 fallback，請改用 /api/dp015/deep_save/ (DeepSaveMixinV2)
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
    permission_classes = [HasProgramPermission]
    program_id = 'w_dp020'
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
    """大底配模明細 dp016 (明細：隸屬大底基本資料)"""
    program_id = 'w_dp015'  # 明細：隸屬 Dp015 大底主檔作業
    queryset = Dp016.objects.all()
    serializer_class = Dp016Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp015gkey = self.request.query_params.get('dp015gkey')
        if dp015gkey:
            qs = qs.filter(dp015gkey=dp015gkey)
        return qs



class Dp017ViewSet(BaseDictionaryViewSet):
    """大底攤提費用 dp017 (明細：隸屬大底基本資料)"""
    program_id = 'w_dp015'  # 明細：隸屬 Dp015 大底主檔作業
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
    """大底尺碼展開配量 dp018 (明細：隸屬大底基本資料)"""
    program_id = 'w_dp015'  # 明細：隸屬 Dp015 大底主檔作業
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
    """楦頭量法基本資料 dp011 (明細：隸屬楦頭基本資料)"""
    program_id = 'w_dp010'  # 明細：隸屬 Dp010 楦頭主檔作業
    queryset = Dp011.objects.all()
    serializer_class = Dp011Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp010gkey = self.request.query_params.get('dp010gkey')
        if dp010gkey:
            qs = qs.filter(dp010gkey=dp010gkey)
        return qs



class Dp012ViewSet(BaseDictionaryViewSet):
    """楦頭尺碼明細量值 dp012 (明細：隸屬楦頭基本資料)"""
    program_id = 'w_dp010'  # 明細：隸屬 Dp010 楦頭主檔作業
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
    """楦頭修改紀錄 dp013 (明細：隸屬楦頭基本資料)"""
    program_id = 'w_dp010'  # 明細：隸屬 Dp010 楦頭主檔作業
    queryset = Dp013.objects.all()
    serializer_class = Dp013Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp010gkey = self.request.query_params.get('dp010gkey')
        if dp010gkey:
            qs = qs.filter(dp010gkey=dp010gkey)
        return qs



class Dp014ViewSet(BaseDictionaryViewSet):
    """楦頭庫存明細 dp014 (明細：隸屬楦頭基本資料)"""
    program_id = 'w_dp010'  # 明細：隸屬 Dp010 楦頭主檔作業
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
    program_id = 'w_dp023'
    queryset = Dp023.objects.all()
    serializer_class = Dp023Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        groupname = self.request.query_params.get('groupname')
        if groupname:
            qs = qs.filter(groupname__icontains=groupname)
        return qs



class Dp025ViewSet(DeepSaveMixinV2, ApprovalMixin, BaseDictionaryViewSet):
    """型體基本資料主檔 dp025"""
    permission_classes = [HasProgramPermission]
    program_id = 'w_dp025'
    queryset = Dp025.objects.all()
    serializer_class = Dp025Serializer
    filter_backends = BaseDictionaryViewSet.filter_backends + [DataConstraintFilterBackend]
    data_constraint_config = {
        "user_field": "es101gkey"
    }

    # DeepSaveMixinV2 Configuration
    deep_save_config = {
        "master_serializer": Dp025Serializer,
        "master_lookup_field": "gkey",
        "details": {
            "prices": {
                "model": Dp026,
                "serializer": Dp026Serializer,
                "parent_field": "dp025gkey",
                "lookup_field": "gkey",
                "delete_mode": "hard"
            },
            "tech": {
                "model": Dp027,
                "serializer": Dp027Serializer,
                "parent_field": "dp025gkey",
                "lookup_field": "gkey",
                "delete_mode": "hard"
            },
            "accessories": {
                "model": Dp028,
                "serializer": Dp028Serializer,
                "parent_field": "dp025gkey",
                "lookup_field": "gkey",
                "delete_mode": "hard"
            }
        }
    }

    # ApprovalMixin Configuration
    approve_config = {
        'status_field': 'confirms',
        'approve_value': 'Y',
        'reject_value': 'N'
    }

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
    """型體報價細項 dp026 (明細：隸屬型體基本資料 BOM)"""
    program_id = 'w_dp025'  # 明細：隸屬 Dp025 型體主檔作業
    queryset = Dp026.objects.all()
    serializer_class = Dp026Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp025gkey = self.request.query_params.get('dp025gkey')
        if dp025gkey:
            qs = qs.filter(dp025gkey=dp025gkey)
        return qs.order_by('serialno')



class Dp027ViewSet(BaseDictionaryViewSet):
    """型體技轉資料 dp027 (明細：隸屬型體基本資料 BOM)"""
    program_id = 'w_dp025'  # 明細：隸屬 Dp025 型體主檔作業
    queryset = Dp027.objects.all()
    serializer_class = Dp027Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp025gkey = self.request.query_params.get('dp025gkey')
        if dp025gkey:
            qs = qs.filter(dp025gkey=dp025gkey)
        return qs



class Dp028ViewSet(BaseDictionaryViewSet):
    """型體技術配件細項 dp028 (明細：隸屬型體基本資料 BOM)"""
    program_id = 'w_dp025'  # 明細：隸屬 Dp025 型體主檔作業
    queryset = Dp028.objects.all()
    serializer_class = Dp028Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp025gkey = self.request.query_params.get('dp025gkey')
        if dp025gkey:
            qs = qs.filter(dp025gkey=dp025gkey)
        return qs.order_by('serialno')


def generate_dp030_sampleno(year, ba055gkey):
    if not year:
        raise ValueError("年度不可空白，無法產生樣品單號。")

    if not ba055gkey:
        raise ValueError("季節不可空白，無法產生樣品單號。")

    from .models import Ba055, Dp030
    try:
        season = Ba055.objects.get(gkey=ba055gkey)
    except Ba055.DoesNotExist:
        raise ValueError("找不到指定的季節資料，無法產生樣品單號。")

    season_code = season.groupcode
    season_code = str(season_code or '').strip()

    if not season_code:
        raise ValueError("季節代碼不可空白，無法產生樣品單號。")

    prefix = f"{year}{season_code}"

    last = (
        Dp030.objects
        .filter(sampleno__startswith=prefix)
        .order_by('-sampleno')
        .first()
    )

    if last and last.sampleno:
        seq_text = str(last.sampleno)[len(prefix):]
        import re
        digits = re.findall(r'\d+', seq_text)
        if digits:
            try:
                next_seq = int(digits[-1]) + 1
            except ValueError:
                next_seq = 1
        else:
            next_seq = 1
    else:
        next_seq = 1

    return f"{prefix}{next_seq:04d}"




class Dp030ViewSet(DeepSaveMixinV2, BillNoMixin, ApprovalMixin, BaseDictionaryViewSet):
    """樣品單主檔 dp030"""
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DataConstraintFilterBackend]
    
    validation_config = {
        "required_fields": [
            {"field": "ba010gkey", "label": "客戶"}
        ],
        "detail_rules": [
            {"detail_key": "dp031", "min_rows": 1, "message": "樣品明細至少需要一筆資料"}
        ]
    }

    data_constraint_config = {
        "enabled": True,
        "mode": "by_maker",
        "field": "es101gkey",
        "source": "es101gkey"
    }

    data_constraint_config = {
        "enabled": True,
        "mode": "by_maker",
        "field": "es101gkey",
        "source": "es101gkey"
    }

    billno_config = {
        "bill_field": "sampleno",
        "date_field": "issuedate",
        "prefix": "S",
        "serial_length": 4,
        "date_format": "%y%m%d",
        "separator": "",
    }
    permission_classes = [HasProgramPermission]
    program_id = 'w_dp030'
    action_program_map = {
        'outstanding_samples': 'w_dp032',
        'label_samples': 'w_dp035',
    }
    
    approval_config = {
        "approved_field": "approve",
        "approved_value": "Y",
        "unapproved_value": "N",
        "approver_gkey_field": "aes101gkey",
        "modify_date_field": "modifydate",
        "allow_edit_after_approve": False,
        "allow_delete_after_approve": False,
    }
    
    queryset = Dp030.objects.all()
    serializer_class = Dp030Serializer

    
    deep_save_config = {
        "master_serializer": Dp030Serializer,
        "master_lookup_field": "gkey",
        "details": {
            "dp031": {
                "model": Dp031,
                "serializer": Dp031Serializer,
                "parent_field": "dp030gkey",
                "lookup_field": "gkey",
                "delete_mode": "hard",
                "custom_children": ["details_dp033", "deleted_dp033"]
            },
            "dp032": {
                "model": Dp032,
                "serializer": Dp032Serializer,
                "parent_field": "dp030gkey",
                "lookup_field": "gkey",
                "delete_mode": "hard"
            },
            "dp034": {
                "model": Dp034,
                "serializer": Dp034Serializer,
                "parent_field": "dp030gkey",
                "lookup_field": "gkey",
                "delete_mode": "hard"
            },
            "dp035": {
                "model": Dp035,
                "serializer": Dp035Serializer,
                "parent_field": "dp030gkey",
                "lookup_field": "gkey",
                "delete_mode": "hard"
            },
            "dp104": {
                "model": Dp104,
                "serializer": Dp104Serializer,
                "parent_field": "dp030gkey",
                "lookup_field": "gkey",
                "delete_mode": "hard"
            }
        }
    }

    def post_detail_save_hook(self, master_instance, detail_key, detail_instances, request, raw_detail_payload=None, detail_result=None, **kwargs):
        if detail_key == "dp031" and detail_result:
            for result in detail_result:
                dp031_inst = result.get('instance')
                raw_row = result.get('raw_row')
                if dp031_inst and raw_row:
                    self._save_dp033_children(master_instance, dp031_inst, raw_row)

    def _save_dp033_children(self, master_instance, dp031_instance, raw_dp031_payload):
        details_dp033 = raw_dp031_payload.get('details_dp033', {})
        if not details_dp033:
            return

        upserts = details_dp033.get('upsert', [])
        deletes = details_dp033.get('delete', [])
        
        from django.db.models import Max
        
        # Process deletes
        real_deletes = [k for k in deletes if k and not str(k).startswith('temp_')]
        if real_deletes:
            Dp033.objects.filter(gkey__in=real_deletes).delete()
            
        # Process upserts
        sub_max = Dp033.objects.filter(dp031gkey=dp031_instance).aggregate(Max('serialno'))['serialno__max'] or 0
        for sz_data in upserts:
            sz_data_copy = {k: v for k, v in sz_data.items()}
            sz_gkey = sz_data_copy.get('gkey')
            
            is_new_size = (not sz_gkey) or str(sz_gkey).startswith('temp_')
            if is_new_size:
                sz_data_copy.pop('gkey', None)
                sz_data_copy.pop('serialno', None)
                sub_max += 1
                sz_ser = Dp033Serializer(data=sz_data_copy)
                sz_ser.is_valid(raise_exception=True)
                sz_ser.save(
                    dp031gkey=dp031_instance,
                    dp030gkey=master_instance,
                    serialno=sub_max
                )
            else:
                try:
                    sz_inst = Dp033.objects.select_for_update().get(gkey=sz_gkey)
                except Dp033.DoesNotExist:
                    raise ValueError("找不到要儲存的尺碼資料，可能已被刪除，請重新查詢後再操作。")

                sz_data_copy.pop('serialno', None)
                sz_ser = Dp033Serializer(sz_inst, data=sz_data_copy, partial=True)
                sz_ser.is_valid(raise_exception=True)
                sz_ser.save()

    def pre_deep_save_hook(self, master_data, details_data, request):
        """
        Phase 9A-2B-Fix: 在寫入資料庫前，針對 payload 進行資料範圍 (DataConstraint) 檢查，
        避免繞過 constraint 建立或更新不在權限範圍內的資料。
        """
        from api.common.filters.data_constraint import DataConstraintFilterBackend
        constraint_backend = DataConstraintFilterBackend()
        
        # 若 payload 中有 master data，進行 payload 驗證
        if master_data:
            # check_payload_constraint 會在違反時拋出 PermissionDenied
            constraint_backend.check_payload_constraint(request, master_data, self)


    def post_deep_save_hook(self, master_instance, detail_result, request):
        from api.services.sample_status_service import recalculate_sample_status
        recalculate_sample_status(dp030_keys=[master_instance.pk])

    def get_object(self):
        """
        Phase 9A-2B: 覆寫 get_object，在 retrieve / update / delete 時
        執行 DataConstraint 物件級別防護，避免透過 gkey 直接存取資料範圍外的資料。
        """
        obj = super().get_object()
        # 取得 DataConstraintFilterBackend 並執行物件級別檢查
        from api.common.filters.data_constraint import DataConstraintFilterBackend
        constraint_backend = DataConstraintFilterBackend()
        constraint_backend.get_object_constraint_check(self.request, obj, self)
        return obj

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
        try:
            from django.db.models import Q
            from django.utils.dateparse import parse_datetime
            from api.services.sample_status_service import get_sample_status_mode

            qs = Dp033.objects.filter(
                Q(dp031gkey__status__in=['1', '2']) |
                Q(dp031gkey__isnull=True, dp030gkey__status__in=['1', '2'])
            ).exclude(
                dp030gkey__status__in=['0', '3']
            ).select_related(
                'dp030gkey', 'dp031gkey', 'dp030gkey__ba010gkey', 'dp030gkey__ba015gkey', 'dp030gkey__dp002gkey',
                'dp030gkey__dp010gkey', 'dp030gkey__dp015gkey', 'dp030gkey__dp020gkey', 'dp030gkey__dp023gkey',
                'dp030gkey__es101gkey', 'dp030gkey__ba055gkey'
            ).prefetch_related(
                'shipments__dp040gkey'
            )
            
            cust = request.query_params.get('ba010gkey')
            fty = request.query_params.get('ba015gkey')
            year = request.query_params.get('year')
            season = request.query_params.get('ba055gkey')
            stype = request.query_params.get('dp002gkey')
            sampleno = request.query_params.get('sampleno')
            styleno = request.query_params.get('styleno')
            stylename = request.query_params.get('stylename')
            stock = request.query_params.get('stock')
            groupname = request.query_params.get('groupname')
            lastno = request.query_params.get('lastno')
            bottomno = request.query_params.get('bottomno')
            heelno = request.query_params.get('heelno')
            englishname = request.query_params.get('englishname')
            approve = request.query_params.get('approve')
            issuedate_from = request.query_params.get('issuedate_from')
            issuedate_to = request.query_params.get('issuedate_to')

            if cust: qs = qs.filter(dp030gkey__ba010gkey_id=cust)
            if fty: qs = qs.filter(dp030gkey__ba015gkey_id=fty)
            if year: qs = qs.filter(dp030gkey__year=year)
            if season: qs = qs.filter(dp030gkey__ba055gkey_id=season)
            if stype: qs = qs.filter(dp030gkey__dp002gkey_id=stype)
            if sampleno: qs = qs.filter(dp030gkey__sampleno__icontains=sampleno)
            if styleno: qs = qs.filter(Q(dp031gkey__styleno__icontains=styleno) | Q(dp031gkey__isnull=True, dp030gkey__styleno__icontains=styleno))
            if stylename: qs = qs.filter(dp030gkey__stylename__icontains=stylename)
            if stock: qs = qs.filter(dp030gkey__stock__icontains=stock)
            if groupname: qs = qs.filter(dp030gkey__dp023gkey__groupname__icontains=groupname)
            if lastno: qs = qs.filter(dp030gkey__dp010gkey__lastno__icontains=lastno)
            if bottomno: qs = qs.filter(dp030gkey__dp015gkey__bottomno__icontains=bottomno)
            if heelno: qs = qs.filter(dp030gkey__dp020gkey__heelno__icontains=heelno)
            if englishname: qs = qs.filter(Q(dp030gkey__es101gkey__englishname__icontains=englishname) | Q(dp030gkey__es101gkey__chinesename__icontains=englishname))
            if approve: qs = qs.filter(dp030gkey__approve=approve)

            if issuedate_from:
                dt_from = parse_datetime(issuedate_from)
                if dt_from: qs = qs.filter(dp030gkey__issuedate__gte=dt_from)
            if issuedate_to:
                dt_to = parse_datetime(issuedate_to)
                if dt_to: qs = qs.filter(dp030gkey__issuedate__lte=dt_to)

            try:
                samplestatus = get_sample_status_mode()
            except Exception:
                samplestatus = '1'

            try:
                limit = int(request.query_params.get('limit', 500))
            except ValueError:
                limit = 500
            limit = min(max(limit, 1), 2000)

            res = []
            count = 0
            for row in qs[:20000]:
                dp030 = row.dp030gkey
                dp031 = row.dp031gkey
                
                from api.services.sample_status_service import calculate_dp033_outstanding
                outst = float(calculate_dp033_outstanding(row, samplestatus_mode=samplestatus))

                if outst <= 0:
                    continue

                # Compute latest sentdate
                shipments = list(row.shipments.all())
                sent_dates = [s.dp040gkey.sentdate for s in shipments if s.dp040gkey and s.dp040gkey.sentdate]
                latest_sentdate = max(sent_dates) if sent_dates else None

                # Safe access
                cust_name = dp030.ba010gkey.shortname if dp030 and dp030.ba010gkey else ''
                fty_name = dp030.ba015gkey.shortname if dp030 and dp030.ba015gkey else ''
                season_name = dp030.ba055gkey.groupcode if dp030 and dp030.ba055gkey else ''
                sample_type = dp030.dp002gkey.sampletype if dp030 and dp030.dp002gkey else ''
                group_name = dp030.dp023gkey.groupname if dp030 and dp030.dp023gkey else ''
                last_no = dp030.dp010gkey.lastno if dp030 and dp030.dp010gkey else ''
                bottom_no = dp030.dp015gkey.bottomno if dp030 and dp030.dp015gkey else ''
                heel_no = dp030.dp020gkey.heelno if dp030 and dp030.dp020gkey else ''
                maker_name = dp030.es101gkey.chinesename if dp030 and dp030.es101gkey else ''

                res.append({
                    'gkey': row.gkey,
                    'sampleno': dp030.sampleno if dp030 else '',
                    'sampletype': sample_type,
                    'issuedate': dp030.issuedate if dp030 else None,
                    'styleno': dp031.styleno if dp031 else (dp030.styleno if dp030 else ''),
                    'stylename': dp030.stylename if dp030 else '',
                    'stock': dp030.stock if dp030 else '',
                    'customer': cust_name,
                    'factory': fty_name,
                    'season': season_name,
                    'groupname': group_name,
                    'maker_name': maker_name,
                    'color': dp031.color if dp031 else '',
                    'photopath': dp031.photopath if dp031 else '',
                    'size': row.size,
                    'custpairs': cust_pairs,
                    'keeppairs': keep_pairs,
                    'finishpairs': sent_pairs, # map to sentpairs as completed progress
                    'sentpairs': sent_pairs,
                    'receive': rec,
                    'sentdate': latest_sentdate,
                    'outstanding': outst,
                    'completion_rate': round((sent_pairs / (cust_pairs + keep_pairs) * 100), 2) if (cust_pairs + keep_pairs) > 0 else 0,
                    'lastno': last_no,
                    'bottomno': bottom_no,
                    'heelno': heel_no,
                    'duedate': dp030.duedate if dp030 else None,
                })
                count += 1
                if count >= limit:
                    break

            return Response(res)
        except Exception as e:
            return Response({'detail': f'讀取未完樣品催交數據失敗: {str(e)}'}, status=400)

    @action(detail=False, methods=['get'], url_path='label_samples')
    def label_samples(self, request):
        """
        🏷️ 樣品標籤管理資料來源 (Label Samples Aggregator)
        """
        try:
            from django.db.models import Q
            from django.utils.dateparse import parse_datetime

            qs = Dp033.objects.all().select_related(
                'dp030gkey', 'dp031gkey', 'dp030gkey__ba010gkey', 'dp030gkey__ba015gkey', 'dp030gkey__dp002gkey',
                'dp030gkey__dp010gkey', 'dp030gkey__dp015gkey', 'dp030gkey__dp020gkey', 'dp030gkey__dp023gkey',
                'dp030gkey__es101gkey', 'dp030gkey__ba055gkey', 'dp030gkey__ba009gkey', 'dp030gkey__ba005gkey',
                'dp030gkey__ba003gkey'
            )

            cust = request.query_params.get('ba010gkey')
            fty = request.query_params.get('ba015gkey')
            year = request.query_params.get('year')
            season = request.query_params.get('ba055gkey')
            stype = request.query_params.get('dp002gkey')
            sampleno = request.query_params.get('sampleno')
            styleno = request.query_params.get('styleno')
            stylename = request.query_params.get('stylename')
            stock = request.query_params.get('stock')
            groupname = request.query_params.get('groupname')
            englishname = request.query_params.get('englishname')
            ba009_ebrand = request.query_params.get('ba009_ebrand')
            dp030_ba005gkey = request.query_params.get('dp030_ba005gkey')
            statuses = request.query_params.get('statuses')
            issuedate_from = request.query_params.get('issuedate_from')
            issuedate_to = request.query_params.get('issuedate_to')

            if cust: qs = qs.filter(dp030gkey__ba010gkey_id=cust)
            if fty: qs = qs.filter(dp030gkey__ba015gkey_id=fty)
            if year: qs = qs.filter(dp030gkey__year=year)
            if season: qs = qs.filter(dp030gkey__ba055gkey_id=season)
            if stype: qs = qs.filter(dp030gkey__dp002gkey_id=stype)
            if sampleno: qs = qs.filter(dp030gkey__sampleno__icontains=sampleno)
            if styleno: qs = qs.filter(dp031gkey__styleno__icontains=styleno)
            if stylename: qs = qs.filter(dp030gkey__stylename__icontains=stylename)
            if stock: qs = qs.filter(dp030gkey__stock__icontains=stock)
            if groupname: qs = qs.filter(dp030gkey__dp023gkey__groupname__icontains=groupname)
            if englishname: qs = qs.filter(Q(dp030gkey__es101gkey__englishname__icontains=englishname) | Q(dp030gkey__es101gkey__chinesename__icontains=englishname))
            if ba009_ebrand: qs = qs.filter(dp030gkey__ba009gkey__ebrand__icontains=ba009_ebrand)
            if dp030_ba005gkey: qs = qs.filter(dp030gkey__ba005gkey_id=dp030_ba005gkey)

            if statuses and statuses != 'all':
                qs = qs.filter(dp031gkey__status__in=statuses.split(','))

            if issuedate_from:
                dt_from = parse_datetime(issuedate_from)
                if dt_from: qs = qs.filter(dp030gkey__issuedate__gte=dt_from)
            if issuedate_to:
                dt_to = parse_datetime(issuedate_to)
                if dt_to: qs = qs.filter(dp030gkey__issuedate__lte=dt_to)

            try:
                limit = int(request.query_params.get('limit', 500))
            except ValueError:
                limit = 500
            limit = min(max(limit, 1), 2000)

            res = []
            for row in qs[:limit]:
                dp030 = row.dp030gkey
                dp031 = row.dp031gkey
                
                cust_name = dp030.ba010gkey.shortname if dp030 and dp030.ba010gkey else ''
                fty_name = dp030.ba015gkey.shortname if dp030 and dp030.ba015gkey else ''
                season_name = dp030.ba055gkey.groupcode if dp030 and dp030.ba055gkey else ''
                sample_type = dp030.dp002gkey.sampletype if dp030 and dp030.dp002gkey else ''
                group_name = dp030.dp023gkey.groupname if dp030 and dp030.dp023gkey else ''
                last_no = dp030.dp010gkey.lastno if dp030 and dp030.dp010gkey else ''
                brand_name = dp030.ba009gkey.ebrand if dp030 and dp030.ba009gkey else ''
                origin_name = dp030.ba003gkey.eorigin if dp030 and dp030.ba003gkey else ''
                belongto_name = dp030.ba005gkey.ename if dp030 and dp030.ba005gkey else ''
                maker_name = dp030.es101gkey.englishname if dp030 and dp030.es101gkey else ''

                cust_pairs = float(row.custpairs or 0)
                keep_pairs = float(row.keeppairs or 0)
                qty = int((cust_pairs + keep_pairs) * 2)

                res.append({
                    'gkey': row.gkey,
                    'dp030_gkey': dp030.gkey if dp030 else '',
                    'dp031_gkey': dp031.gkey if dp031 else '',
                    'chk': 'N',
                    'qty': qty,
                    'dp031_serialno': dp031.serialno if dp031 else 0,
                    'ba010_shortname': cust_name,
                    'ba015_shortname': fty_name,
                    'dp002_esampletype': sample_type,
                    'dp030_sampleno': dp030.sampleno if dp030 else '',
                    'dp031_styleno': dp031.styleno if dp031 else (dp030.styleno if dp030 else ''),
                    'dp030_stylename': dp030.stylename if dp030 else '',
                    'dp030_stock': dp030.stock if dp030 else '',
                    'dp023_groupname': group_name,
                    'dp031_color': dp031.color if dp031 else '',
                    'dp031_ecolor': dp031.ecolor if dp031 else '',
                    'dp031_upper': dp031.upper if dp031 else '',
                    'dp031_lining': dp031.lining if dp031 else '',
                    'dp031_sock': dp031.sock if dp031 else '',
                    'dp031_bottom': dp031.bottom if dp031 else '',
                    'dp031_heel': dp031.heel if dp031 else '',
                    'dp031_tongue': dp031.tongue if dp031 else '',
                    'dp030_logo': dp030.logo if dp030 else '',
                    'dp030_duedate': dp030.duedate if dp030 else None,
                    'dp030_custdate': dp030.custdate if dp030 else None,
                    'dp033_size': row.size,
                    'custpairs': cust_pairs,
                    'keeppairs': keep_pairs,
                    'dp031_photopath': dp031.photopath if dp031 else '',
                    'dp030_year': dp030.year if dp030 else '',
                    'other1': dp031.other if dp031 else '',
                    'other2': '',
                    'other3': '',
                    'dp030_ba005gkey': dp030.ba005gkey_id if dp030 else '',
                    'dp030_ba009gkey': dp030.ba009gkey_id if dp030 else '',
                    'dp030_ba010gkey': dp030.ba010gkey_id if dp030 else '',
                    'dp030_ba015gkey': dp030.ba015gkey_id if dp030 else '',
                    'dp030_es101gkey': dp030.es101gkey_id if dp030 else '',
                    'dp030_ba055gkey': dp030.ba055gkey_id if dp030 else '',
                    'es101_englishname': maker_name,
                    'dp030_status': dp030.status if dp030 else '1',
                    'dp010_lastno': last_no,
                    'dp030_designer': dp030.designer if dp030 else '',
                    'dp015_bottomno': dp030.dp015gkey.bottomno if dp030 and dp030.dp015gkey else '',
                    'ba009_ebrand': brand_name,
                    'ba055_groupcode': season_name,
                    'dp030_construction': dp030.construction if dp030 else '',
                    'ba003_eorigin': origin_name,
                    'dp030_rqstby': dp030.rqstby if dp030 else '',
                    'dp030_issuedate': dp030.issuedate if dp030 else None,
                    'dp031_pono': dp031.pono if dp031 else '',
                    'ba005_ename': belongto_name,
                    'dp031_colorcode': dp031.colorcode if dp031 else '',
                    'dp033_barcode': row.barcode if row.barcode else '',
                })

            return Response(res)
        except Exception as e:
            return Response({'detail': f'讀取樣品 Label 資料失敗: {str(e)}'}, status=400)

    # @action(detail=False, methods=['post'], url_path='legacy_deep_save')
    def legacy_deep_save(self, request):
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
                is_new_master = (not m_gkey) or str(m_gkey).startswith('temp_')

                if is_new_master:
                    master_data.pop('gkey', None)

                    raw_sampleno = str(master_data.get('sampleno') or '').strip()
                    if (not raw_sampleno) or raw_sampleno in ['自動產生', 'AUTO', 'auto', 'Auto']:
                        master_data['sampleno'] = generate_dp030_sampleno(
                            master_data.get('year'),
                            master_data.get('ba055gkey')
                        )

                    serializer = Dp030Serializer(data=master_data)
                    serializer.is_valid(raise_exception=True)
                    master_instance = serializer.save()
                else:
                    try:
                        master_instance = Dp030.objects.select_for_update().get(gkey=m_gkey)
                    except Dp030.DoesNotExist:
                        raise ValueError("找不到要儲存的樣品主檔，可能已被刪除，請重新查詢後再操作。")

                    # 修改既有資料時，不可讓 sampleno 被清空
                    raw_sampleno = str(master_data.get('sampleno') or '').strip()
                    if not raw_sampleno:
                        raise ValueError("樣品單號不可空白，請重新查詢後再操作。")

                    serializer = Dp030Serializer(master_instance, data=master_data, partial=True)
                    serializer.is_valid(raise_exception=True)
                    master_instance = serializer.save()

                # 2. Helper to process dynamic child tables easily
                def process_child(upsert_list, delete_keys, model_cls, serializer_cls, fk_name):
                    # Process Deletes
                    real_delete_keys = [
                        k for k in delete_keys
                        if k and not str(k).startswith('temp_')
                    ]
                    if real_delete_keys:
                        model_cls.objects.filter(gkey__in=real_delete_keys).delete()

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
                        
                        is_new_child = (not gkey) or str(gkey).startswith('temp_')
                        if is_new_child:
                            data.pop('gkey', None)
                            data.pop('serialno', None)
                            max_sn += 1
                            ser = serializer_cls(data=data)
                            ser.is_valid(raise_exception=True)
                            inst = ser.save(**{fk_name: master_instance, 'serialno': max_sn})
                        else:
                            try:
                                inst = model_cls.objects.select_for_update().get(gkey=gkey)
                            except model_cls.DoesNotExist:
                                raise ValueError("找不到要儲存的明細資料，可能已被刪除，請重新查詢後再操作。")

                            data.pop('serialno', None)
                            ser = serializer_cls(inst, data=data, partial=True)
                            ser.is_valid(raise_exception=True)
                            inst = ser.save()
                        
                        # Process dynamic sub-nested sizes (Dp033) attached directly to Dp031 row
                        if model_cls == Dp031 and sub_sizes:
                            sub_up = sub_sizes.get('upsert', [])
                            sub_del = sub_sizes.get('delete', [])
                            
                            real_sub_del = [
                                k for k in sub_del
                                if k and not str(k).startswith('temp_')
                            ]
                            if real_sub_del:
                                Dp033.objects.filter(gkey__in=real_sub_del).delete()

                            sub_max = Dp033.objects.filter(dp031gkey=inst).aggregate(Max('serialno'))['serialno__max'] or 0
                            for sz_item in sub_up:
                                sz_data = {k: v for k, v in sz_item.items()}
                                sz_gkey = sz_data.get('gkey')
                                
                                is_new_size = (not sz_gkey) or str(sz_gkey).startswith('temp_')
                                if is_new_size:
                                    sz_data.pop('gkey', None)
                                    sz_data.pop('serialno', None)
                                    sub_max += 1
                                    sz_ser = Dp033Serializer(data=sz_data)
                                    sz_ser.is_valid(raise_exception=True)
                                    sz_ser.save(
                                        dp031gkey=inst,
                                        dp030gkey=master_instance,
                                        serialno=sub_max
                                    )
                                else:
                                    try:
                                        sz_inst = Dp033.objects.select_for_update().get(gkey=sz_gkey)
                                    except Dp033.DoesNotExist:
                                        raise ValueError("找不到要儲存的尺碼資料，可能已被刪除，請重新查詢後再操作。")

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

                # Ensure status is accurate after arbitrary size additions or deletions
                from api.services.sample_status_service import recalculate_sample_status
                recalculate_sample_status(dp030_keys=[master_instance.pk])

            return Response({
                "success": True,
                "message": "樣品指令單完整聯動儲存成功",
                "gkey": master_instance.gkey,
                "sampleno": master_instance.sampleno
            })
        except IntegrityError as e:
            import traceback
            traceback.print_exc()
            return Response(
                {"success": False, "detail": "樣品單號產生衝突，請重新存檔一次。"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except ValueError as e:
            return Response(
                {"success": False, "detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {"success": False, "detail": "樣品單儲存失敗，請確認資料是否完整後再試。"},
                status=status.HTTP_400_BAD_REQUEST
            )



class Dp031ViewSet(BaseDictionaryViewSet):
    http_method_names = ['get', 'head', 'options']
    """樣品配色明細 ViewSet"""
    permission_classes = [HasProgramPermission]
    program_id = 'w_dp030'
    action_program_map = {
        'dp050_query': 'w_dp050',
        'batch_save': 'w_dp050',
    }
    queryset = Dp031.objects.all()
    serializer_class = Dp031Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp030gkey = self.request.query_params.get('dp030gkey')
        if dp030gkey:
            qs = qs.filter(dp030gkey=dp030gkey)
        return qs.order_by('serialno')

    @action(detail=False, methods=['get'], url_path='dp050_query')
    def dp050_query(self, request):
        """
        回傳 DP050 上方配色 Grid 資料
        """
        # NOTE: dp031.mdes101gkey / dp031.editdate / dp031.remark do NOT exist
        # in the actual PostgreSQL database (migrations not run for those fields).
        # select_related('mdes101gkey') causes UndefinedColumn → 500. Removed.
        qs = Dp031.objects.select_related(
            'dp030gkey',
            'dp030gkey__ba010gkey',
            'dp030gkey__ba015gkey',
            'dp030gkey__ba055gkey',
            'dp030gkey__dp002gkey',
            'dp030gkey__dp023gkey',
            'dp030gkey__dp010gkey',
            'dp030gkey__dp015gkey',
            'dp030gkey__dp020gkey',
        )

        # 🔎 篩選條件
        issuedate_start = request.query_params.get('issuedate_start')
        issuedate_end = request.query_params.get('issuedate_end')
        year = request.query_params.get('year')
        ba055gkey = request.query_params.get('ba055gkey')
        dp002gkey = request.query_params.get('dp002gkey')
        sampleno = request.query_params.get('sampleno')
        stock = request.query_params.get('stock')
        stylename = request.query_params.get('stylename')
        ba010gkey = request.query_params.get('ba010gkey') or request.query_params.get('cust_no')
        ba015gkey = request.query_params.get('ba015gkey') or request.query_params.get('fact_no')
        group_name = request.query_params.get('group_name')
        maker_name = request.query_params.get('maker_name')
        styleno = request.query_params.get('styleno')
        color = request.query_params.get('color')
        
        lastno = request.query_params.get('lastno')
        bottomno = request.query_params.get('bottomno')
        heelno = request.query_params.get('heelno')

        # 進行條件過濾
        if issuedate_start:
            qs = qs.filter(dp030gkey__issuedate__gte=issuedate_start)
        if issuedate_end:
            qs = qs.filter(dp030gkey__issuedate__lte=issuedate_end)
        if year:
            qs = qs.filter(dp030gkey__year=year)
        if ba055gkey:
            qs = qs.filter(dp030gkey__ba055gkey=ba055gkey)
        if dp002gkey:
            qs = qs.filter(dp030gkey__dp002gkey=dp002gkey)
        if sampleno:
            qs = qs.filter(dp030gkey__sampleno__icontains=sampleno)
        if stock:
            qs = qs.filter(dp030gkey__stock__icontains=stock)
        if stylename:
            qs = qs.filter(dp030gkey__stylename__icontains=stylename)
        if ba010gkey:
            qs = qs.filter(dp030gkey__ba010gkey=ba010gkey)
        if ba015gkey:
            qs = qs.filter(dp030gkey__ba015gkey=ba015gkey)
        if group_name:
            qs = qs.filter(dp030gkey__dp023gkey__groupname__icontains=group_name)
        if maker_name:
            qs = qs.filter(dp030gkey__es101gkey__englishname__icontains=maker_name)
        if styleno:
            qs = qs.filter(styleno__icontains=styleno)
        if color:
            qs = qs.filter(color__icontains=color)
            
        if lastno:
            qs = qs.filter(dp030gkey__dp010gkey__lastno__icontains=lastno)
        if bottomno:
            qs = qs.filter(dp030gkey__dp015gkey__bottomno__icontains=bottomno)
        if heelno:
            qs = qs.filter(dp030gkey__dp020gkey__heelno__icontains=heelno)

        # 狀態篩選邏輯
        status_all = request.query_params.get('status_all') == 'true'
        status_list_param = request.query_params.get('status_list')
        
        if status_all:
            pass # 包含所有狀態
        elif status_list_param:
            status_list = [s.strip() for s in status_list_param.split(',') if s.strip()]
            qs = qs.filter(status__in=status_list)
        else:
            # 預設過濾：1, 2, 3，不包含 0
            qs = qs.filter(status__in=['1', '2', '3'])

        # 限制筆數
        try:
            limit = int(request.query_params.get('limit', 500))
            if limit < 1:
                limit = 500
            elif limit > 2000:
                limit = 2000
        except ValueError:
            limit = 500

        qs = qs.order_by('dp030gkey__dp002gkey', 'dp030gkey__sampleno', 'styleno', 'color')[:limit]

        # 序列化輸出
        res = []
        for row in qs:
            dp030 = row.dp030gkey
            res.append({
                "gkey": row.gkey,
                "dp031gkey": row.gkey,
                "dp030gkey": dp030.gkey if dp030 else "",
                "sampleno": dp030.sampleno if dp030 else "",
                "sampletype": dp030.dp002gkey.sampletype if dp030 and dp030.dp002gkey else "",
                "issuedate": dp030.issuedate if dp030 else None,
                "year": dp030.year if dp030 else "",
                "styleno": row.styleno or "",
                "stylename": dp030.stylename if dp030 else "",
                "stock": dp030.stock if dp030 else "",
                "customer": dp030.ba010gkey.shortname if dp030 and dp030.ba010gkey else "",
                "ba010gkey": dp030.ba010gkey.gkey if dp030 and dp030.ba010gkey else "",
                "factory": dp030.ba015gkey.shortname if dp030 and dp030.ba015gkey else "",
                "ba015gkey": dp030.ba015gkey.gkey if dp030 and dp030.ba015gkey else "",
                "season": dp030.ba055gkey.groupcode if dp030 and dp030.ba055gkey else "",
                "ba055gkey": dp030.ba055gkey.gkey if dp030 and dp030.ba055gkey else "",
                "groupname": dp030.dp023gkey.groupname if dp030 and dp030.dp023gkey else "",
                "maker_name": dp030.es101gkey.englishname if dp030 and dp030.es101gkey else "",
                "color": row.color or "",
                "ecolor": row.ecolor or "",
                "upper": row.upper or "",
                "status": row.status,
                # remark / mdes101gkey / editdate columns not in DB — omit safely
                "remark": "",
                "modify_name": "",
                "editdate": None,
                "photopath": row.photopath or "",
                "image_url": f"/media/{row.photopath}" if row.photopath else ""
            })
        return Response(res)

    @action(detail=False, methods=['post'], url_path='batch_save')
    def batch_save(self, request):
        """
        🧪 [DP050 樣品單狀態審核批次保存]:
        Updates multiple Dp031 (status, remark) and Dp033 (receive, finishpairs) records.
        """
        dp031_updates = request.data.get('dp031_updates', [])
        dp033_updates = request.data.get('dp033_updates', [])

        from decimal import Decimal
        from django.core.exceptions import ObjectDoesNotExist

        affected_dp030_keys = set()
        affected_dp031_keys = set()
        affected_dp033_keys = set()

        try:
            with transaction.atomic():
                # 1. 鎖定並更新 dp033 (尺碼明細)
                for item in dp033_updates:
                    gkey = item.get('gkey')
                    if not gkey:
                        continue
                    try:
                        d33 = Dp033.objects.select_for_update().get(pk=gkey)
                    except Dp033.DoesNotExist:
                        return Response({"detail": "找不到對應的尺碼資料，可能已被刪除，請重新查詢後再操作。"}, status=status.HTTP_400_BAD_REQUEST)

                    # thisreceive 處理與限制
                    thisreceive_val = item.get('thisreceive')
                    if thisreceive_val is not None:
                        try:
                            thisreceive = Decimal(str(thisreceive_val))
                        except Exception:
                            return Response({"detail": "本次點收數格式不正確。"}, status=status.HTTP_400_BAD_REQUEST)
                        if thisreceive < 0:
                            return Response({"detail": "本次點收數不可為負數。"}, status=status.HTTP_400_BAD_REQUEST)
                        
                        old_receive = d33.receive or Decimal('0.0')
                        new_receive = old_receive + thisreceive
                        d33.receive = new_receive

                    # finishpairs 處理與限制
                    finishpairs_val = item.get('finishpairs')
                    if finishpairs_val is not None:
                        try:
                            finishpairs = Decimal(str(finishpairs_val))
                        except Exception:
                            return Response({"detail": "完成雙數格式不正確。"}, status=status.HTTP_400_BAD_REQUEST)
                        if finishpairs < 0:
                            return Response({"detail": "完成雙數不可為負數。"}, status=status.HTTP_400_BAD_REQUEST)
                        d33.finishpairs = finishpairs

                    # 保存 d33，忽略/不允許修改 sentpairs
                    d33.save()

                    affected_dp033_keys.add(d33.gkey)
                    if d33.dp031gkey_id:
                        affected_dp031_keys.add(d33.dp031gkey_id)
                    if d33.dp030gkey_id:
                        affected_dp030_keys.add(d33.dp030gkey_id)

                # 2. 呼叫 recalculate_sample_status 處理 dp033 影響 (這會重新計算被動過尺碼的 dp031/dp030 狀態)
                if affected_dp033_keys:
                    from .services.sample_status_service import recalculate_sample_status
                    recalculate_sample_status(
                        dp033_keys=list(affected_dp033_keys)
                    )

                # 3. 鎖定並更新 dp031 (配色明細，手動覆蓋狀態)
                for item in dp031_updates:
                    gkey = item.get('gkey')
                    if not gkey:
                        continue
                    try:
                        d31 = Dp031.objects.select_for_update().get(pk=gkey)
                    except Dp031.DoesNotExist:
                        return Response({"detail": "找不到對應的配色資料，可能已被刪除，請重新查詢後再操作。"}, status=status.HTTP_400_BAD_REQUEST)

                    # 狀態不合法校驗
                    status_val = item.get('status')
                    if status_val is not None:
                        if status_val not in ['0', '1', '2', '3']:
                            return Response({"detail": "狀態值不合法。"}, status=status.HTTP_400_BAD_REQUEST)
                        
                        # 取消狀態防重開校驗
                        if d31.status == '0' and status_val != '0':
                            return Response({"detail": "取消狀態的配色不可於 DP050 重新啟用。"}, status=status.HTTP_400_BAD_REQUEST)
                        
                        d31.status = status_val

                    # NOTE: dp031.remark / dp031.editdate / dp031.mdes101gkey
                    # columns do NOT exist in the actual PostgreSQL DB.
                    # Only 'status' (and other original columns) can be saved.
                    # Skip writing to non-existent columns.

                    # Only save status (the only dp031 field DP050 can update)
                    d31.save(update_fields=['status'])

                    affected_dp031_keys.add(d31.gkey)
                    if d31.dp030gkey_id:
                        affected_dp030_keys.add(d31.dp030gkey_id)

                # 4. 為了使手動覆蓋生效，並重算 dp030 主檔狀態，我們再次呼叫 recalculate_sample_status。
                # 但這次只傳入 dp030_keys，這樣 recalculate_sample_status 只會跑第 3 步（重新計算主單狀態），
                # 就不會覆蓋我們在第 3 步中剛剛寫入的配色手動 status 覆蓋值！
                if affected_dp030_keys:
                    from .services.sample_status_service import recalculate_sample_status
                    recalculate_sample_status(
                        dp030_keys=list(affected_dp030_keys)
                    )

            return Response({
                "success": True,
                "updated_dp031_count": len(dp031_updates),
                "updated_dp033_count": len(dp033_updates),
                "affected_dp030_keys": list(affected_dp030_keys),
                "affected_dp031_keys": list(affected_dp031_keys),
                "affected_dp033_keys": list(affected_dp033_keys)
            })
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)



class Dp032ViewSet(BaseDictionaryViewSet):
    http_method_names = ['get', 'head', 'options']
    """樣品部位材料明細 ViewSet (明細：隸屬樣品單資料管理)"""
    program_id = 'w_dp030'  # 明細：隸屬 Dp030 樣品單主檔作業
    queryset = Dp032.objects.all()
    serializer_class = Dp032Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp030gkey = self.request.query_params.get('dp030gkey')
        if dp030gkey:
            qs = qs.filter(dp030gkey=dp030gkey)
        return qs.order_by('serialno')



class Dp033ViewSet(BaseDictionaryViewSet):
    http_method_names = ['get', 'head', 'options']
    """樣品配色尺碼配比 ViewSet"""
    permission_classes = [HasProgramPermission]
    program_id = 'w_dp030'
    action_program_map = {
        'dp050_sizes': 'w_dp050',
    }
    queryset = Dp033.objects.all()
    serializer_class = Dp033Serializer

    @action(detail=False, methods=['get'], url_path='dp050_sizes')
    def dp050_sizes(self, request):
        dp031gkey = request.query_params.get('dp031gkey')
        if not dp031gkey:
            return Response({"detail": "dp031gkey is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        qs = Dp033.objects.filter(dp031gkey=dp031gkey).order_by('serialno')
        res = []
        for row in qs:
            res.append({
                "gkey": row.gkey,
                "dp033gkey": row.gkey,
                "dp031gkey": row.dp031gkey_id or "",
                "dp030gkey": row.dp030gkey_id or "",
                "size": row.size or "",
                "custpairs": float(row.custpairs or 0),
                "keeppairs": float(row.keeppairs or 0),
                "sentpairs": float(row.sentpairs or 0),
                "received": float(row.receive or 0),
                "thisreceive": 0.0,
                "receive": float(row.receive or 0),
                "finishpairs": float(row.finishpairs or 0)
            })
        return Response(res)


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
    http_method_names = ['get', 'head', 'options']
    """樣品加工明細 ViewSet (明細：隸屬樣品單資料管理)"""
    program_id = 'w_dp030'  # 明細：隸屬 Dp030 樣品單主檔作業
    queryset = Dp034.objects.all()
    serializer_class = Dp034Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp030gkey = self.request.query_params.get('dp030gkey')
        if dp030gkey:
            qs = qs.filter(dp030gkey=dp030gkey)
        return qs.order_by('serialno')



class Dp035ViewSet(BaseDictionaryViewSet):
    http_method_names = ['get', 'head', 'options']
    """樣品大底履歷 ViewSet (明細：隸屬樣品單資料管理)"""
    program_id = 'w_dp030'  # 明細：隸屬 Dp030 樣品單主檔作業
    queryset = Dp035.objects.all()
    serializer_class = Dp035Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp030gkey = self.request.query_params.get('dp030gkey')
        if dp030gkey:
            qs = qs.filter(dp030gkey=dp030gkey)
        return qs.order_by('serialno')



class Dp040ViewSet(DeepSaveMixinV2, ValidationMixin, BillNoMixin, ApprovalMixin, viewsets.ModelViewSet):
    """樣品出貨單主檔 ViewSet"""

    validation_config = {
        "required_fields": [
            {"field": "year", "label": "年度"}
        ]
    }
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DataConstraintFilterBackend]
    
    billno_config = {
        "bill_field": "invoiceno",
        "date_field": "sentdate",
        "prefix": "INV",
        "serial_length": 3,
        "date_format": "%y%m",
        "separator": "-",
    }
    permission_classes = [HasProgramPermission]
    program_id = 'w_dp040'
    
    approval_config = {
        "approved_field": "approve",
        "approved_value": "Y",
        "unapproved_value": "N",
        "approver_gkey_field": "aes101gkey",
        "modify_date_field": "modifydate",
        "allow_edit_after_approve": False,
        "allow_delete_after_approve": False,
    }
    queryset = Dp040.objects.all()
    serializer_class = Dp040Serializer

    deep_save_config = {
        "master_serializer": Dp040Serializer,
        "master_lookup_field": "gkey",
        "details": {
            "dp041": {
                "model": Dp041,
                "serializer": Dp041Serializer,
                "parent_field": "dp040gkey",
                "lookup_field": "gkey",
                "delete_mode": "hard"
            },
            "dp042": {
                "model": Dp042,
                "serializer": Dp042Serializer,
                "parent_field": "dp040gkey",
                "lookup_field": "gkey",
                "delete_mode": "hard"
            },
            "dp043": {
                "model": Dp043,
                "serializer": Dp043Serializer,
                "parent_field": "dp040gkey",
                "lookup_field": "gkey",
                "delete_mode": "hard"
            }
        }
    }

    def pre_deep_save_hook(self, master_data, details_data, request):
        from api.common.filters.data_constraint import DataConstraintFilterBackend
        constraint_backend = DataConstraintFilterBackend()
        if master_data:
            constraint_backend.check_payload_constraint(request, master_data, self)
        
        self._touched_dp033_keys = set()
        
        # 處理 deleted41 字串陣列轉換與蒐集 affected dp033 keys
        deleted_41 = details_data.get('dp041', {}).get('delete', [])
        deleted_41_keys = [r.get('gkey') if isinstance(r, dict) else r for r in deleted_41]
        
        if deleted_41 and isinstance(deleted_41[0], str):
            details_data['dp041']['delete'] = [{'gkey': k} for k in deleted_41]
             
        if deleted_41_keys:
            from api.models import Dp041
            for d in Dp041.objects.filter(gkey__in=deleted_41_keys):
                if d.dp033gkey_id:
                    self._touched_dp033_keys.add(d.dp033gkey_id)
                     
        # 處理 deleted42, deleted43 的字串陣列轉換
        for dk in ['dp042', 'dp043']:
            del_list = details_data.get(dk, {}).get('delete', [])
            if del_list and isinstance(del_list[0], str):
                details_data[dk]['delete'] = [{'gkey': k} for k in del_list]

    def _save_detail_group(self, master_instance, master_pk_val, detail_key, rows, detail_config, context):
        if detail_key == 'dp043':
            for row in rows:
                if row.get('dp041gkey') in context.get("gkey_map", {}):
                    row['dp041gkey'] = context["gkey_map"][row['dp041gkey']]
                if row.get('dp042gkey') in context.get("gkey_map", {}):
                    row['dp042gkey'] = context["gkey_map"][row['dp042gkey']]
        return super()._save_detail_group(master_instance, master_pk_val, detail_key, rows, detail_config, context)

    def post_deep_save_hook(self, master_instance, detail_result, request):
        from django.db.models import Sum
        from api.models import Dp033, Dp041
        
        touched_dp033_keys = getattr(self, '_touched_dp033_keys', set())
        
        dp041_result = detail_result.get("details", {}).get("dp041", {})
        for r in dp041_result.get("upsert", []):
            if r.get("instance") and r["instance"].dp033gkey_id:
                touched_dp033_keys.add(r["instance"].dp033gkey_id)
                
        parent_dp031_keys = set()
        
        for d33_key in touched_dp033_keys:
            if not d33_key: continue
            try:
                d33 = Dp033.objects.select_for_update().get(pk=d33_key)
                total_shipped = Dp041.objects.filter(dp033gkey=d33_key).aggregate(Sum('sentpairs'))['sentpairs__sum'] or 0
                d33.finishpairs = total_shipped
                d33.save()
                if d33.dp031gkey_id: 
                    parent_dp031_keys.add(d33.dp031gkey_id)
            except Dp033.DoesNotExist:
                pass
                
        if parent_dp031_keys:
            from api.services.sample_status_service import recalculate_sample_status
            recalculate_sample_status(dp031_keys=list(parent_dp031_keys))

    def get_queryset(self):
        qs = super().get_queryset()
        invoiceno = self.request.query_params.get('invoiceno')
        year = self.request.query_params.get('year')
        if invoiceno:
            qs = qs.filter(invoiceno__icontains=invoiceno)
        if year:
            qs = qs.filter(year=year)
        return qs.order_by('-sentdate', '-invoiceno')

    @action(detail=False, methods=['get'], url_path='next_invoice_no')
    def next_invoice_no(self, request):
        from django.utils import timezone
        today_str = timezone.localtime().strftime('%Y%m%d')
        prefix = today_str
        candidates = Dp040.objects.filter(invoiceno__startswith=prefix).values_list('invoiceno', flat=True)
        
        max_seq = 0
        for val in candidates:
            if len(val) >= len(prefix) + 4:
                suffix = val[len(prefix):len(prefix)+4]
                try:
                    seq = int(suffix)
                    if seq > max_seq:
                        max_seq = seq
                except ValueError:
                    pass
            elif len(val) > len(prefix):
                suffix = val[len(prefix):]
                try:
                    seq = int(suffix)
                    if seq > max_seq:
                        max_seq = seq
                except ValueError:
                    pass
                    
        next_seq = max_seq + 1
        next_invoiceno = f"{prefix}{next_seq:04d}"
        return Response({"invoiceno": next_invoiceno})

    @action(detail=False, methods=['get'], url_path='import_candidates')
    def import_candidates(self, request):
        from decimal import Decimal
        from rest_framework import status
        
        ba010gkey = request.query_params.get('ba010gkey')
        if not ba010gkey:
            return Response({"detail": "ba010gkey is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        ba015gkey = request.query_params.get('ba015gkey')
        sampleno = request.query_params.get('sampleno')
        styleno = request.query_params.get('styleno')
        stylename = request.query_params.get('stylename')
        stock = request.query_params.get('stock')
        year = request.query_params.get('year')
        ba055gkey = request.query_params.get('ba055gkey')
        dp002gkey = request.query_params.get('dp002gkey')
        size = request.query_params.get('size')
        color = request.query_params.get('color')
        samplestatus = request.query_params.get('samplestatus', '1')
        
        from api.models import Dp033
        
        qs = Dp033.objects.select_related(
            'dp030gkey',
            'dp031gkey',
            'dp030gkey__ba010gkey',
            'dp030gkey__ba015gkey',
            'dp030gkey__ba055gkey',
            'dp030gkey__dp002gkey'
        )
        
        qs = qs.filter(dp030gkey__ba010gkey=ba010gkey)
        
        # Exclude cancelled status
        qs = qs.exclude(dp030gkey__status='0')
        qs = qs.exclude(dp031gkey__status='0')
        
        # Exclude completed status
        qs = qs.exclude(dp030gkey__status='3')
        
        # Apply optional filters
        if ba015gkey:
            qs = qs.filter(dp030gkey__ba015gkey=ba015gkey)
        if sampleno:
            qs = qs.filter(dp030gkey__sampleno__icontains=sampleno)
        if styleno:
            qs = qs.filter(dp031gkey__styleno__icontains=styleno)
        if stylename:
            qs = qs.filter(dp030gkey__stylename__icontains=stylename)
        if stock:
            qs = qs.filter(dp030gkey__stock__icontains=stock)
        if year:
            qs = qs.filter(dp030gkey__year=year)
        if ba055gkey:
            qs = qs.filter(dp030gkey__ba055gkey=ba055gkey)
        if dp002gkey:
            qs = qs.filter(dp030gkey__dp002gkey=dp002gkey)
        if size:
            qs = qs.filter(size=size)
        if color:
            qs = qs.filter(dp031gkey__color__icontains=color)
            
        candidates = []
        for s in qs:
            from api.services.sample_status_service import calculate_dp033_outstanding
            outstanding = calculate_dp033_outstanding(s, samplestatus_mode=samplestatus)
            
            if outstanding <= 0:
                continue
                
            customer_name = getattr(getattr(s.dp030gkey, 'ba010gkey', None), 'shortname', '')
            factory_name = getattr(getattr(s.dp030gkey, 'ba015gkey', None), 'shortname', '')
            season_name = getattr(getattr(s.dp030gkey, 'ba055gkey', None), 'groupcode', '')
            sampletype_name = getattr(getattr(s.dp030gkey, 'dp002gkey', None), 'sampletype', '')
            brand_name_val = getattr(getattr(s.dp030gkey, 'ba009gkey', None), 'ebrand', '') or getattr(getattr(s.dp030gkey, 'ba009gkey', None), 'cbrand', '') or ''
            bottom_val = getattr(s.dp031gkey, 'bottom', '') or ''
            photopath_val = getattr(s.dp031gkey, 'photopath', '') or getattr(s.dp030gkey, 'photopath', '') or ''
            
            price_val = getattr(s.dp031gkey, 'price', Decimal('0')) or Decimal('0')
            
            candidates.append({
                "dp033gkey": s.gkey,
                "dp030gkey": s.dp030gkey.gkey if s.dp030gkey else None,
                "dp031gkey": s.dp031gkey.gkey if s.dp031gkey else None,
                "sampleno": s.dp030gkey.sampleno if s.dp030gkey else '',
                "styleno": s.dp031gkey.styleno if s.dp031gkey else '',
                "stylename": s.dp030gkey.stylename if s.dp030gkey else '',
                "stock": s.dp030gkey.stock if s.dp030gkey else '',
                "color": s.dp031gkey.color if s.dp031gkey else '',
                "ecolor": s.dp031gkey.ecolor if s.dp031gkey else '',
                "size": s.size or '',
                "barcode": s.barcode or '',
                "custpairs": float(custpairs),
                "keeppairs": float(keeppairs),
                "sentpairs": float(sentpairs),
                "receive": float(receive),
                "finishpairs": float(finishpairs),
                "outstanding_to_send": float(outstanding),
                "price": float(price_val),
                "amount": float(outstanding * price_val),
                "ba010gkey": s.dp030gkey.ba010gkey.gkey if s.dp030gkey and s.dp030gkey.ba010gkey else None,
                "customer": customer_name,
                "ba015gkey": s.dp030gkey.ba015gkey.gkey if s.dp030gkey and s.dp030gkey.ba015gkey else None,
                "factory": factory_name,
                "season": season_name,
                "sampletype": sampletype_name,
                "brand": brand_name_val,
                "bottom": bottom_val,
                "photopath": photopath_val
            })
            
        try:
            limit = int(request.query_params.get('limit', 500))
            if limit < 1:
                limit = 500
            elif limit > 2000:
                limit = 2000
        except ValueError:
            limit = 500
            
        return Response(candidates[:limit])


    # @action(detail=False, methods=['post'], url_path='legacy_deep_save')
    def legacy_deep_save(self, request):
        self.check_deep_save_validation(request)
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
                
                # Use SampleStatusService to safely recalculate Dp031 and Dp030 statuses
                if parent_dp031_keys:
                    from api.services.sample_status_service import recalculate_sample_status
                    recalculate_sample_status(dp031_keys=list(parent_dp031_keys))
                        
            return Response({
                "success": True,
                "message": "出貨交易與進度回灌演算完畢！",
                "gkey": master_obj.pk
            })
        except Exception as e:
            return Response({"success": False, "detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)



class Dp041ViewSet(BaseDictionaryViewSet):
    http_method_names = ['get', 'head', 'options']
    """樣品出貨明細 ViewSet (明細：隸屬樣品出貨單管理)"""
    program_id = 'w_dp040'  # 明細：隸屬 Dp040 樣品出貨主檔作業
    queryset = Dp041.objects.all()
    serializer_class = Dp041Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp040gkey = self.request.query_params.get('dp040gkey')
        if dp040gkey:
            qs = qs.filter(dp040gkey=dp040gkey)
        return qs.order_by('serialno')



class Dp042ViewSet(BaseDictionaryViewSet):
    http_method_names = ['get', 'head', 'options']
    """樣品出貨重量規格 ViewSet (明細：隸屬樣品出貨單管理)"""
    program_id = 'w_dp040'  # 明細：隸屬 Dp040 樣品出貨主檔作業
    queryset = Dp042.objects.all()
    serializer_class = Dp042Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp040gkey = self.request.query_params.get('dp040gkey')
        if dp040gkey:
            qs = qs.filter(dp040gkey=dp040gkey)
        return qs.order_by('carton')



class Dp043ViewSet(BaseDictionaryViewSet):
    http_method_names = ['get', 'head', 'options']
    """樣品出貨裝箱 ViewSet (明細：隸屬樣品出貨單管理)"""
    program_id = 'w_dp040'  # 明細：隸屬 Dp040 樣品出貨主檔作業
    queryset = Dp043.objects.all()
    serializer_class = Dp043Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp040gkey = self.request.query_params.get('dp040gkey')
        if dp040gkey:
            qs = qs.filter(dp040gkey=dp040gkey)
        return qs.order_by('styleno', 'size')




class Dp055ViewSet(viewsets.ViewSet):
    """
    DP055 樣品成本核算管理專用 ViewSet。

    使用既有 dp030 / dp031 / dp032 三張資料表。
    不新增 dp055 table。

    API field mapping:
        master.ba060gkey  ←→  dp030.aba060gkey  (legacy field, do NOT add dp030.ba060gkey)
    """
    permission_classes = [HasProgramPermission]
    program_id = 'w_dp055'

    # ── list_costed ──────────────────────────────────────────────────────────

    @action(detail=False, methods=['get'], url_path='list_costed')
    def list_costed(self, request):
        """
        查詢已完成成本核算的樣品單（dp030.cost = 'Y'）。

        GET /api/dp055/list_costed/
        支援 query params：sampleno, styleno, year, ba010gkey, ba015gkey, ba055gkey, status, capprove
        """
        try:
            qs = Dp030.objects.filter(cost='Y').select_related(
                'ba010gkey', 'ba015gkey', 'ba055gkey', 'ba009gkey', 'aba060gkey'
            ).order_by('-costdate', '-sampleno')

            # Query params filtering
            sampleno = request.query_params.get('sampleno')
            styleno = request.query_params.get('styleno')
            year = request.query_params.get('year')
            ba010gkey = request.query_params.get('ba010gkey')
            ba015gkey = request.query_params.get('ba015gkey')
            ba055gkey = request.query_params.get('ba055gkey')
            status_val = request.query_params.get('status')
            capprove = request.query_params.get('capprove')

            if sampleno:
                qs = qs.filter(sampleno__icontains=sampleno)
            if styleno:
                qs = qs.filter(styleno__icontains=styleno)
            if year:
                qs = qs.filter(year=year)
            if ba010gkey:
                qs = qs.filter(ba010gkey_id=ba010gkey)
            if ba015gkey:
                qs = qs.filter(ba015gkey_id=ba015gkey)
            if ba055gkey:
                qs = qs.filter(ba055gkey_id=ba055gkey)
            if status_val:
                qs = qs.filter(status=status_val)
            if capprove:
                qs = qs.filter(capprove=capprove)

            results = []
            for obj in qs[:500]:
                results.append({
                    "gkey": obj.gkey,
                    "sampleno": obj.sampleno,
                    "styleno": obj.styleno or "",
                    "stylename": obj.stylename or "",
                    "year": obj.year or "",
                    "season": obj.ba055gkey.groupcode if obj.ba055gkey else "",
                    "customer": obj.ba010gkey.shortname if obj.ba010gkey else "",
                    "factory": obj.ba015gkey.shortname if obj.ba015gkey else "",
                    "brand": obj.ba009gkey.cbrand if obj.ba009gkey else "",
                    "status": obj.status or "",
                    "capprove": obj.capprove or "N",
                    "costdate": obj.costdate.isoformat() if obj.costdate else None,
                    "totalfob": str(obj.totalfob or 0),
                    "wagescost": str(obj.wagescost or 0),
                    "managecost": str(obj.managecost or 0),
                    "profit": str(obj.profit or 0),
                    # DP055 API field "ba060gkey" maps to legacy dp030.aba060gkey
                    "ba060gkey": obj.aba060gkey_id,
                })

            return Response(results)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"detail": f"list_costed 查詢失敗：{str(e)}"}, status=400)

    # ── list_uncosted ────────────────────────────────────────────────────────

    @action(detail=False, methods=['get'], url_path='list_uncosted')
    def list_uncosted(self, request):
        """
        查詢尚未進行成本核算的樣品單（dp030.cost != 'Y' 或 cost is null）。
        用作 DP055 匯入開窗的資料來源。

        GET /api/dp055/list_uncosted/
        支援 query params：sampleno, styleno, year, ba010gkey, ba015gkey, ba055gkey, status
        """
        try:
            from django.db.models import Q
            qs = Dp030.objects.filter(
                Q(cost__isnull=True) | ~Q(cost='Y')
            ).select_related(
                'ba010gkey', 'ba015gkey', 'ba055gkey', 'ba009gkey'
            ).order_by('-issuedate', '-sampleno')

            # Query params filtering
            sampleno = request.query_params.get('sampleno')
            styleno = request.query_params.get('styleno')
            year = request.query_params.get('year')
            ba010gkey = request.query_params.get('ba010gkey')
            ba015gkey = request.query_params.get('ba015gkey')
            ba055gkey = request.query_params.get('ba055gkey')
            status_val = request.query_params.get('status')

            if sampleno:
                qs = qs.filter(sampleno__icontains=sampleno)
            if styleno:
                qs = qs.filter(styleno__icontains=styleno)
            if year:
                qs = qs.filter(year=year)
            if ba010gkey:
                qs = qs.filter(ba010gkey_id=ba010gkey)
            if ba015gkey:
                qs = qs.filter(ba015gkey_id=ba015gkey)
            if ba055gkey:
                qs = qs.filter(ba055gkey_id=ba055gkey)
            if status_val:
                qs = qs.filter(status=status_val)

            results = []
            for obj in qs[:500]:
                results.append({
                    "gkey": obj.gkey,
                    "sampleno": obj.sampleno,
                    "styleno": obj.styleno or "",
                    "stylename": obj.stylename or "",
                    "year": obj.year or "",
                    "season": obj.ba055gkey.groupcode if obj.ba055gkey else "",
                    "customer": obj.ba010gkey.shortname if obj.ba010gkey else "",
                    "factory": obj.ba015gkey.shortname if obj.ba015gkey else "",
                    "brand": obj.ba009gkey.cbrand if obj.ba009gkey else "",
                    "status": obj.status or "",
                    "issuedate": obj.issuedate.isoformat() if obj.issuedate else None,
                })

            return Response(results)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"detail": f"list_uncosted 查詢失敗：{str(e)}"}, status=400)

    # ── retrieve_workbench ───────────────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='retrieve_workbench')
    def retrieve_workbench(self, request, pk=None):
        """
        依 dp030.gkey 載入 DP055 編輯工作區資料。

        GET /api/dp055/{gkey}/retrieve_workbench/
        回傳固定三段結構：master / colors / bom_details
        """
        try:
            obj = Dp030.objects.select_related('aba060gkey').get(gkey=pk)
        except Dp030.DoesNotExist:
            return Response({"detail": "樣品單不存在。"}, status=404)

        return Response(_build_workbench_response(obj))

    # ── import_sample ────────────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='import_sample')
    def import_sample(self, request, pk=None):
        """
        將未核算樣品單轉入 DP055 成本核算工作區（初始化核算欄位）。

        POST /api/dp055/{gkey}/import_sample/

        注意：
        - 若 dp030.cost = 'Y'，拒絕重複匯入（請先 reset_costing）。
        - 初始化 dp030 核算欄位（不清空 aba060gkey）。
        - 初始化 dp032 各色的 loss/yield/exrate/grossyield/totalcost/nutax。
        - 初始化 dp031.chk = 'N'。
        """
        try:
            obj = Dp030.objects.get(gkey=pk)
        except Dp030.DoesNotExist:
            return Response({"detail": "樣品單不存在。"}, status=404)

        if obj.cost == 'Y':
            return Response(
                {"detail": "此樣品單已完成核算（cost='Y'）。若要重新核算，請先執行 reset_costing。"},
                status=400
            )

        cost_param = get_cost_parameter()    # 損耗率預設 (e.g. 2%)
        nutax_rate = get_nutax_parameter()   # 未稅比率 (e.g. 0.83)

        try:
            with transaction.atomic():
                today = tz_utils.now().date()

                # 初始化 dp030 核算欄位
                # NOTE: aba060gkey 保留，不清空（幣別是樣品單既有屬性）
                obj.costdate = today
                obj.cost = 'N'   # 尚未完成，等 save_costing 才設 'Y'
                obj.wagescost = Decimal("0")
                obj.managecost = Decimal("0")
                obj.profit = Decimal("0")
                obj.lop = Decimal("0")
                obj.totalfob = Decimal("0")
                obj.capprove = 'N'
                obj.costremark = ''
                obj.save(update_fields=[
                    'costdate', 'cost', 'wagescost', 'managecost', 'profit',
                    'lop', 'totalfob', 'capprove', 'costremark'
                ])

                # 初始化 dp031.chk = 'N'
                # TODO: 確認 PB 行為，是否某些情況下 chk 需預設 'Y'
                colors = list(obj.details_dp031.order_by('serialno'))
                for color in colors:
                    color.chk = 'N'
                    color.save(update_fields=['chk'])

                # 初始化 dp032 各色成本欄位
                bom_rows = list(obj.details_dp032.order_by('serialno'))
                for row in bom_rows:
                    update_fields = []
                    for n in [1, 2, 3, 4]:
                        # 損耗率預設 = CostParameter
                        setattr(row, f'loss{n}', cost_param)
                        update_fields.append(f'loss{n}')

                        # yield 預設 = qprp × totalpairs[n]
                        # 依對應 serialno=n 的配色 totalpairs 計算
                        # TODO: PB 有特殊客戶（如 wx）的計算方式不同，目前用標準公式
                        color_n = next((c for c in colors if c.serialno == n), None)
                        totalpairs = _dp055_to_decimal(color_n.totalpairs if color_n else 0)
                        qprp = _dp055_to_decimal(row.qprp)
                        y = qprp * totalpairs
                        setattr(row, f'yield{n}', y)
                        update_fields.append(f'yield{n}')

                        # exrate 預設 = 1（若已有值則保留）
                        existing_exrate = _dp055_to_decimal(getattr(row, f'exrate{n}', 1), "1")
                        if existing_exrate == Decimal("0"):
                            existing_exrate = Decimal("1")
                        setattr(row, f'exrate{n}', existing_exrate)
                        update_fields.append(f'exrate{n}')

                        # 計算衍生欄位
                        derived = _recalculate_dp032_row(row, n, nutax_rate)
                        for k, v in derived.items():
                            setattr(row, k, v)
                            update_fields.append(k)

                    row.save(update_fields=list(set(update_fields)))

                # 重新讀取後回傳
                obj.refresh_from_db()

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"detail": f"import_sample 失敗：{str(e)}"}, status=400)

        return Response(_build_workbench_response(obj))

    # ── save_costing ─────────────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='save_costing')
    def save_costing(self, request, pk=None):
        """
        儲存 DP055 工作區資料，後端重新計算並將 dp030.cost 設為 'Y'。

        POST /api/dp055/{gkey}/save_costing/

        Request body:
        {
          "master": {
            "wagescost": 100, "managecost": 50, "profit": 30,
            "costremark": "...",
            "ba060gkey": "...",   <- 寫入 dp030.aba060gkey（不是 ba060gkey）
            "capprove": "N"
          },
          "colors": [{"gkey": "...", "chk": "Y"}],
          "bom_details": [{"gkey": "...", "cost1": 10, "yield1": 2, "loss1": 2, ...}]
        }
        """
        try:
            obj = Dp030.objects.select_for_update().get(gkey=pk)
        except Dp030.DoesNotExist:
            return Response({"detail": "樣品單不存在。"}, status=404)

        # 已審核不允許修改
        if obj.capprove == 'Y':
            return Response(
                {"detail": "此樣品單已審核（capprove='Y'），不允許修改。如需修改請先取消審核。"},
                status=status.HTTP_403_FORBIDDEN
            )

        master_data = request.data.get('master', {})
        colors_data = request.data.get('colors', [])
        bom_data = request.data.get('bom_details', [])
        nutax_rate = get_nutax_parameter()

        try:
            with transaction.atomic():
                # 1. 更新 dp030 可編輯成本欄位
                wagescost = _dp055_to_decimal(master_data.get('wagescost', obj.wagescost))
                managecost = _dp055_to_decimal(master_data.get('managecost', obj.managecost))
                profit = _dp055_to_decimal(master_data.get('profit', obj.profit))
                lop = wagescost + managecost + profit

                obj.wagescost = wagescost
                obj.managecost = managecost
                obj.profit = profit
                obj.lop = lop
                obj.costremark = master_data.get('costremark', obj.costremark or '')
                obj.capprove = master_data.get('capprove', obj.capprove or 'N')

                # DP055 API field "ba060gkey" maps to legacy dp030.aba060gkey.
                # Do NOT write to dp030.ba060gkey.
                if 'ba060gkey' in master_data:
                    obj.aba060gkey_id = master_data['ba060gkey']

                # 2. 更新 dp031.chk
                color_map = {c['gkey']: c for c in colors_data if 'gkey' in c}
                colors = list(obj.details_dp031.order_by('serialno'))
                for color in colors:
                    if color.gkey in color_map:
                        color.chk = color_map[color.gkey].get('chk', color.chk or 'N')
                        color.save(update_fields=['chk'])

                # 3. 更新 dp032 核算欄位，後端重新計算衍生值
                bom_map = {b['gkey']: b for b in bom_data if 'gkey' in b}
                bom_rows = list(obj.details_dp032.order_by('serialno'))
                for row in bom_rows:
                    if row.gkey not in bom_map:
                        continue
                    bd = bom_map[row.gkey]
                    update_fields = []

                    for n in [1, 2, 3, 4]:
                        changed = False
                        for field in [f'cost{n}', f'yield{n}', f'loss{n}', f'exrate{n}', f'uom{n}']:
                            if field in bd:
                                # Safe exrate: cannot be 0
                                if field.startswith('exrate'):
                                    val = _dp055_to_decimal(bd[field], "1")
                                    if val == Decimal("0"):
                                        val = Decimal("1")
                                else:
                                    val = _dp055_to_decimal(bd[field]) if not field.startswith('uom') else (bd[field] or '')
                                setattr(row, field, val)
                                update_fields.append(field)
                                changed = True

                        if changed:
                            # 後端重新計算衍生欄位（不信任前端）
                            derived = _recalculate_dp032_row(row, n, nutax_rate)
                            for k, v in derived.items():
                                setattr(row, k, v)
                                update_fields.append(k)

                    if update_fields:
                        row.save(update_fields=list(set(update_fields)))

                # 4. 後端重新計算 totalfob（不信任前端的值）
                bom_rows_fresh = list(obj.details_dp032.order_by('serialno'))
                colors_fresh = list(obj.details_dp031.order_by('serialno'))
                obj.totalfob = _recalculate_total_fob(
                    wagescost, managecost, profit, colors_fresh, bom_rows_fresh
                )

                # 5. 設為已核算
                obj.cost = 'Y'
                if not obj.costdate:
                    obj.costdate = tz_utils.now().date()

                obj.save(update_fields=[
                    'wagescost', 'managecost', 'profit', 'lop', 'totalfob',
                    'costremark', 'capprove', 'aba060gkey', 'cost', 'costdate'
                ])

                obj.refresh_from_db()

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"detail": f"save_costing 失敗：{str(e)}"}, status=400)

        return Response(_build_workbench_response(obj))

    # ── reset_costing ────────────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='reset_costing')
    def reset_costing(self, request, pk=None):
        """
        重置核算狀態（對應舊 PB 的「刪除」行為）。

        POST /api/dp055/{gkey}/reset_costing/

        注意：
        - 這不是物理刪除，只是將 dp030.cost 設回 'N'，並清空核算欄位。
        - 不清空 dp030.aba060gkey（幣別是樣品單既有屬性，不屬於核算暫存欄位）。
        - 完成後該樣品單將重新出現在 list_uncosted。
        """
        try:
            obj = Dp030.objects.get(gkey=pk)
        except Dp030.DoesNotExist:
            return Response({"detail": "樣品單不存在。"}, status=404)

        try:
            with transaction.atomic():
                # 1. 重置 dp030 核算欄位
                # 注意：aba060gkey 不清空（幣別是樣品單既有屬性）
                obj.cost = 'N'
                obj.costdate = None  # TODO: 確認 PB 是否保留 costdate；目前先清空
                obj.wagescost = Decimal("0")
                obj.managecost = Decimal("0")
                obj.profit = Decimal("0")
                obj.lop = Decimal("0")
                obj.totalfob = Decimal("0")
                obj.costremark = ''
                obj.capprove = 'N'
                obj.save(update_fields=[
                    'cost', 'costdate', 'wagescost', 'managecost', 'profit',
                    'lop', 'totalfob', 'costremark', 'capprove'
                ])

                # 2. 重置 dp031.chk = 'N'（全部配色）
                obj.details_dp031.all().update(chk='N')

                # 3. 重置 dp032 核算欄位（歸零/清空）
                # exrate1~4 設回 1（預設匯率）
                # TODO: 確認 PB 是否將 exrate 清為 null 或保留為 1
                reset_vals = {}
                for n in [1, 2, 3, 4]:
                    reset_vals[f'yield{n}'] = Decimal("0")
                    reset_vals[f'grossyield{n}'] = Decimal("0")
                    reset_vals[f'totalcost{n}'] = Decimal("0")
                    reset_vals[f'nutax{n}'] = Decimal("0")
                    reset_vals[f'exrate{n}'] = Decimal("1")  # TODO: 或 null？先設 1
                    reset_vals[f'uom{n}'] = ''
                obj.details_dp032.all().update(**reset_vals)

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"detail": f"reset_costing 失敗：{str(e)}"}, status=400)

        return Response({
            "success": True,
            "message": "DP055 costing reset successfully",
            "gkey": pk,
        })


# ============================================================================
# 👞 DP 模組第一批 Pattern R 查詢報表作業 API ViewSets (DP060, DP065, DP070, DP095)
# ============================================================================

from django.db import connection



class Dp060ViewSet(viewsets.ViewSet):
    """大底量產統計查詢 ViewSet"""
    program_id = 'w_dp060'

    @action(detail=False, methods=['get'])
    def query(self, request):
        bottomno = request.query_params.get('bottomno')
        customer = request.query_params.get('customer')
        factory = request.query_params.get('factory')
        lastno = request.query_params.get('lastno')
        styleno = request.query_params.get('styleno')
        pono = request.query_params.get('pono')

        orddate_from = request.query_params.get('orddate_from')
        orddate_to = request.query_params.get('orddate_to')
        custno = request.query_params.get('custno')
        factno = request.query_params.get('factno')
        year = request.query_params.get('year')
        ba055gkey = request.query_params.get('ba055gkey')
        gender_gkey = request.query_params.get('gender_gkey')

        # Compatibility with old parameter names from frontend
        if not customer:
            customer = request.query_params.get('shortname') or request.query_params.get('cust')
        if not factory:
            factory = request.query_params.get('factno') or request.query_params.get('fty')

        # PB Window: w_dp060
        # PB DataWindow: d_dp060_query
        # Purpose: 大底量產統計查詢
        sql = """
            SELECT DISTINCT dp015.bottomno, dp010.lastno, sa031.styleno, ba010.shortname, 
                            ba015.shortname, sa030.pono, dp004.gender, SUM(sa032.pairs) as totalpairs, 
                            sa032.sizerun, sa030.ba010gkey, sa030.ba015gkey, dp015.photopath,
                            sa030.orddate, sa030.year, sa030.ba055gkey
            FROM dp015 
            LEFT JOIN sa031 ON sa031.dp015gkey = dp015.gkey 
            LEFT JOIN dp010 ON dp010.gkey = sa031.dp010gkey
            LEFT JOIN sa030 ON sa030.gkey = sa031.sa030gkey
            LEFT JOIN sa032 ON sa031.gkey = sa032.sa031gkey 
            LEFT JOIN ba010 ON ba010.gkey = sa030.ba010gkey
            LEFT JOIN ba015 ON ba015.gkey = sa030.ba015gkey
            LEFT JOIN dp004 ON dp004.gkey = sa031.dp004gkey
            LEFT JOIN dp016 ON dp016.dp015gkey = dp015.gkey AND dp016.serialno = 1
            WHERE sa032.status NOT IN ('0','6','A')
        """

        params = []
        if bottomno:
            sql += " AND dp015.bottomno ILIKE %s"
            params.append(f"%{bottomno}%")
        if customer:
            sql += " AND ba010.shortname ILIKE %s"
            params.append(f"%{customer}%")
        if factory:
            sql += " AND ba015.shortname ILIKE %s"
            params.append(f"%{factory}%")
        if lastno:
            sql += " AND dp010.lastno ILIKE %s"
            params.append(f"%{lastno}%")
        if styleno:
            sql += " AND sa031.styleno ILIKE %s"
            params.append(f"%{styleno}%")
        if pono:
            sql += " AND sa030.pono ILIKE %s"
            params.append(f"%{pono}%")
        if orddate_from:
            sql += " AND sa030.orddate >= %s"
            params.append(orddate_from)
        if orddate_to:
            sql += " AND sa030.orddate <= %s"
            params.append(orddate_to)
        if custno:
            sql += " AND ba010.custno ILIKE %s"
            params.append(f"%{custno}%")
        if factno:
            sql += " AND ba015.factno ILIKE %s"
            params.append(f"%{factno}%")
        if year:
            sql += " AND sa030.year = %s"
            params.append(year)
        if ba055gkey:
            sql += " AND sa030.ba055gkey = %s"
            params.append(ba055gkey)
        if gender_gkey:
            sql += " AND dp016.dp004gkey = %s"
            params.append(gender_gkey)

        sql += """
            GROUP BY dp015.bottomno, dp010.lastno, sa031.styleno, ba010.shortname, 
                     ba015.shortname, sa030.pono, dp004.gender, sa032.sizerun, 
                     sa030.ba010gkey, sa030.ba015gkey, dp015.photopath,
                     sa030.orddate, sa030.year, sa030.ba055gkey
            ORDER BY dp015.bottomno
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall()

        results = []
        for r in rows:
            results.append({
                'bottomno': r[0] or '',
                'lastno': r[1] or '',
                'styleno': r[2] or '',
                'customer_shortname': r[3] or '',
                'factory_shortname': r[4] or '',
                'pono': r[5] or '',
                'gender': r[6] or '',
                'totalpairs': float(r[7]) if r[7] is not None else 0.0,
                'sizerun': r[8] or '',
                'ba010gkey': r[9] or '',
                'ba015gkey': r[10] or '',
                'photopath': r[11] or '',
                'orddate': r[12].isoformat() if r[12] is not None else None,
                'year': r[13] or '',
                'ba055gkey': r[14] or '',
            })
        return Response(results)



class Dp065ViewSet(viewsets.ViewSet):
    """型體量產統計查詢 ViewSet"""
    program_id = 'w_dp065'

    @action(detail=False, methods=['get'])
    def query(self, request):
        styleno = request.query_params.get('styleno')
        customer = request.query_params.get('customer')
        factory = request.query_params.get('factory')
        group = request.query_params.get('group')
        brand = request.query_params.get('brand')
        maker = request.query_params.get('maker')

        orddate_from = request.query_params.get('orddate_from')
        orddate_to = request.query_params.get('orddate_to')
        custno = request.query_params.get('custno')
        factno = request.query_params.get('factno')
        ba005gkey = request.query_params.get('ba005gkey')
        stylename = request.query_params.get('stylename')
        stock = request.query_params.get('stock')
        year = request.query_params.get('year')
        ba055gkey = request.query_params.get('ba055gkey')

        # Compatibility with old parameter names from frontend
        if not customer:
            customer = request.query_params.get('cust')
        if not factory:
            factory = request.query_params.get('fty')

        # PB Window: w_dp065
        # PB DataWindow: d_dp065_query
        # Purpose: 型體量產統計查詢
        sql = """
            SELECT DISTINCT dp031.styleno, 
                   (SELECT a.stylename FROM dp030 a WHERE a.gkey = 
                      (SELECT e.gkey FROM dp030 e LEFT JOIN dp031 f ON f.dp030gkey = e.gkey
                       WHERE f.styleno = dp031.styleno ORDER BY e.issuedate ASC, e.gkey ASC LIMIT 1)) as stylename, 
                   (SELECT a.stock FROM dp030 a WHERE a.gkey = 
                      (SELECT e.gkey FROM dp030 e LEFT JOIN dp031 f ON f.dp030gkey = e.gkey
                       WHERE f.styleno = dp031.styleno ORDER BY e.issuedate ASC, e.gkey ASC LIMIT 1)) as stock, 
                   dp023.groupname as group_name, 
                   ba010.shortname as customer_shortname, 
                   ba015.shortname as factory_shortname, 
                   sa030.pono, 
                   SUM(sa031.pairs) as totalpairs, 
                   sa031.photopath,
                   sa030.year,
                   sa030.ba055gkey,
                   sa030.ba005gkey,
                   sa030.orddate,
                   es101.englishname
            FROM dp031
            LEFT JOIN sa031 ON sa031.styleno = dp031.styleno
            LEFT JOIN sa030 ON sa030.gkey = sa031.sa030gkey
            LEFT JOIN dp030 ON dp030.gkey = dp031.dp030gkey
            LEFT JOIN ba010 ON ba010.gkey = sa030.ba010gkey
            LEFT JOIN ba015 ON ba015.gkey = sa030.ba015gkey
            LEFT JOIN dp023 ON dp023.gkey = dp030.dp023gkey
            LEFT JOIN ba009 ON ba009.gkey = dp030.ba009gkey
            LEFT JOIN es101 ON es101.gkey = dp030.es101gkey
            WHERE sa030.status NOT IN ('0', '6', 'A')
        """

        params = []
        if styleno:
            sql += " AND dp031.styleno ILIKE %s"
            params.append(f"%{styleno}%")
        if customer:
            sql += " AND ba010.shortname ILIKE %s"
            params.append(f"%{customer}%")
        if factory:
            sql += " AND ba015.shortname ILIKE %s"
            params.append(f"%{factory}%")
        if group:
            if len(group) == 20 and group.isalnum():
                sql += " AND dp030.dp023gkey = %s"
                params.append(group)
            else:
                sql += " AND dp023.groupname ILIKE %s"
                params.append(f"%{group}%")
        if brand:
            sql += " AND (ba009.ebrand ILIKE %s OR ba009.cbrand ILIKE %s)"
            params.extend([f"%{brand}%", f"%{brand}%"])
        if maker:
            sql += " AND (es101.englishname ILIKE %s OR es101.chinesename ILIKE %s)"
            params.extend([f"%{maker}%", f"%{maker}%"])
        if orddate_from:
            sql += " AND sa030.orddate >= %s"
            params.append(orddate_from)
        if orddate_to:
            sql += " AND sa030.orddate <= %s"
            params.append(orddate_to)
        if custno:
            sql += " AND ba010.custno ILIKE %s"
            params.append(f"%{custno}%")
        if factno:
            sql += " AND ba015.factno ILIKE %s"
            params.append(f"%{factno}%")
        if ba005gkey:
            sql += " AND sa030.ba005gkey = %s"
            params.append(ba005gkey)
        if stylename:
            sql += " AND dp030.stylename ILIKE %s"
            params.append(f"%{stylename}%")
        if stock:
            sql += " AND dp030.stock ILIKE %s"
            params.append(f"%{stock}%")
        if year:
            sql += " AND sa030.year = %s"
            params.append(year)
        if ba055gkey:
            sql += " AND sa030.ba055gkey = %s"
            params.append(ba055gkey)

        sql += """
            GROUP BY dp031.styleno, dp023.groupname, ba010.shortname, ba015.shortname, sa030.pono, sa031.photopath,
                     sa030.year, sa030.ba055gkey, sa030.ba005gkey, sa030.orddate, es101.englishname
            ORDER BY dp031.styleno
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall()

        results = []
        for r in rows:
            results.append({
                'styleno': r[0] or '',
                'stylename': r[1] or '',
                'stock': r[2] or '',
                'group_name': r[3] or '',
                'customer_shortname': r[4] or '',
                'factory_shortname': r[5] or '',
                'pono': r[6] or '',
                'totalpairs': float(r[7]) if r[7] is not None else 0.0,
                'photopath': r[8] or '',
                'year': r[9] or '',
                'ba055gkey': r[10] or '',
                'ba005gkey': r[11] or '',
                'orddate': r[12].isoformat() if r[12] is not None else None,
                'maker': r[13] or '',
            })
        return Response(results)



class Dp070ViewSet(viewsets.ViewSet):
    """樣品數量統計查詢 ViewSet"""
    program_id = 'w_dp070'

    @action(detail=False, methods=['get'])
    def query(self, request):
        sampletype = request.query_params.get('sampletype')
        customer = request.query_params.get('customer')
        factory = request.query_params.get('factory')
        brand = request.query_params.get('brand')
        group = request.query_params.get('group')
        maker = request.query_params.get('maker')
        sampleno = request.query_params.get('sampleno')
        styleno = request.query_params.get('styleno')

        issuedate_from = request.query_params.get('issuedate_from')
        issuedate_to = request.query_params.get('issuedate_to')
        year = request.query_params.get('year')
        ba055gkey = request.query_params.get('ba055gkey')
        stock = request.query_params.get('stock')
        stylename = request.query_params.get('stylename')
        custno = request.query_params.get('custno')
        factno = request.query_params.get('factno')
        ba005gkey = request.query_params.get('ba005gkey')
        gender_gkey = request.query_params.get('gender_gkey')

        # Compatibility with old parameter names from frontend
        if not customer:
            customer = request.query_params.get('cust')
        if not factory:
            factory = request.query_params.get('fty')

        # PB Window: w_dp070
        # PB DataWindow: d_dp070_query
        # Purpose: 樣品數量統計查詢
        sql = """
            SELECT DISTINCT dp002.sampleename as sampletype,
                            ba010.shortname as customer_shortname,
                            ba015.shortname as factory_shortname,
                            ba009.ebrand as brand,
                            dp030.sampleno,
                            dp031.styleno,
                            dp030.stylename,
                            dp030.stock,
                            dp031.ecolor as color,
                            COALESCE((SELECT SUM(COALESCE(dp033.custpairs, 0)) FROM dp033 WHERE dp033.dp031gkey = dp031.gkey), 0) as custpairs,
                            COALESCE((SELECT SUM(COALESCE(dp033.keeppairs, 0)) FROM dp033 WHERE dp033.dp031gkey = dp031.gkey), 0) as keeppairs,
                            COALESCE((SELECT SUM(COALESCE(dp033.sentpairs, 0)) FROM dp033 WHERE dp033.dp031gkey = dp031.gkey), 0) as sentpairs,
                            dp031.photopath,
                            dp030.year,
                            dp030.ba055gkey,
                            dp030.ba005gkey,
                            es101.englishname as maker,
                            dp030.issuedate,
                            dp030.dp004gkey,
                            dp004.gender,
                            dp023.groupname
            FROM dp031
            LEFT JOIN dp030 ON dp030.gkey = dp031.dp030gkey
            LEFT JOIN dp002 ON dp002.gkey = dp030.dp002gkey
            LEFT JOIN ba010 ON ba010.gkey = dp030.ba010gkey
            LEFT JOIN ba015 ON ba015.gkey = dp030.ba015gkey
            LEFT JOIN ba009 ON ba009.gkey = dp030.ba009gkey
            LEFT JOIN dp023 ON dp023.gkey = dp030.dp023gkey
            LEFT JOIN es101 ON es101.gkey = dp030.es101gkey
            LEFT JOIN dp004 ON dp004.gkey = dp030.dp004gkey
            WHERE dp030.status NOT IN ('0','6','A')
        """

        params = []
        if sampletype:
            sql += " AND dp002.sampletype ILIKE %s"
            params.append(f"%{sampletype}%")
        if customer:
            sql += " AND ba010.shortname ILIKE %s"
            params.append(f"%{customer}%")
        if factory:
            sql += " AND ba015.shortname ILIKE %s"
            params.append(f"%{factory}%")
        if brand:
            sql += " AND (ba009.ebrand ILIKE %s OR ba009.cbrand ILIKE %s)"
            params.extend([f"%{brand}%", f"%{brand}%"])
        if group:
            if len(group) == 20 and group.isalnum():
                sql += " AND dp030.dp023gkey = %s"
                params.append(group)
            else:
                sql += " AND dp023.groupname ILIKE %s"
                params.append(f"%{group}%")
        if maker:
            sql += " AND (es101.englishname ILIKE %s OR es101.chinesename ILIKE %s)"
            params.extend([f"%{maker}%", f"%{maker}%"])
        if sampleno:
            sql += " AND dp030.sampleno ILIKE %s"
            params.append(f"%{sampleno}%")
        if styleno:
            sql += " AND dp031.styleno ILIKE %s"
            params.append(f"%{styleno}%")
        if issuedate_from:
            sql += " AND dp030.issuedate >= %s"
            params.append(issuedate_from)
        if issuedate_to:
            sql += " AND dp030.issuedate <= %s"
            params.append(issuedate_to)
        if year:
            sql += " AND dp030.year = %s"
            params.append(year)
        if ba055gkey:
            sql += " AND dp030.ba055gkey = %s"
            params.append(ba055gkey)
        if stock:
            sql += " AND dp030.stock ILIKE %s"
            params.append(f"%{stock}%")
        if stylename:
            sql += " AND dp030.stylename ILIKE %s"
            params.append(f"%{stylename}%")
        if custno:
            sql += " AND ba010.custno ILIKE %s"
            params.append(f"%{custno}%")
        if factno:
            sql += " AND ba015.factno ILIKE %s"
            params.append(f"%{factno}%")
        if ba005gkey:
            sql += " AND dp030.ba005gkey = %s"
            params.append(ba005gkey)
        if gender_gkey:
            sql += " AND dp030.dp004gkey = %s"
            params.append(gender_gkey)

        sql += " ORDER BY dp030.sampleno, dp031.styleno"

        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall()

        results = []
        for r in rows:
            cust = float(r[9]) if r[9] is not None else 0.0
            keep = float(r[10]) if r[10] is not None else 0.0
            total = cust + keep
            results.append({
                'sampletype': r[0] or '',
                'customer_shortname': r[1] or '',
                'factory_shortname': r[2] or '',
                'brand': r[3] or '',
                'sampleno': r[4] or '',
                'styleno': r[5] or '',
                'stylename': r[6] or '',
                'stock': r[7] or '',
                'color': r[8] or '',
                'custpairs': cust,
                'keeppairs': keep,
                'totalpairs': total,
                'sentpairs': float(r[11]) if r[11] is not None else 0.0,
                'photopath': r[12] or '',
                'year': r[13] or '',
                'ba055gkey': r[14] or '',
                'ba005gkey': r[15] or '',
                'maker': r[16] or '',
                'issuedate': r[17].isoformat() if r[17] is not None else None,
                'gender_gkey': r[18] or '',
                'gender': r[19] or '',
                'groupname': r[20] or '',
            })
        return Response(results)



class Dp095ViewSet(viewsets.ViewSet):
    """Confirmation Sample Control ViewSet"""
    program_id = 'w_dp095'

    @action(detail=False, methods=['get'])
    def default_sample_type(self, request):
        """Looks up the legacy sys_parameter value for 'sampletypeno' and finds matching dp002 sample type."""
        with connection.cursor() as cursor:
            try:
                cursor.execute("SELECT parametervalue FROM sys_parameter WHERE LOWER(parameterid) = 'sampletypeno'")
                row = cursor.fetchone()
                if row:
                    val = row[0]
                    from api.models import Dp002
                    # Try lookup by gkey first, then sampletype
                    dp002 = Dp002.objects.filter(gkey=val).first() or Dp002.objects.filter(sampletype=val).first()
                    if dp002:
                        return Response({'gkey': dp002.gkey, 'sampletype': dp002.sampletype})
            except Exception:
                pass
        return Response({'gkey': None, 'sampletype': None})

    @action(detail=False, methods=['get'])
    def query(self, request):
        sampletype = request.query_params.get('sampletype')
        customer = request.query_params.get('customer')
        factory = request.query_params.get('factory')
        styleno = request.query_params.get('styleno')
        sampleno = request.query_params.get('sampleno')
        approve_status = request.query_params.get('approve_status') or request.query_params.get('approve')

        issuedate_from = request.query_params.get('issuedate_from')
        issuedate_to = request.query_params.get('issuedate_to')
        year = request.query_params.get('year')
        ba055gkey = request.query_params.get('ba055gkey')
        stylename = request.query_params.get('stylename')
        stock = request.query_params.get('stock')
        group = request.query_params.get('group')
        lastno = request.query_params.get('lastno')
        bottomno = request.query_params.get('bottomno')
        heelno = request.query_params.get('heelno')
        maker = request.query_params.get('maker')
        custno = request.query_params.get('custno')
        factno = request.query_params.get('factno')
        brand = request.query_params.get('brand')
        ba005gkey = request.query_params.get('ba005gkey')
        sentdate_from = request.query_params.get('sentdate_from')
        sentdate_to = request.query_params.get('sentdate_to')
        invoiceno = request.query_params.get('invoiceno')

        # Compatibility with old parameter names from frontend
        if not customer:
            customer = request.query_params.get('cust')
        if not factory:
            factory = request.query_params.get('fty')

        # PB Window: w_dp095
        # PB DataWindow: d_dp095_query
        # Purpose: Confirmation Sample Control (確認樣核對管控)
        sql = """
            SELECT DISTINCT dp030.sampleno,
                            dp030.issuedate,
                            dp030.duedate,
                            dp002.sampleename as esampletype,
                            dp031.styleno,
                            dp030.stylename,
                            dp030.stock,
                            ba010.shortname as customer_shortname,
                            ba015.shortname as factory_shortname,
                            dp031.ecolor as color,
                            dp031.upper,
                            dp033.size,
                            COALESCE(dp033.custpairs, 0) as custpairs,
                            COALESCE(dp033.keeppairs, 0) as keeppairs,
                            COALESCE(dp041.sentpairs, 0) as sentpairs,
                            dp033.sentduedate,
                            dp040.sentdate,
                            dp033.approvedate,
                            dp033.shipmentdt,
                            dp040.invoiceno,
                            dp040.awbno,
                            dp033.scheduleremark,
                            dp031.status,
                            dp031.photopath,
                            dp030.year,
                            dp030.ba055gkey,
                            dp030.ba005gkey,
                            dp030.approve,
                            dp033.serialno
            FROM dp030
            INNER JOIN dp031 ON dp031.dp030gkey = dp030.gkey
            INNER JOIN dp033 ON dp033.dp031gkey = dp031.gkey
            LEFT OUTER JOIN dp041 ON dp041.dp041_dp033gkey = dp033.gkey
            LEFT OUTER JOIN dp040 ON dp040.gkey = dp041.dp040gkey
            LEFT OUTER JOIN dp002 ON dp002.gkey = dp030.dp002gkey
            LEFT OUTER JOIN ba010 ON ba010.gkey = dp030.ba010gkey
            LEFT OUTER JOIN ba015 ON ba015.gkey = dp030.ba015gkey 
            LEFT OUTER JOIN dp023 ON dp023.gkey = dp030.dp023gkey
            LEFT OUTER JOIN dp010 ON dp010.gkey = dp030.dp010gkey
            LEFT OUTER JOIN dp015 ON dp015.gkey = dp030.dp015gkey
            LEFT OUTER JOIN dp020 ON dp020.gkey = dp030.dp020gkey
            LEFT OUTER JOIN es101 ON es101.gkey = dp030.es101gkey
            LEFT OUTER JOIN ba009 ON ba009.gkey = dp030.ba009gkey
            WHERE 1=1
        """

        params = []
        if sampletype:
            sql += " AND dp002.sampletype ILIKE %s"
            params.append(f"%{sampletype}%")
        if customer:
            sql += " AND ba010.shortname ILIKE %s"
            params.append(f"%{customer}%")
        if factory:
            sql += " AND ba015.shortname ILIKE %s"
            params.append(f"%{factory}%")
        if styleno:
            sql += " AND dp031.styleno ILIKE %s"
            params.append(f"%{styleno}%")
        if sampleno:
            sql += " AND dp030.sampleno ILIKE %s"
            params.append(f"%{sampleno}%")

        if issuedate_from:
            sql += " AND dp030.issuedate >= %s"
            params.append(issuedate_from)
        if issuedate_to:
            sql += " AND dp030.issuedate <= %s"
            params.append(issuedate_to)
        if year:
            sql += " AND dp030.year = %s"
            params.append(year)
        if ba055gkey:
            sql += " AND dp030.ba055gkey = %s"
            params.append(ba055gkey)
        if stylename:
            sql += " AND dp030.stylename ILIKE %s"
            params.append(f"%{stylename}%")
        if stock:
            sql += " AND dp030.stock ILIKE %s"
            params.append(f"%{stock}%")
        if group:
            if len(group) == 20 and group.isalnum():
                sql += " AND dp030.dp023gkey = %s"
                params.append(group)
            else:
                sql += " AND dp023.groupname ILIKE %s"
                params.append(f"%{group}%")
        if lastno:
            sql += " AND dp010.lastno ILIKE %s"
            params.append(f"%{lastno}%")
        if bottomno:
            sql += " AND dp015.bottomno ILIKE %s"
            params.append(f"%{bottomno}%")
        if heelno:
            sql += " AND dp020.heelno ILIKE %s"
            params.append(f"%{heelno}%")
        if maker:
            sql += " AND (es101.englishname ILIKE %s OR es101.chinesename ILIKE %s)"
            params.extend([f"%{maker}%", f"%{maker}%"])
        if custno:
            sql += " AND ba010.custno ILIKE %s"
            params.append(f"%{custno}%")
        if factno:
            sql += " AND ba015.factno ILIKE %s"
            params.append(f"%{factno}%")
        if brand:
            sql += " AND (ba009.ebrand ILIKE %s OR ba009.cbrand ILIKE %s)"
            params.extend([f"%{brand}%", f"%{brand}%"])
        if ba005gkey:
            sql += " AND dp030.ba005gkey = %s"
            params.append(ba005gkey)
        if sentdate_from:
            sql += " AND dp040.sentdate >= %s"
            params.append(sentdate_from)
        if sentdate_to:
            sql += " AND dp040.sentdate <= %s"
            params.append(sentdate_to)
        if invoiceno:
            sql += " AND dp040.invoiceno ILIKE %s"
            params.append(f"%{invoiceno}%")

        # approve filtering:
        if approve_status == 'Y' or approve_status == 'approved':
            sql += " AND dp033.approvedate IS NOT NULL"
        elif approve_status == 'N' or approve_status == 'unapproved':
            sql += " AND dp033.approvedate IS NULL"

        # status / status_list multi-select handling
        status_list_raw = request.query_params.getlist('status') or request.query_params.getlist('status_list')
        if not status_list_raw:
            status_str = request.query_params.get('status') or request.query_params.get('status_list')
            if status_str:
                status_list_raw = status_str.split(',')

        valid_statuses = ['0', '1', '2', '3']
        status_filter = [s for s in status_list_raw if s in valid_statuses]
        if status_filter:
            placeholders = ', '.join(['%s'] * len(status_filter))
            sql += f" AND dp031.status IN ({placeholders})"
            params.extend(status_filter)

        sql += " ORDER BY ba010.shortname, ba015.shortname, dp030.sampleno, dp031.styleno, dp033.serialno, dp040.sentdate"

        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall()

        results = []
        for r in rows:
            results.append({
                'sampleno': r[0] or '',
                'issuedate': r[1].isoformat() if r[1] is not None else None,
                'duedate': r[2].isoformat() if r[2] is not None else None,
                'esampletype': r[3] or '',
                'styleno': r[4] or '',
                'stylename': r[5] or '',
                'stock': r[6] or '',
                'customer_shortname': r[7] or '',
                'factory_shortname': r[8] or '',
                'color': r[9] or '',
                'upper': r[10] or '',
                'size': r[11] or '',
                'custpairs': float(r[12]) if r[12] is not None else 0.0,
                'keeppairs': float(r[13]) if r[13] is not None else 0.0,
                'sentpairs': float(r[14]) if r[14] is not None else 0.0,
                'sentduedate': r[15].isoformat() if r[15] is not None else None,
                'sentdate': r[16].isoformat() if r[16] is not None else None,
                'approvedate': r[17].isoformat() if r[17] is not None else None,
                'shipmentdt': r[18].isoformat() if r[18] is not None else None,
                'invoiceno': r[19] or '',
                'awbno': r[20] or '',
                'scheduleremark': r[21] or '',
                'status': r[22] or '',
                'photopath': r[23] or '',
                'year': r[24] or '',
                'ba055gkey': r[25] or '',
                'ba005gkey': r[26] or '',
                'approve': r[27] or '',
                'serialno': r[28] or 0,
            })
        return Response(results)


# ============================================================================
# 🔐 ERP Web 登入與權限系統 API
# ============================================================================

from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from api.common.permissions.program_permission import HasProgramPermission, HasSy005Permission
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from api.models import SysAccountsActive, generate_pb_gkey, SysAccount, SysPopedom, SysAccountsGroup, SysPopedomGroup, Es101, Ba001, Sa006, Sa007, Sa005, SysMenu
from rest_framework import status
from django.db import transaction
from django.db.models import Q, Max
from django.shortcuts import get_object_or_404
from api.serializers import SysAccountSerializer, SysAccountCreateSerializer, SysAccountUpdateSerializer, SysPopedomGroupSerializer, SysPopedomGroupCRUDSerializer, Sa001Serializer, Sa006Serializer, Sa007Serializer, Sa005Serializer, SysMenuSerializer
from rest_framework.response import Response
from rest_framework.decorators import action
from api.modules.common.views import BaseDictionaryViewSet
















class Dp001ViewSet(BaseDictionaryViewSet):
    """
    開發片語字庫 API (特規：以 f2type='DP' 區分片語資料)
    """
    program_id = 'w_dp001'
    queryset = Dp001.objects.filter(f2type='DP')
    serializer_class = Dp001Serializer


class Dp002ViewSet(BaseDictionaryViewSet):
    """樣品類別設定 ViewSet"""
    program_id = 'w_dp002'
    queryset = Dp002.objects.all()
    serializer_class = Dp002Serializer


class Dp003ViewSet(BaseDictionaryViewSet):
    """鞋種類別設定 ViewSet"""
    program_id = 'w_dp003'
    queryset = Dp003.objects.all()
    serializer_class = Dp003Serializer


class Dp005ViewSet(BaseDictionaryViewSet):
    """部位類別設定 ViewSet"""
    program_id = 'w_dp005'
    queryset = Dp005.objects.all()
    serializer_class = Dp005Serializer


class Dp008ViewSet(BaseDictionaryViewSet):
    """Sock Label 設定 ViewSet"""
    program_id = 'w_dp008'
    queryset = Dp008.objects.all()
    serializer_class = Dp008Serializer


class Dp009ViewSet(BaseDictionaryViewSet):
    """部件加工方式設定 ViewSet"""
    program_id = 'w_dp009'
    queryset = Dp009.objects.all()
    serializer_class = Dp009Serializer


class Dp006ViewSet(BaseDictionaryViewSet):
    """部位基本資料 ViewSet"""
    program_id = 'w_dp006'
    queryset = Dp006.objects.all()
    serializer_class = Dp006Serializer


class Dp007ViewSet(viewsets.ModelViewSet):
    """
    鞋種部位設定 ViewSet (Master-Detail 多對多關聯維護)
    支持針對鞋種篩選明細，並提供原子級一鍵覆蓋同步功能
    """
    program_id = 'w_dp007'
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


class Dp004ViewSet(DeepSaveMixin, BaseDictionaryViewSet):
    """鞋種性別 Size Type ViewSet (Master)"""
    program_id = 'w_dp004'
    queryset = Dp004.objects.all()
    serializer_class = Dp004Serializer

    deep_save_config = {
        "master": {
            "serializer": Dp004Serializer,
            "model": Dp004,
            "pk_field": "gkey",
            "payload_key": "master",
            "normalize_hook": "normalize_master",
        },
        "details": {
            "sizes": {
                "serializer": Dp004ASerializer,
                "model": Dp004A,
                "fk_field": "dp004gkey",
                "pk_field": "gkey",
                "payload_key": "details",
                "sync_mode": "delete_excluded",
                "normalize_hook": "normalize_detail",
                "normalize_hook": "normalize_detail",
            }
        },
        "options": {
            "use_transaction": True,
            "response_mode": "legacy_success_gkey",
            "success_message": "鞋種尺碼級放矩陣存檔成功！",
            "allow_delete_masters": True,
            "delete_masters_key": "delete_masters"
        }
    }

    def normalize_master(self, master_data, context):
        if master_data.get('gkey', '').startswith('temp_'):
            master_data.pop('gkey', None)
            
        if 'serialno' not in master_data or master_data['serialno'] is None:
            max_sn = Dp004.objects.aggregate(Max('serialno'))['serialno__max'] or 0
            master_data['serialno'] = max_sn + 1
        else:
            try:
                master_data['serialno'] = int(master_data['serialno'])
            except (TypeError, ValueError):
                max_sn = Dp004.objects.aggregate(Max('serialno'))['serialno__max'] or 0
                master_data['serialno'] = max_sn + 1

    def normalize_detail(self, detail_data, context):
        if detail_data.get('gkey', '').startswith('temp_'):
            detail_data.pop('gkey', None)
            
        if 'detail_seq' not in context:
            context['detail_seq'] = 0
        context['detail_seq'] += 1
        
        if 'serialno' not in detail_data or detail_data['serialno'] is None:
            detail_data['serialno'] = context['detail_seq']
        else:
            try:
                detail_data['serialno'] = int(detail_data['serialno'])
            except (TypeError, ValueError):
                detail_data['serialno'] = context['detail_seq']



class Dp004AViewSet(BaseDictionaryViewSet):
    """鞋種性別尺碼對照表 ViewSet (明細：隸屬 Size Type 設定)"""
    program_id = 'w_dp004'  # 明細：隸屬 Dp004 鞋種性別主檔作業
    queryset = Dp004A.objects.all()
    serializer_class = Dp004ASerializer


class Dp080ViewSet(DeepSaveMixin, BaseDictionaryViewSet):
    """樣品試版評語與確認主檔 ViewSet"""
    program_id = 'w_dp080'
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

    deep_save_config = {
        "master": {
            "serializer": Dp080Serializer,
            "model": Dp080,
            "pk_field": "gkey",
            "payload_key": "master",
            "normalize_hook": "normalize_master",
        },
        "details": {
            "opinions": {
                "serializer": Dp081Serializer,
                "model": Dp081,
                "fk_field": "dp080gkey",
                "pk_field": "gkey",
                "payload_key": "opinions",
                "sync_mode": "delete_excluded",
                "normalize_hook": "normalize_detail",
            },
            "measurements": {
                "serializer": Dp082Serializer,
                "model": Dp082,
                "fk_field": "dp080gkey",
                "pk_field": "gkey",
                "payload_key": "measurements",
                "sync_mode": "delete_excluded",
                "normalize_hook": "normalize_detail",
            }
        },
        "options": {
            "use_transaction": True,
            "response_mode": "legacy_success_gkey",
            "success_message": "📝 試版意見與量測規格儲存完成！",
            "allow_delete_masters": True,
            "delete_masters_key": "delete_masters"
        }
    }

    def normalize_master(self, master_data, context):
        if master_data.get('gkey', '').startswith('temp_'):
            master_data.pop('gkey', None)
            
        if 'serialno' not in master_data or master_data['serialno'] is None:
            styleno = master_data.get('styleno', '')
            otype = master_data.get('opiniontype', 'F')
            max_ser = Dp080.objects.filter(styleno=styleno, opiniontype=otype).aggregate(Max('serialno'))['serialno__max']
            master_data['serialno'] = (max_ser or 0) + 1
        else:
            try:
                master_data['serialno'] = int(master_data['serialno'])
            except (TypeError, ValueError):
                styleno = master_data.get('styleno', '')
                otype = master_data.get('opiniontype', 'F')
                max_ser = Dp080.objects.filter(styleno=styleno, opiniontype=otype).aggregate(Max('serialno'))['serialno__max']
                master_data['serialno'] = (max_ser or 0) + 1



    def normalize_detail(self, detail_data, context):
        if detail_data.get('gkey', '').startswith('temp_'):
            detail_data.pop('gkey', None)

class Dp081ViewSet(BaseDictionaryViewSet):
    """試版意見明細 ViewSet (明細：隸屬試版評語主檔)"""
    program_id = 'w_dp080'  # 明細：隸屬 Dp080 試版評語主檔作業
    queryset = Dp081.objects.all()
    serializer_class = Dp081Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp080gkey = self.request.query_params.get('dp080gkey')
        if dp080gkey:
            qs = qs.filter(dp080gkey=dp080gkey)
        return qs.order_by('partsno')


class Dp082ViewSet(BaseDictionaryViewSet):
    """試版量測明細 ViewSet (明細：隸屬試版評語主檔)"""
    program_id = 'w_dp080'  # 明細：隸屬 Dp080 試版評語主檔作業
    queryset = Dp082.objects.all()
    serializer_class = Dp082Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp080gkey = self.request.query_params.get('dp080gkey')
        if dp080gkey:
            qs = qs.filter(dp080gkey=dp080gkey)
        return qs.order_by('serialno')


class Dp104ViewSet(BaseDictionaryViewSet):
    """樣品進度追蹤 ViewSet (明細：隸屬樣品單資料管理)"""
    program_id = 'w_dp030'  # 明細：隸屬 Dp030 樣品單主檔作業
    queryset = Dp104.objects.all()
    serializer_class = Dp104Serializer

    def get_queryset(self):
        qs = super().get_queryset()
        dp030gkey = self.request.query_params.get('dp030gkey')
        if dp030gkey:
            qs = qs.filter(dp030gkey=dp030gkey)
        return qs.order_by('serialno')


class Dp100ViewSet(DeepSaveMixin, BaseDictionaryViewSet):
    """開發費用轉嫁單 ViewSet"""
    program_id = 'w_dp100'
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

    deep_save_config = {
        "master": {
            "serializer": Dp100Serializer,
            "model": Dp100,
            "pk_field": "gkey",
            "payload_key": "master",
            "normalize_hook": "normalize_master",
        },
        "details": {
            "details": {
                "serializer": Dp101Serializer,
                "model": Dp101,
                "fk_field": "dp100gkey",
                "pk_field": "gkey",
                "payload_key": "details",
                "sync_mode": "delete_excluded",
                "normalize_hook": "normalize_detail",
            }
        },
        "options": {
            "use_transaction": True,
            "response_mode": "legacy_success_gkey",
            "success_message": "💳 開發費用轉嫁單存檔完成！金額自動累加回灌！",
            "allow_delete_masters": True,
            "delete_masters_key": "delete_masters"
        }
    }

    def normalize_master(self, master_data, context):
        if master_data.get('gkey', '').startswith('temp_'):
            master_data.pop('gkey', None)
            
        if 'aes101gkey' not in master_data or not master_data['aes101gkey']:
            op = Es101.objects.filter(englishname='ADMIN').first()
            if op:
                master_data['aes101gkey'] = op.pk
                
        # Calculate dynamic sum aggregate of lines before save
        details_data = context.get('request').data.get('details', [])
        line_sum = sum(float(d.get('qty', 0)) * float(d.get('price', 0)) for d in details_data)
        master_data['amount'] = line_sum

    def normalize_detail(self, detail_data, context):
        if detail_data.get('gkey', '').startswith('temp_'):
            detail_data.pop('gkey', None)
            
        detail_data['amount'] = float(detail_data.get('qty', 0)) * float(detail_data.get('price', 0))


class Dp101ViewSet(BaseDictionaryViewSet):
    """開發費用轉假單明細 ViewSet (明細：隸屬開發費用轉假管理)"""
    program_id = 'w_dp100'  # 明細：隸屬 Dp100 開發費用轉假主檔作業
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
@permission_classes([IsAuthenticated])
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


