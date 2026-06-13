from rest_framework import serializers
from api.modules.es.models import *

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

