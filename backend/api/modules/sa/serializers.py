from rest_framework import serializers
from api.models import Ba001
from .models import *

class Sa001Serializer(serializers.ModelSerializer):
    """
    業務片語字庫 (sa001) Serializer
    重用 Ba001 model，以 f2type='SA' 區分業務部門片語。
    """
    class Meta:
        model = Ba001
        fields = '__all__'
        extra_kwargs = {
            'gkey': {'required': False},
            'serialno': {'required': False},
            'es101gkey': {'required': False},
            'f2type': {'required': False},
        }



class Sa006Serializer(serializers.ModelSerializer):
    """
    業務部門其他費用定義 (sa006) Serializer
    """
    class Meta:
        model = Sa006
        fields = '__all__'
        extra_kwargs = {
            'gkey': {'required': False},
            'serialno': {'required': False},
            'spercent': {'required': False},
            'amount': {'required': False},
        }



class Sa007Serializer(serializers.ModelSerializer):
    """
    報價其他費用定義 (sa007) Serializer
    """
    class Meta:
        model = Sa007
        fields = '__all__'
        extra_kwargs = {
            'gkey': {'required': False},
            'serialno': {'required': False},
            'amount': {'required': False},
        }





from rest_framework import serializers
from api.modules.sa.models import *

class Sa005Serializer(serializers.ModelSerializer):
    """
    Assortment 尺碼配比 (sa005) Serializer
    包含 size1~22 及 pairs1~22 的完整扁平化結構。
    """
    class Meta:
        model = Sa005
        fields = '__all__'
        extra_kwargs = {
            'gkey': {'required': False},
            'sa005_ctnpairs': {'required': False},
        }

    def validate(self, data):
        start = data.get('sa005_startsize')
        end = data.get('sa005_endsize')
        max_sz = data.get('sa005_maxsize')
        if start is not None and end is not None and start > end:
            if max_sz is None or max_sz < start:
                raise serializers.ValidationError(
                    "當起始尺碼大於終止尺碼時，MaxSize 必須大於等於起始尺碼！"
                )
        return data

