from rest_framework import serializers
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
    Dp040, Dp041, Dp042, Dp043, Dp080, Dp081, Dp082, Dp100, Dp101,
    Phrase, Mr002, Mr015, Mr016, Mr020, Mr025, Mr030, Mr031
)


class Ba001Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba001
        fields = '__all__'
        extra_kwargs = {
            'gkey': {'required': False},
            'serialno': {'required': False},
            'es101gkey': {'required': False},
        }


class Ba002Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba002
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Ba003Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba003
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Ba004Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba004
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Ba005Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba005
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}


class Ba009Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba009
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Ba020Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba020
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}


class Ba040Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba040
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}


class Ba045Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba045
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Ba050Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba050
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Ba055Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba055
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Ba060Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba060
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}

class Ba061Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba061
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}

class Ab230Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ab230
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}

class Ab231Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ab231
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Ba065Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba065
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Ba070Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba070
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Ba075Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba075
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Ba076Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba076
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}


class Ba080Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba080
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Ba090Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba090
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Ba091Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba091
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Ba092Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba092
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Ba015Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba015
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}

class Ba016Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba016
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}


class Ba010Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba010
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}

class Ba011Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba011
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}

class Ba012Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba012
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}

class Ba013Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba013
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}

class Ba014Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba014
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}


class Ba085Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba085
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}

    def validate(self, data):
        # 鞋業跨界數學防呆校驗
        start = data.get('startsize')
        end = data.get('endsize')
        max_sz = data.get('maxsize')
        
        if start is not None and end is not None and start > end:
            if max_sz is None or max_sz < start:
                raise serializers.ValidationError("當起始碼大於結束碼時，最大防呆上限 (MaxSize) 不能為空且必須大於等於起始碼！")
        return data


class SysAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = SysAccount
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}


class Es101Serializer(serializers.ModelSerializer):
    class Meta:
        model = Es101
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}


class Es102Serializer(serializers.ModelSerializer):
    class Meta:
        model = Es102
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}


class Es103Serializer(serializers.ModelSerializer):
    class Meta:
        model = Es103
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}


class Es104Serializer(serializers.ModelSerializer):
    class Meta:
        model = Es104
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}


# ============================================================================
# 👞 開發部門管理系統 (Product Development) Serializers
# ============================================================================

class Dp001Serializer(serializers.ModelSerializer):
    class Meta:
        model = Dp001
        fields = '__all__'
        extra_kwargs = {
            'gkey': {'required': False},
            'serialno': {'required': False},
            'es101gkey': {'required': False},
        }


class Dp002Serializer(serializers.ModelSerializer):
    class Meta:
        model = Dp002
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Dp003Serializer(serializers.ModelSerializer):
    class Meta:
        model = Dp003
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Dp004ASerializer(serializers.ModelSerializer):
    class Meta:
        model = Dp004A
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}

class Dp004Serializer(serializers.ModelSerializer):
    sizes = Dp004ASerializer(many=True, read_only=True)

    class Meta:
        model = Dp004
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Dp005Serializer(serializers.ModelSerializer):
    class Meta:
        model = Dp005
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Dp006Serializer(serializers.ModelSerializer):
    # 💡 物理外鍵優化：回填父類別名稱，讓 React Grid 呈現更直覺友善
    dp005_name = serializers.ReadOnlyField(source='dp005gkey.partgroup')

    class Meta:
        model = Dp006
        fields = '__all__'
        extra_kwargs = {
            'gkey': {'required': False}, 
            'serialno': {'required': False},
            'dp005gkey': {'required': True}
        }


class Dp008Serializer(serializers.ModelSerializer):
    class Meta:
        model = Dp008
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Dp009Serializer(serializers.ModelSerializer):
    class Meta:
        model = Dp009
        fields = '__all__'
        extra_kwargs = {
            'gkey': {'required': False}, 
            'serialno': {'required': False},
            'emakedescription': {'required': False}
        }


class Dp007Serializer(serializers.ModelSerializer):
    # 🌟 物理復刻優化：打平 (Flatten) 呈現 dp006 部位的物理屬性，供前端表格高效直接渲染
    parts_name = serializers.ReadOnlyField(source='dp006gkey.parts')
    eparts_name = serializers.ReadOnlyField(source='dp006gkey.eparts')
    dp005_name = serializers.ReadOnlyField(source='dp006gkey.dp005gkey.partgroup')
    serialno = serializers.ReadOnlyField(source='dp006gkey.serialno')

    class Meta:
        model = Dp007
        fields = '__all__'
        extra_kwargs = {
            'gkey': {'required': False}
        }


class Dp010Serializer(serializers.ModelSerializer):
    ba010_shortname = serializers.ReadOnlyField(source='ba010gkey.shortname')
    cust_no = serializers.ReadOnlyField(source='ba010gkey.custno')
    factory_name = serializers.ReadOnlyField(source='ba015gkey.shortname')
    factory_no = serializers.ReadOnlyField(source='ba015gkey.factno')
    adopt_factory_name = serializers.ReadOnlyField(source='apba015gkey.shortname')
    adopt_factory_no = serializers.ReadOnlyField(source='apba015gkey.factno')
    season_name = serializers.ReadOnlyField(source='ba055gkey.groupcode')
    belong_to_name = serializers.ReadOnlyField(source='ba005gkey.shortname')
    gender_name = serializers.ReadOnlyField(source='dp004gkey.gender')
    bottom_no = serializers.ReadOnlyField(source='dp015gkey.bottomno')
    heel_no = serializers.ReadOnlyField(source='dp020gkey.heelno')

    class Meta:
        model = Dp010
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}

    def validate_lastno(self, value):
        # 楦頭編號 物理唯一性校驗
        instance = getattr(self, 'instance', None)
        qs = Dp010.objects.filter(lastno=value)
        if instance:
            qs = qs.exclude(gkey=instance.gkey)
        if qs.exists():
            raise serializers.ValidationError(f"楦頭編號 '{value}' 已存在，不可重複！")
        return value


class Dp015Serializer(serializers.ModelSerializer):
    ba010_shortname = serializers.ReadOnlyField(source='ba010gkey.shortname')
    cust_no = serializers.ReadOnlyField(source='ba010gkey.custno')
    season_name = serializers.ReadOnlyField(source='ba055gkey.groupcode')
    belong_to_name = serializers.ReadOnlyField(source='ba005gkey.shortname')
    
    # 🌟 物理對齊：擷取首筆明細供應商與性別供清單彙總呈現
    ba015_shortname = serializers.SerializerMethodField()
    gender = serializers.SerializerMethodField()

    class Meta:
        model = Dp015
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}

    def validate_bottomno(self, value):
        # 大底編號 物理唯一性校驗
        instance = getattr(self, 'instance', None)
        qs = Dp015.objects.filter(bottomno=value)
        if instance:
            qs = qs.exclude(gkey=instance.gkey)
        if qs.exists():
            raise serializers.ValidationError(f"大底編號 '{value}' 已存在，不可重複！")
        return value

    def get_ba015_shortname(self, obj):
        first_mold = obj.molds.order_by('serialno').first()
        if first_mold and first_mold.bmba015gkey:
            return first_mold.bmba015gkey.shortname
        return None

    def get_gender(self, obj):
        # 從攤提費用或首筆明細推導
        first_cost = Dp017.objects.filter(dp015gkey=obj).order_by('serialno').first()
        if first_cost and first_cost.dp004gkey:
            return first_cost.dp004gkey.gender
        return None


class Dp020Serializer(serializers.ModelSerializer):
    season_name = serializers.ReadOnlyField(source='ba055gkey.groupcode')
    factory_name = serializers.ReadOnlyField(source='ba015gkey.shortname')
    factory_no = serializers.ReadOnlyField(source='ba015gkey.factno')
    last_no = serializers.ReadOnlyField(source='dp010gkey.lastno')
    bottom_no = serializers.ReadOnlyField(source='dp015gkey.bottomno')

    class Meta:
        model = Dp020
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}

class Dp016Serializer(serializers.ModelSerializer):
    bottom_fty_name = serializers.ReadOnlyField(source='bmba015gkey.shortname')
    bottom_fty_no = serializers.ReadOnlyField(source='bmba015gkey.factno')
    mold_fty_name = serializers.ReadOnlyField(source='mdba015gkey.shortname')
    mold_fty_no = serializers.ReadOnlyField(source='mdba015gkey.factno')
    prod_fty_name = serializers.ReadOnlyField(source='apba015gkey.shortname')
    prod_fty_no = serializers.ReadOnlyField(source='apba015gkey.factno')
    assembly_fty_name = serializers.ReadOnlyField(source='asba015gkey.shortname')
    assembly_fty_no = serializers.ReadOnlyField(source='asba015gkey.factno')
    last_no = serializers.ReadOnlyField(source='dp010gkey.lastno')
    gender_name = serializers.ReadOnlyField(source='dp004gkey.gender')

    class Meta:
        model = Dp016
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Dp017Serializer(serializers.ModelSerializer):
    gender_name = serializers.ReadOnlyField(source='dp004gkey.gender')
    factory_name = serializers.ReadOnlyField(source='ba015gkey.shortname')
    factory_no = serializers.ReadOnlyField(source='ba015gkey.factno')
    currency_name = serializers.ReadOnlyField(source='ba060gkey.currency')

    class Meta:
        model = Dp017
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Dp018Serializer(serializers.ModelSerializer):
    class Meta:
        model = Dp018
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Dp011Serializer(serializers.ModelSerializer):
    class Meta:
        model = Dp011
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Dp012Serializer(serializers.ModelSerializer):
    class Meta:
        model = Dp012
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Dp013Serializer(serializers.ModelSerializer):
    class Meta:
        model = Dp013
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}


class Dp014Serializer(serializers.ModelSerializer):
    class Meta:
        model = Dp014
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}
class Dp023Serializer(serializers.ModelSerializer):
    lastno = serializers.ReadOnlyField(source='dp010gkey.lastno')
    bottomno = serializers.ReadOnlyField(source='dp015gkey.bottomno')
    heelno = serializers.ReadOnlyField(source='dp020gkey.heelno')

    class Meta:
        model = Dp023
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}
class Dp026Serializer(serializers.ModelSerializer):
    ba010_shortname = serializers.ReadOnlyField(source='ba010gkey.shortname')
    ba015_shortname = serializers.ReadOnlyField(source='ba015gkey.shortname')
    ba060_code = serializers.ReadOnlyField(source='ba060gkey.currency')
    cba060_code = serializers.ReadOnlyField(source='cba060gkey.currency')
    ba070_name = serializers.ReadOnlyField(source='ba070gkey.termtype')

    class Meta:
        model = Dp026
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Dp027Serializer(serializers.ModelSerializer):
    ba015_shortname = serializers.ReadOnlyField(source='ba015gkey.shortname')
    ba015_factno = serializers.ReadOnlyField(source='ba015gkey.factno')

    class Meta:
        model = Dp027
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Dp028Serializer(serializers.ModelSerializer):
    class Meta:
        model = Dp028
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Dp025Serializer(serializers.ModelSerializer):
    dp010_lastno = serializers.ReadOnlyField(source='dp010gkey.lastno')
    dp015_bottomno = serializers.ReadOnlyField(source='dp015gkey.bottomno')
    dp020_heelno = serializers.ReadOnlyField(source='dp020gkey.heelno')
    dp023_groupname = serializers.ReadOnlyField(source='dp023gkey.groupname')
    es101_englishname = serializers.ReadOnlyField(source='es101gkey.englishname')
    season_code = serializers.ReadOnlyField(source='ba055gkey.groupcode')
    shoetype_name = serializers.ReadOnlyField(source='dp003gkey.eshoetype')
    gender_name = serializers.ReadOnlyField(source='dp004gkey.gender')

    class Meta:
        model = Dp025
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}


class Dp033Serializer(serializers.ModelSerializer):
    sampleno = serializers.ReadOnlyField(source='dp030gkey.sampleno')
    styleno = serializers.ReadOnlyField(source='dp031gkey.styleno')
    stylename = serializers.ReadOnlyField(source='dp030gkey.stylename')
    ecolor = serializers.ReadOnlyField(source='dp031gkey.ecolor')
    upper = serializers.ReadOnlyField(source='dp031gkey.upper')
    ba010_shortname = serializers.ReadOnlyField(source='dp030gkey.ba010gkey.shortname')
    ba015_shortname = serializers.ReadOnlyField(source='dp030gkey.ba015gkey.shortname')
    duedate = serializers.ReadOnlyField(source='dp030gkey.duedate')
    status = serializers.ReadOnlyField(source='dp031gkey.status')

    class Meta:
        model = Dp033
        fields = '__all__'
        extra_kwargs = {
            'gkey': {'required': False},
            'serialno': {'required': False},
            'dp031gkey': {'required': False},
            'dp030gkey': {'required': False}
        }


class Dp031Serializer(serializers.ModelSerializer):
    sampleno = serializers.ReadOnlyField(source='dp030gkey.sampleno')
    sample_stylename = serializers.ReadOnlyField(source='dp030gkey.stylename')
    details_dp033 = Dp033Serializer(many=True, read_only=True)

    class Meta:
        model = Dp031
        fields = '__all__'
        extra_kwargs = {
            'gkey': {'required': False},
            'serialno': {'required': False},
            'dp030gkey': {'required': False}
        }


class Dp032Serializer(serializers.ModelSerializer):
    partgroup_name = serializers.ReadOnlyField(source='dp005gkey.epartgroup')
    
    clrcode1 = serializers.SerializerMethodField()
    clrcode2 = serializers.SerializerMethodField()
    clrcode3 = serializers.SerializerMethodField()
    clrcode4 = serializers.SerializerMethodField()
    
    mstkno1 = serializers.SerializerMethodField()
    mstkno2 = serializers.SerializerMethodField()
    mstkno3 = serializers.SerializerMethodField()
    mstkno4 = serializers.SerializerMethodField()
    
    supplierno1 = serializers.SerializerMethodField()
    supplierno2 = serializers.SerializerMethodField()
    supplierno3 = serializers.SerializerMethodField()
    supplierno4 = serializers.SerializerMethodField()
    
    shortname1 = serializers.SerializerMethodField()
    shortname2 = serializers.SerializerMethodField()
    shortname3 = serializers.SerializerMethodField()
    shortname4 = serializers.SerializerMethodField()

    class Meta:
        model = Dp032
        fields = '__all__'
        extra_kwargs = {
            'gkey': {'required': False},
            'serialno': {'required': False},
            'dp030gkey': {'required': False}
        }

    def _get_mr010_code(self, gkey):
        if not gkey: return None
        colors = {
            "clr_gkey_1": "01",
            "clr_gkey_2": "02",
            "clr_gkey_3": "03",
            "clr_gkey_4": "04",
            "clr_gkey_5": "05",
        }
        return colors.get(gkey)

    def _get_mr035_mstkno(self, gkey):
        if not gkey: return None
        materials = {
            "mat_gkey_1": "MAT-001",
            "mat_gkey_2": "MAT-002",
            "mat_gkey_3": "MAT-003",
            "mat_gkey_4": "MAT-004",
            "mat_gkey_5": "MAT-005",
        }
        return materials.get(gkey)

    def _get_ba015_info(self, gkey):
        if not gkey: return None, None
        try:
            supplier = Ba015.objects.get(gkey=gkey)
            return supplier.factno, supplier.shortname
        except Ba015.DoesNotExist:
            return None, None

    def get_clrcode1(self, obj): return self._get_mr010_code(obj.mr010gkey1)
    def get_clrcode2(self, obj): return self._get_mr010_code(obj.mr010gkey2)
    def get_clrcode3(self, obj): return self._get_mr010_code(obj.mr010gkey3)
    def get_clrcode4(self, obj): return self._get_mr010_code(obj.mr010gkey4)

    def get_mstkno1(self, obj): return self._get_mr035_mstkno(obj.mr035gkey1)
    def get_mstkno2(self, obj): return self._get_mr035_mstkno(obj.mr035gkey2)
    def get_mstkno3(self, obj): return self._get_mr035_mstkno(obj.mr035gkey3)
    def get_mstkno4(self, obj): return self._get_mr035_mstkno(obj.mr035gkey4)

    def get_supplierno1(self, obj): return self._get_ba015_info(obj.ba015gkey1)[0]
    def get_supplierno2(self, obj): return self._get_ba015_info(obj.ba015gkey2)[0]
    def get_supplierno3(self, obj): return self._get_ba015_info(obj.ba015gkey3)[0]
    def get_supplierno4(self, obj): return self._get_ba015_info(obj.ba015gkey4)[0]

    def get_shortname1(self, obj): return self._get_ba015_info(obj.ba015gkey1)[1]
    def get_shortname2(self, obj): return self._get_ba015_info(obj.ba015gkey2)[1]
    def get_shortname3(self, obj): return self._get_ba015_info(obj.ba015gkey3)[1]
    def get_shortname4(self, obj): return self._get_ba015_info(obj.ba015gkey4)[1]


class Dp034Serializer(serializers.ModelSerializer):
    class Meta:
        model = Dp034
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Dp035Serializer(serializers.ModelSerializer):
    class Meta:
        model = Dp035
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Dp104Serializer(serializers.ModelSerializer):
    employeeno = serializers.ReadOnlyField(source='es101gkey.employeeno')
    englishname = serializers.ReadOnlyField(source='es101gkey.englishname')
    chinesename = serializers.ReadOnlyField(source='es101gkey.chinesename')

    class Meta:
        model = Dp104
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Dp030Serializer(serializers.ModelSerializer):
    dp002_code = serializers.ReadOnlyField(source='dp002gkey.sampletype')
    ba055_code = serializers.ReadOnlyField(source='ba055gkey.groupcode')
    ba010_shortname = serializers.ReadOnlyField(source='ba010gkey.shortname')
    ba015_shortname = serializers.ReadOnlyField(source='ba015gkey.shortname')
    agent_shortname = serializers.ReadOnlyField(source='agentgkey.shortname')
    ba009_brand = serializers.ReadOnlyField(source='ba009gkey.cbrand')
    dp003_name = serializers.ReadOnlyField(source='dp003gkey.eshoetype')
    dp004_name = serializers.ReadOnlyField(source='dp004gkey.gender')
    dp010_lastno = serializers.ReadOnlyField(source='dp010gkey.lastno')
    dp015_bottomno = serializers.ReadOnlyField(source='dp015gkey.bottomno')
    dp020_heelno = serializers.ReadOnlyField(source='dp020gkey.heelno')
    ba003_origin = serializers.ReadOnlyField(source='ba003gkey.corigin')
    dp008_label = serializers.ReadOnlyField(source='dp008gkey.socklabel')
    mes101_englishname = serializers.ReadOnlyField(source='mes101gkey.englishname')
    aes101_englishname = serializers.ReadOnlyField(source='aes101gkey.englishname')
    es101_englishname = serializers.ReadOnlyField(source='es101gkey.englishname')
    dp023_groupname = serializers.ReadOnlyField(source='dp023gkey.groupname')
    groupname = serializers.CharField(source='dp023gkey.groupname', read_only=True)
    aba060_code = serializers.ReadOnlyField(source='aba060gkey.currency')

    class Meta:
        model = Dp030
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}


class Dp040Serializer(serializers.ModelSerializer):
    ba010_shortname = serializers.ReadOnlyField(source='ba010gkey.shortname')
    maker_name = serializers.ReadOnlyField(source='es101gkey.englishname')
    approver_name = serializers.ReadOnlyField(source='aes101gkey.englishname')
    signer_name = serializers.ReadOnlyField(source='ses101gkey.englishname')
    ba055_code = serializers.ReadOnlyField(source='ba055gkey.groupcode')
    currency_code = serializers.ReadOnlyField(source='ba060gkey.currency')
    payment_code = serializers.ReadOnlyField(source='ba075gkey.paymenttype')
    company_name = serializers.ReadOnlyField(source='ba005gkey.shortname')

    class Meta:
        model = Dp040
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}


class Dp041Serializer(serializers.ModelSerializer):
    sample_no = serializers.ReadOnlyField(source='dp033gkey.dp030gkey.sampleno')
    req_custpairs = serializers.ReadOnlyField(source='dp033gkey.custpairs')
    req_keeppairs = serializers.ReadOnlyField(source='dp033gkey.keeppairs')
    esampletype = serializers.ReadOnlyField(source='dp002gkey.samplename')
    brand_name = serializers.ReadOnlyField(source='dp033gkey.dp030gkey.ba009gkey.cbrand')
    bottom = serializers.ReadOnlyField(source='dp033gkey.dp031gkey.bottom')

    class Meta:
        model = Dp041
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}


class Dp042Serializer(serializers.ModelSerializer):
    class Meta:
        model = Dp042
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}


class Dp043Serializer(serializers.ModelSerializer):
    class Meta:
        model = Dp043
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}


class Dp081Serializer(serializers.ModelSerializer):
    class Meta:
        model = Dp081
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}


class Dp082Serializer(serializers.ModelSerializer):
    class Meta:
        model = Dp082
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}


class Dp080Serializer(serializers.ModelSerializer):
    opinions = Dp081Serializer(many=True, read_only=True)
    measurements = Dp082Serializer(many=True, read_only=True)
    
    ba010_shortname = serializers.ReadOnlyField(source='ba010gkey.shortname')
    ba015_shortname = serializers.ReadOnlyField(source='ba015gkey.shortname')
    dp010_lastno = serializers.ReadOnlyField(source='dp010gkey.lastno')
    dp015_bottomno = serializers.ReadOnlyField(source='dp015gkey.bottomno')
    dp020_heelno = serializers.ReadOnlyField(source='dp020gkey.heelno')

    class Meta:
        model = Dp080
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}


class Dp101Serializer(serializers.ModelSerializer):
    ba060_code = serializers.ReadOnlyField(source='ba060gkey.currency')

    class Meta:
        model = Dp101
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}


class Dp100Serializer(serializers.ModelSerializer):
    details = Dp101Serializer(many=True, read_only=True)
    
    ba015_shortname = serializers.ReadOnlyField(source='ba015gkey.shortname')
    ba010_shortname = serializers.ReadOnlyField(source='ba010gkey.shortname')
    dp023_groupname = serializers.ReadOnlyField(source='dp023gkey.groupname')
    dp010_lastno = serializers.ReadOnlyField(source='dp010gkey.lastno')
    dp015_bottomno = serializers.ReadOnlyField(source='dp015gkey.bottomno')
    dp020_heelno = serializers.ReadOnlyField(source='dp020gkey.heelno')
    ba060_code = serializers.ReadOnlyField(source='ba060gkey.currency')

    class Meta:
        model = Dp100
        fields = '__all__'
        extra_kwargs = {
            'gkey': {'required': False},
            'aes101gkey': {'required': False} # Allow implicit binding to current user
        }


class PhraseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Phrase
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Mr002Serializer(serializers.ModelSerializer):
    class Meta:
        model = Mr002
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Mr020Serializer(serializers.ModelSerializer):
    class Meta:
        model = Mr020
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Mr025Serializer(serializers.ModelSerializer):
    class Meta:
        model = Mr025
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


class Mr031Serializer(serializers.ModelSerializer):
    class Meta:
        model = Mr031
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


# ===========================================================================
# 資材部門管理系統 - MR015 / MR016 / MR030 Serializers
# ===========================================================================

class Mr015Serializer(serializers.ModelSerializer):
    """材料大類設定 mr015"""
    class Meta:
        model = Mr015
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}

    def validate_matno(self, value):
        """材料大類代號不可重複"""
        instance = getattr(self, 'instance', None)
        qs = Mr015.objects.filter(matno=value)
        if instance:
            qs = qs.exclude(gkey=instance.gkey)
        if qs.exists():
            raise serializers.ValidationError(f"材料大類代號 '{value}' 已存在，不可重複。")
        return value


class Mr016Serializer(serializers.ModelSerializer):
    """材料小類設定 mr016"""
    # Read-only: display parent class info
    mr015_matno = serializers.ReadOnlyField(source='mr015gkey.matno')
    mr015_cname = serializers.ReadOnlyField(source='mr015gkey.cname')

    class Meta:
        model = Mr016
        fields = '__all__'
        extra_kwargs = {
            'gkey': {'required': False},
            'serialno': {'required': False},
            'mr015gkey': {'required': True}
        }

    def validate(self, data):
        """同一大類底下，小類代號不可重複"""
        mr015gkey = data.get('mr015gkey') or getattr(getattr(self, 'instance', None), 'mr015gkey', None)
        smatno = data.get('smatno')
        if mr015gkey and smatno:
            instance = getattr(self, 'instance', None)
            qs = Mr016.objects.filter(mr015gkey=mr015gkey, smatno=smatno)
            if instance:
                qs = qs.exclude(gkey=instance.gkey)
            if qs.exists():
                raise serializers.ValidationError({"smatno": f"材料小類代號 '{smatno}' 在此大類下已存在，不可重複。"})
        return data


class Mr030Serializer(serializers.ModelSerializer):
    """材料紋路設定 mr030"""
    class Meta:
        model = Mr030
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}

    def validate_veinno(self, value):
        """紋路代號不可重複"""
        instance = getattr(self, 'instance', None)
        qs = Mr030.objects.filter(veinno=value)
        if instance:
            qs = qs.exclude(gkey=instance.gkey)
        if qs.exists():
            raise serializers.ValidationError(f"紋路代號 '{value}' 已存在，不可重複。")
        return value


