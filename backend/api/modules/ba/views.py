from api.common.mixins.validation import ValidationMixin
from api.common.mixins.deep_save_v2 import DeepSaveMixinV2
from rest_framework import viewsets
from api.common.permissions.program_permission import HasProgramPermission
from api.modules.common.views import BaseDictionaryViewSet
from ...common.mixins.deep_save import DeepSaveMixin
from .models import Ba001, Ba002, Ba003, Ba004, Ba005, Ba009, Ba020, Ba040, Ba045, Ba050, Ba055, Ba065, Ba070, Ba075, Ba080, Ba090, Ba091, Ba092, Ba076, Ab230, Ab231, Ba010, Ba011, Ba012, Ba013, Ba014, Ba016, Ba060, Ba061, Ba015
from .serializers import Ba001Serializer, Ba002Serializer, Ba003Serializer, Ba004Serializer, Ba005Serializer, Ba009Serializer, Ba020Serializer, Ba040Serializer, Ba045Serializer, Ba050Serializer, Ba055Serializer, Ba065Serializer, Ba070Serializer, Ba075Serializer, Ba080Serializer, Ba090Serializer, Ba091Serializer, Ba092Serializer, Ba076Serializer, Ab230Serializer, Ab231Serializer, Ba010Serializer, Ba011Serializer, Ba012Serializer, Ba013Serializer, Ba014Serializer, Ba016Serializer, Ba060Serializer, Ba061Serializer, Ba015Serializer

class Ba001ViewSet(BaseDictionaryViewSet):
    """
    個人片語字庫 API 視圖，全面還原 PB 業務邏輯 (特規：以 f2type='BA' 區分片語資料)
    """
    program_id = 'w_ba001'
    queryset = Ba001.objects.filter(f2type='BA')
    serializer_class = Ba001Serializer

    validation_config = {
        "required_fields": [
            {"field": "ba001code", "label": "代號"},
            {"field": "cname", "label": "中文名稱"}
        ],
        "string_rules": [
            {"field": "ba001code", "label": "代號", "max_length": 10},
            {"field": "cname", "label": "中文名稱", "max_length": 60}
        ]
    }

class Ba002ViewSet(BaseDictionaryViewSet):
    """國家基本資料"""
    program_id = 'w_ba002'
    queryset = Ba002.objects.all()
    serializer_class = Ba002Serializer

class Ba045ViewSet(BaseDictionaryViewSet):
    """部門設定"""
    program_id = 'w_ba045'
    queryset = Ba045.objects.all()
    serializer_class = Ba045Serializer

class Ba003ViewSet(BaseDictionaryViewSet):
    """產地基本資料"""
    program_id = 'w_ba003'
    queryset = Ba003.objects.all()
    serializer_class = Ba003Serializer


class Ba004ViewSet(BaseDictionaryViewSet):
    """區域基本資料"""
    program_id = 'w_ba004'
    queryset = Ba004.objects.all()
    serializer_class = Ba004Serializer


class Ba005ViewSet(viewsets.ModelViewSet):
    """公司基本資料設定 (標準 REST，因為無 serialno 且有特規 Form)"""
    program_id = 'w_ba005'
    queryset = Ba005.objects.all()
    serializer_class = Ba005Serializer


class Ba009ViewSet(BaseDictionaryViewSet):
    """品牌資料"""
    program_id = 'w_ba009'
    queryset = Ba009.objects.all()
    serializer_class = Ba009Serializer


class Ba020ViewSet(BaseDictionaryViewSet):
    """材料供應商類別設定"""
    program_id = 'w_ba020'
    queryset = Ba020.objects.all()
    serializer_class = Ba020Serializer


class Ba040ViewSet(viewsets.ModelViewSet):
    """銀行基本資料設定 (標準 REST)"""
    permission_classes = [HasProgramPermission]
    program_id = 'w_ba040'
    queryset = Ba040.objects.all()
    serializer_class = Ba040Serializer



class Ba050ViewSet(BaseDictionaryViewSet):
    """職務設定"""
    program_id = 'w_ba050'
    queryset = Ba050.objects.all()
    serializer_class = Ba050Serializer


class Ba055ViewSet(BaseDictionaryViewSet):
    """季節設定"""
    program_id = 'w_ba055'
    queryset = Ba055.objects.all()
    serializer_class = Ba055Serializer


class Ba065ViewSet(BaseDictionaryViewSet):
    """交易港口"""
    program_id = 'w_ba065'
    queryset = Ba065.objects.all()
    serializer_class = Ba065Serializer


class Ba070ViewSet(BaseDictionaryViewSet):
    """交易條件"""
    program_id = 'w_ba070'
    queryset = Ba070.objects.all()
    serializer_class = Ba070Serializer


class Ba075ViewSet(BaseDictionaryViewSet):
    """付款條件大類"""
    program_id = 'w_ba075'
    queryset = Ba075.objects.all()
    serializer_class = Ba075Serializer


class Ba080ViewSet(BaseDictionaryViewSet):
    """配件設定"""
    program_id = 'w_ba080'
    queryset = Ba080.objects.all()
    serializer_class = Ba080Serializer


class Ba090ViewSet(BaseDictionaryViewSet):
    """快遞公司"""
    program_id = 'w_ba090'
    queryset = Ba090.objects.all()
    serializer_class = Ba090Serializer


class Ba091ViewSet(BaseDictionaryViewSet):
    """運輸方式"""
    program_id = 'w_ba091'
    queryset = Ba091.objects.all()
    serializer_class = Ba091Serializer


class Ba092ViewSet(BaseDictionaryViewSet):
    """單位設定"""
    program_id = 'w_ba092'
    queryset = Ba092.objects.all()
    serializer_class = Ba092Serializer



class Ba076ViewSet(viewsets.ModelViewSet):
    """付款條件明細 (明細：隸屬付款條件設定)"""
    program_id = 'w_ba075'  # 明細：隸屬 Ba075 付款條件大類作業
    queryset = Ba076.objects.all()
    serializer_class = Ba076Serializer

    def get_queryset(self):
        queryset = Ba076.objects.all()
        ba075gkey = self.request.query_params.get('ba075gkey')
        if ba075gkey:
            queryset = queryset.filter(ba075gkey=ba075gkey)
        return queryset



class Ab230ViewSet(viewsets.ModelViewSet):
    """財務交叉匯率主檔"""
    queryset = Ab230.objects.all()
    serializer_class = Ab230Serializer

    def perform_create(self, serializer):
        current_max = Ab230.objects.aggregate(max('serialno'))['serialno__max'] or 0
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
        current_max = Ab231.objects.filter(ab230gkey=ab230gkey).aggregate(max('serialno'))['serialno__max'] or 0
        serializer.save(serialno=current_max + 1)









class Ba011ViewSet(viewsets.ModelViewSet):
    """客戶經營品牌 ViewSet (明細：隸屬客戶資料管理)"""
    program_id = 'w_ba010'  # 明細：隸屬 Ba010 客戶大主檔作業
    queryset = Ba011.objects.all()
    serializer_class = Ba011Serializer

    def get_queryset(self):
        queryset = Ba011.objects.all()
        ba010gkey = self.request.query_params.get('ba010gkey')
        if ba010gkey:
            queryset = queryset.filter(ba010gkey=ba010gkey)
        return queryset



class Ba012ViewSet(viewsets.ModelViewSet):
    """客戶 QC 驗貨官 ViewSet (明細：隸屬客戶資料管理)"""
    program_id = 'w_ba010'  # 明細：隸屬 Ba010 客戶大主檔作業
    queryset = Ba012.objects.all()
    serializer_class = Ba012Serializer

    def get_queryset(self):
        queryset = Ba012.objects.all()
        ba010gkey = self.request.query_params.get('ba010gkey')
        if ba010gkey:
            queryset = queryset.filter(ba010gkey=ba010gkey)
        return queryset



class Ba013ViewSet(viewsets.ModelViewSet):
    """客戶提供配件 ViewSet (明細：隸屬客戶資料管理)"""
    program_id = 'w_ba010'  # 明細：隸屬 Ba010 客戶大主檔作業
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
        current_max = Ba013.objects.filter(ba010gkey=ba010gkey).aggregate(max('serialno'))['serialno__max'] or 0
        serializer.save(serialno=current_max + 1)



class Ba014ViewSet(viewsets.ModelViewSet):
    """客戶業務聯絡人 ViewSet (明細：隸屬客戶資料管理)"""
    program_id = 'w_ba010'  # 明細：隸屬 Ba010 客戶大主檔作業
    queryset = Ba014.objects.all()
    serializer_class = Ba014Serializer

    def get_queryset(self):
        queryset = Ba014.objects.all()
        ba010gkey = self.request.query_params.get('ba010gkey')
        if ba010gkey:
            queryset = queryset.filter(ba010gkey=ba010gkey)
        return queryset



class Ba016ViewSet(viewsets.ModelViewSet):
    """統一聯絡人 ViewSet (明細：隸屬 Ba015 工廠/材料商/供應商作業)"""
    program_id = 'w_ba015'  # 明細：預設對應工廠資料管理；type 2→w_ba025, type 3→w_ba030 由上層 Ba015ViewSet 處理
    queryset = Ba016.objects.all()
    serializer_class = Ba016Serializer

    def get_queryset(self):
        queryset = Ba016.objects.all()
        ba015gkey = self.request.query_params.get('ba015gkey')
        if ba015gkey:
            queryset = queryset.filter(ba015gkey=ba015gkey)
        return queryset



class Ba060ViewSet(DeepSaveMixin, viewsets.ModelViewSet):
    """全域幣別主檔"""
    program_id = 'w_ba060'
    queryset = Ba060.objects.all()
    serializer_class = Ba060Serializer

    deep_save_config = {
        "master": {"serializer": Ba060Serializer},
        "details": {
            "rates": {
                "serializer": Ba061Serializer,
                "model": Ba061,
                "fk_field": "ba060gkey",
                "pk_field": "gkey",
                "payload_key": "rates",
                "delete_key": "delete_rates",
            }
        },
        "options": {
            "use_transaction": True,
            "allow_delete": True,
            "temp_id_field": "_temp_id",
            "sync_mode": "upsert_delete"
        }
    }

    def perform_create(self, serializer):
        current_max = Ba060.objects.aggregate(max('serialno'))['serialno__max'] or 0
        serializer.save(serialno=current_max + 1)


class Ba061ViewSet(viewsets.ModelViewSet):
    """全域幣別歷史匯率"""
    program_id = 'w_ba060'  # 明細：隸屬幣別主檔作業
    queryset = Ba061.objects.all()
    serializer_class = Ba061Serializer

    def get_queryset(self):
        queryset = Ba061.objects.all()
        ba060gkey = self.request.query_params.get('ba060gkey')
        if ba060gkey:
            queryset = queryset.filter(ba060gkey=ba060gkey)
        return queryset




class Ba015ViewSet(DeepSaveMixinV2, ValidationMixin, viewsets.ModelViewSet):
    """供應鏈實體 (工廠/材料商/供應商) 三合一多態 ViewSet"""
    permission_classes = [HasProgramPermission]
    queryset = Ba015.objects.all()
    serializer_class = Ba015Serializer

    deep_save_config = {
        "master_serializer": Ba015Serializer,
        "master_lookup_field": "gkey",
        "details": {
            "ba016": {
                "model": Ba016,
                "serializer": Ba016Serializer,
                "parent_field": "ba015gkey",
                "lookup_field": "gkey",
                "delete_mode": "hard"
            }
        }
    }

    def get_queryset(self):
        entity_type = self.request.query_params.get('type', '1')
        qs = super().get_queryset().filter(type=entity_type)
        if entity_type == '1':
            # 工廠類型僅選取總廠 (parentgkey 為空)，以便做自引用明細
            qs = qs.filter(parentgkey__isnull=True)
        return qs

    def perform_create(self, serializer):
        entity_type = self.request.query_params.get('type', '1')
        factno = self.request.data.get('factno', '').upper()
        serializer.save(type=entity_type, factno=factno)

    def perform_update(self, serializer):
        factno = self.request.data.get('factno', '').upper()
        serializer.save(factno=factno)

    def normalize_master(self, master_data, context):
        entity_type = context["request"].query_params.get('type', '1')
        master_data['type'] = entity_type
        if 'factno' in master_data:
            master_data['factno'] = master_data['factno'].upper()

    def after_master_save_hook(self, master_instance, context):
        context['master_gkey'] = master_instance.gkey

    def normalize_branch(self, branch_data, context):
        branch_data['type'] = '1'
        if 'factno' in branch_data:
            branch_data['factno'] = branch_data['factno'].upper()
        # In _save_detail_group, temp_id is captured using temp_id_field (gkey).
        # We don't need to manually populate _temp_id if options sets temp_id_field = gkey.

    def normalize_contact(self, contact_data, context):
        orig_parent_gkey = contact_data.get('parentgkey')
        master_gkey = context.get('master_gkey')
        mapped = context["gkey_map"].get(orig_parent_gkey, master_gkey)
        contact_data['parentgkey'] = mapped



class Ba010ViewSet(DeepSaveMixin, viewsets.ModelViewSet):
    """製鞋客戶大主檔 ViewSet"""
    permission_classes = [HasProgramPermission]
    program_id = 'w_ba010'
    queryset = Ba010.objects.all()
    serializer_class = Ba010Serializer

    deep_save_config = {
        "master": {
            "serializer": Ba010Serializer,
            "model": Ba010,
            "pk_field": "gkey",
            "payload_key": "master",
            "normalize_hook": "normalize_master",
        },
        "details": {
            "brands": {
                "serializer": Ba011Serializer,
                "model": Ba011,
                "fk_field": "ba010gkey",
                "pk_field": "gkey",
                "payload_key": "brands",
                "sync_mode": "wipe_and_recreate",
            },
            "qcs": {
                "serializer": Ba012Serializer,
                "model": Ba012,
                "fk_field": "ba010gkey",
                "pk_field": "gkey",
                "payload_key": "qcs",
                "sync_mode": "wipe_and_recreate",
                "normalize_hook": "normalize_qcs"
            },
            "accessories": {
                "serializer": Ba013Serializer,
                "model": Ba013,
                "fk_field": "ba010gkey",
                "pk_field": "gkey",
                "payload_key": "accessories",
                "sync_mode": "wipe_and_recreate",
                "normalize_hook": "normalize_accessories"
            },
            "contacts": {
                "serializer": Ba014Serializer,
                "model": Ba014,
                "fk_field": "ba010gkey",
                "pk_field": "gkey",
                "payload_key": "contacts",
                "sync_mode": "wipe_and_recreate",
                "normalize_hook": "normalize_contacts"
            },
        },
        "options": {
            "use_transaction": True,
            "response_mode": "legacy_success_gkey"
        }
    }

    def perform_create(self, serializer):
        custno = self.request.data.get('custno', '').upper()
        serializer.save(custno=custno)

    def perform_update(self, serializer):
        custno = self.request.data.get('custno', '').upper()
        serializer.save(custno=custno)

    def normalize_master(self, row, context):
        if 'custno' in row:
            row['custno'] = row['custno'].upper()

    def normalize_qcs(self, row, context):
        for field in ['tel', 'fax', 'mobilephone', 'email']:
            if not row.get(field): row[field] = None

    def normalize_accessories(self, row, context):
        if 'acc_seq' not in context:
            context['acc_seq'] = 1
        row['serialno'] = context['acc_seq']
        context['acc_seq'] += 1

        if not row.get('description'): row['description'] = None
        if not row.get('unit'): row['unit'] = '1'
        if not row.get('pairs'): row['pairs'] = 0
        if not row.get('supplytype'): row['supplytype'] = '1'

    def normalize_contacts(self, row, context):
        for field in ['department', 'jobposition', 'tel', 'fax', 'mobilephone', 'email']:
            if not row.get(field): row[field] = None



from rest_framework import viewsets
from django.db.models import Max
from api.modules.ba.models import *
from api.modules.ba.serializers import *

class Ba085ViewSet(viewsets.ModelViewSet):
    """SIZERUN 尺碼設定 ViewSet"""
    program_id = 'w_ba085'
    queryset = Ba085.objects.all()
    serializer_class = Ba085Serializer

    def perform_create(self, serializer):
        current_max = Ba085.objects.aggregate(Max('serialno'))['serialno__max'] or 0
        serializer.save(serialno=current_max + 1)

