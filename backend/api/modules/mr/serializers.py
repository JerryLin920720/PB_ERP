from rest_framework import serializers
from .models import *

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
        print('[MR016 SERIALIZER VALIDATE INPUT DATA]', data)
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


