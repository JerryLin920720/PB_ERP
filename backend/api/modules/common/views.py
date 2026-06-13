from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import os
import uuid
from api.common.mixins.audit import AuditFieldsMixin
from api.common.mixins.bulk_save import BulkSaveMixin
from api.common.mixins.validation import ValidationMixin

class BaseDictionaryViewSet(ValidationMixin, BulkSaveMixin, AuditFieldsMixin, viewsets.ModelViewSet):
    """
    🚀 通用字典 API 視圖基底 (100% DRY)
    自動繼承高度相容 PB 髒資料批次交易存檔演算法。
    """
    pass


# 💎 具體實作：極速宣告

@api_view(['GET'])
@permission_classes([AllowAny])
def system_health(request):
    return Response({
        "status": "online",
        "system": "PB ERP Backend Engine",
        "version": "1.0.0-prototype",
        "message": "Backend infrastructure is responding normally."
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_image(request):
    file_obj = request.FILES.get('file') or request.FILES.get('image')
    if not file_obj:
        return Response({"detail": "未收到檔案。"}, status=status.HTTP_400_BAD_REQUEST)
    
    content_type = file_obj.content_type
    if not content_type or not content_type.startswith('image/'):
        return Response({"detail": "檔案類型必須是圖片。"}, status=status.HTTP_400_BAD_REQUEST)
    
    if file_obj.size > 5 * 1024 * 1024:
        return Response({"detail": "圖片大小不能超過 5MB。"}, status=status.HTTP_400_BAD_REQUEST)
        
    ext = os.path.splitext(file_obj.name)[1]
    filename = f"img_{uuid.uuid4().hex}{ext}"
    relative_path = f"uploads/{filename}"
    
    path = default_storage.save(relative_path, ContentFile(file_obj.read()))
    
    media_url = settings.MEDIA_URL
    full_url = request.build_absolute_uri(f"{media_url}{path}")
    
    return Response({
        "url": full_url,
        "path": path,
        "filename": filename
    })


# ============================================================================
# 💰 DP055 樣品成本核算管理 API
# ============================================================================

