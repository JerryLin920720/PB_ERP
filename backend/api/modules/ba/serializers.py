from rest_framework import serializers
from .models import Ba001, Ba002, Ba003, Ba004, Ba005, Ba009, Ba020, Ba040, Ba045, Ba050, Ba055, Ba065, Ba070, Ba075, Ba080, Ba090, Ba091, Ba092, Ba076, Ab230, Ab231, Ba010, Ba011, Ba012, Ba013, Ba014, Ba016, Ba060, Ba061, Ba015

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

class Ba045Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba045
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



class Ba076Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba076
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



class Ba016Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba016
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}



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




class Ba015Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba015
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}



class Ba010Serializer(serializers.ModelSerializer):
    class Meta:
        model = Ba010
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}}



from rest_framework import serializers
from api.modules.ba.models import *

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

