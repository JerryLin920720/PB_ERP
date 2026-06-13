from rest_framework import serializers
from api.modules.common.models import *

class PhraseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Phrase
        fields = '__all__'
        extra_kwargs = {'gkey': {'required': False}, 'serialno': {'required': False}}


# ============================================================================
# 💼 業務部門管理系統 (Sales Administration - SA) Serializers
# ============================================================================

