import uuid
from django.contrib.auth.hashers import make_password
from rest_framework import serializers
from api.modules.sys.models import *
from api.modules.es.models import Es101

class SysAccountSerializer(serializers.ModelSerializer):
    es101_employeeno = serializers.SerializerMethodField()
    es101_chinesename = serializers.SerializerMethodField()

    class Meta:
        model = SysAccount
        fields = ['accounts_id', 'accounts', 'user_pwd', 'user_id', 'peopdom_class', 'status_sign', 'hisystem', 'create_date', 'gkey', 'es101_employeeno', 'es101_chinesename']
        extra_kwargs = {
            'gkey': {'required': False},
            'user_pwd': {'write_only': True}
        }

    def get_es101_employeeno(self, obj):
        if obj.user_id:
            emp = Es101.objects.filter(gkey=obj.user_id).first()
            if emp:
                return emp.employeeno
        return ""

    def get_es101_chinesename(self, obj):
        if obj.user_id:
            emp = Es101.objects.filter(gkey=obj.user_id).first()
            if emp:
                return emp.chinesename
        return ""


import uuid
from django.contrib.auth.hashers import make_password

class SysAccountCreateSerializer(serializers.ModelSerializer):
    es101_employeeno = serializers.CharField(write_only=True, required=True)
    user_pwd = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = SysAccount
        fields = ['accounts', 'user_pwd', 'es101_employeeno', 'peopdom_class', 'status_sign', 'hisystem']

    def validate_accounts(self, value):
        if SysAccount.objects.filter(accounts=value).exists():
            raise serializers.ValidationError("帳號已存在。")
        return value

    def validate_es101_employeeno(self, value):
        emp = Es101.objects.filter(employeeno=value).first()
        if not emp:
            raise serializers.ValidationError("員工編號不存在於員工主檔 (es101) 中。")
        return value

    def create(self, validated_data):
        employeeno = validated_data.pop('es101_employeeno')
        emp = Es101.objects.get(employeeno=employeeno)
        
        raw_pwd = validated_data.pop('user_pwd')
        hashed_pwd = make_password(raw_pwd)
        
        accounts_id = str(uuid.uuid4())
        
        account = SysAccount.objects.create(
            accounts_id=accounts_id,
            user_id=emp.gkey,
            user_pwd=hashed_pwd,
            **validated_data
        )
        return account

class SysAccountUpdateSerializer(serializers.ModelSerializer):
    es101_employeeno = serializers.CharField(write_only=True, required=False)
    user_pwd = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = SysAccount
        fields = ['accounts', 'user_pwd', 'es101_employeeno', 'peopdom_class', 'status_sign']

    def validate_accounts(self, value):
        instance = self.instance
        if SysAccount.objects.filter(accounts=value).exclude(accounts_id=instance.accounts_id).exists():
            raise serializers.ValidationError("帳號已存在。")
        return value

    def validate_es101_employeeno(self, value):
        emp = Es101.objects.filter(employeeno=value).first()
        if not emp:
            raise serializers.ValidationError("員工編號不存在於員工主檔 (es101) 中。")
        return value

    def update(self, instance, validated_data):
        employeeno = validated_data.pop('es101_employeeno', None)
        if employeeno:
            emp = Es101.objects.get(employeeno=employeeno)
            instance.user_id = emp.gkey
            
        raw_pwd = validated_data.pop('user_pwd', None)
        if raw_pwd and raw_pwd.strip() != "":
            instance.user_pwd = make_password(raw_pwd)
            
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            
        instance.save()
        return instance

class SysMenuSerializer(serializers.ModelSerializer):
    class Meta:
        model = SysMenu
        fields = '__all__'

class SysPopedomDescSerializer(serializers.ModelSerializer):
    class Meta:
        model = SysPopedomDesc
        fields = '__all__'

    def validate_popedom_index(self, value):
        if value is None:
            raise serializers.ValidationError("權限遮罩索引必須在 1 到 13 之間。")
        try:
            val = int(value)
        except (ValueError, TypeError):
            raise serializers.ValidationError("權限遮罩索引必須在 1 到 13 之間。")
        
        if val < 1 or val > 13:
            raise serializers.ValidationError("權限遮罩索引必須在 1 到 13 之間。")
        return val

    def validate(self, data):
        # 即使是 patch 請求，也要確保這些欄位在寫入時不能為空字串或 null
        required_fields = ['popedom_id', 'popedom_desc', 'obj_name', 'hisystem']
        for field in required_fields:
            if field in data:
                val = data.get(field)
                if val is None or str(val).strip() == '':
                    raise serializers.ValidationError({field: "此欄位不可空白。"})
        return data

class SysMenuColumnSerializer(serializers.ModelSerializer):
    class Meta:
        model = SysMenuColumn
        fields = '__all__'


    def validate(self, data):
        required_fields = ['db_name', 'display_name', 'obj_name', 'hisystem']
        for field in required_fields:
            if field in data:
                val = data.get(field)
                if val is None or str(val).strip() == '':
                    raise serializers.ValidationError({field: "此欄位不可空白。"})
        return data

class SysPopedomGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = SysPopedomGroup
        fields = '__all__'

class SysPopedomGroupCRUDSerializer(serializers.ModelSerializer):
    class Meta:
        model = SysPopedomGroup
        fields = ['group_code', 'group_name', 'hisystem']
        extra_kwargs = {
            'group_code': {'required': False}
        }

    def validate(self, data):
        group_name = data.get('group_name')
        hisystem = data.get('hisystem')
        if not group_name or not hisystem:
            return data
            
        instance = self.instance
        qs = SysPopedomGroup.objects.filter(group_name=group_name, hisystem=hisystem)
        if instance:
            qs = qs.exclude(group_code=instance.group_code)
        if qs.exists():
            raise serializers.ValidationError({"group_name": "當前系統下已存在同名的權限群組。"})
        return data

    def create(self, validated_data):
        if 'group_code' not in validated_data or not validated_data['group_code']:
            validated_data['group_code'] = str(uuid.uuid4()).replace('-', '')[:20]
        return super().create(validated_data)

class SysAccountsGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = SysAccountsGroup
        fields = '__all__'

class ActionPermissionItemSerializer(serializers.Serializer):
    obj_name = serializers.CharField(max_length=40)
    menu_visible = serializers.BooleanField()
    actions = serializers.DictField(child=serializers.BooleanField(), required=False, default=dict)

class SavePermissionsSerializer(serializers.Serializer):
    target_id = serializers.CharField(max_length=50)
    is_group = serializers.BooleanField()
    hisystem = serializers.CharField(max_length=10)
    permissions = ActionPermissionItemSerializer(many=True)

    def validate(self, data):
        target_id = data.get('target_id')
        is_group = data.get('is_group')
        
        if not is_group:
            if not SysAccount.objects.filter(accounts_id=target_id).exists():
                raise serializers.ValidationError({"target_id": f"使用者帳號 '{target_id}' 不存在。"})
        else:
            if not SysPopedomGroup.objects.filter(group_code=target_id).exists():
                raise serializers.ValidationError({"target_id": f"權限群組 '{target_id}' 不存在。"})
        return data

class CopyPermissionsSerializer(serializers.Serializer):
    source_id = serializers.CharField(max_length=50)
    is_source_group = serializers.BooleanField()
    target_id = serializers.CharField(max_length=50)
    is_target_group = serializers.BooleanField()
    hisystem = serializers.CharField(max_length=10)

    def validate(self, data):
        source_id = data.get('source_id')
        is_source_group = data.get('is_source_group')
        target_id = data.get('target_id')
        is_target_group = data.get('is_target_group')

        # Verify source
        if not is_source_group:
            if not SysAccount.objects.filter(accounts_id=source_id).exists():
                raise serializers.ValidationError({"source_id": f"來源使用者 '{source_id}' 不存在。"})
        else:
            if not SysPopedomGroup.objects.filter(group_code=source_id).exists():
                raise serializers.ValidationError({"source_id": f"來源群組 '{source_id}' 不存在。"})

        # Verify target
        if not is_target_group:
            if not SysAccount.objects.filter(accounts_id=target_id).exists():
                raise serializers.ValidationError({"target_id": f"目標使用者 '{target_id}' 不存在。"})
        else:
            if not SysPopedomGroup.objects.filter(group_code=target_id).exists():
                raise serializers.ValidationError({"target_id": f"目標群組 '{target_id}' 不存在。"})
        return data

class ApplyGroupPermissionsSerializer(serializers.Serializer):
    accounts_id = serializers.CharField(max_length=50)
    hisystem = serializers.CharField(max_length=10)

    def validate(self, data):
        accounts_id = data.get('accounts_id')
        if not SysAccount.objects.filter(accounts_id=accounts_id).exists():
            raise serializers.ValidationError({"accounts_id": f"使用者帳號 '{accounts_id}' 不存在。"})
        return data

class SysParameterSerializer(serializers.ModelSerializer):
    class Meta:
        model = SysParameter
        fields = '__all__'
        extra_kwargs = {
            'gkey': {'required': False},
            'serialno': {'required': False},
        }

    def validate(self, data):
        from core.authz.services import get_current_sys_account
        request = self.context.get('request')
        if not request:
            return data

        instance = self.instance
        if not instance:
            return data

        account = get_current_sys_account(request)
        is_prvl = int(account.peopdom_class or '1') if account else 1

        if is_prvl < 6:
            for field in ['hisystem', 'parameterid', 'serialno', 'description', 'visitctrl', 'specialctrl', 'istype']:
                if field in data and getattr(instance, field) != data[field]:
                    raise serializers.ValidationError(
                        f"權限不足 (is_prvl={is_prvl} < 6)：僅允許修改 parametervalue 欄位，不可修改 {field}。"
                    )
        return data

class SysAccountsColumnSerializer(serializers.ModelSerializer):
    class Meta:
        model = SysAccountsColumn
        fields = '__all__'

    def validate(self, data):
        required_fields = ['accounts_id', 'obj_name', 'db_name']
        for field in required_fields:
            if field in data:
                val = data.get(field)
                if val is None or str(val).strip() == '':
                    raise serializers.ValidationError({field: "此欄位不可空白。"})
        
        kind = data.get('kind')
        if kind and kind not in ['hide', 'readonly']:
            raise serializers.ValidationError({'kind': f"不支援的 kind 值：{kind}。只允許 'hide' 或 'readonly'。"})
        
        return data

class SysAccountsColumnBatchItemSerializer(serializers.Serializer):
    db_name = serializers.CharField(required=True, allow_blank=False)
    kind = serializers.ChoiceField(choices=['hide', 'readonly'], required=True)

class SysAccountsColumnBatchSaveSerializer(serializers.Serializer):
    accounts_id = serializers.CharField(required=True, allow_blank=False)
    obj_name = serializers.CharField(required=True, allow_blank=False)
    hisystem = serializers.CharField(required=False, default='01', allow_blank=True)
    columns = SysAccountsColumnBatchItemSerializer(many=True)

    def validate_columns(self, columns):
        db_names = [col['db_name'] for col in columns]
        if len(db_names) != len(set(db_names)):
            raise serializers.ValidationError("同一批 payload 內不允許出現重複的 db_name。")
        return columns

class SysConstraintSerializer(serializers.ModelSerializer):
    class Meta:
        model = SysConstraint
        fields = '__all__'

class SysConstraintDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = SysConstraintDetail
        fields = '__all__'

class SysConstraintBatchValueSerializer(serializers.Serializer):
    cgkey = serializers.CharField(required=True, allow_blank=False)
    cname = serializers.CharField(required=False, allow_blank=True, allow_null=True)

class SysConstraintBatchSaveSerializer(serializers.Serializer):
    hisystem = serializers.CharField(required=False, default='01', allow_blank=True)
    accounts_id = serializers.CharField(required=True, allow_blank=False)
    obj_name = serializers.CharField(required=True, allow_blank=False)
    keycol = serializers.CharField(required=True, allow_blank=False)
    constraint_type = serializers.ChoiceField(choices=['equal', 'in_list'], required=True)
    values = SysConstraintBatchValueSerializer(many=True, required=True)

    def validate(self, data):
        if data.get('obj_name') != 'w_dp030':
            raise serializers.ValidationError({"obj_name": "本階段僅支援 w_dp030。"})
        if data.get('keycol') != 'es101gkey':
            raise serializers.ValidationError({"keycol": "本階段僅支援 es101gkey。"})
        return data

    def validate_values(self, values):
        cgkeys = [val['cgkey'] for val in values]
        if len(cgkeys) != len(set(cgkeys)):
            raise serializers.ValidationError("同一批 payload 內不允許出現重複的 cgkey。")
        return values
