from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.db.models import Max
from .audit import apply_create_audit_fields, apply_update_audit_fields

class BulkSaveMixin:
    """
    提供 PB 髒資料批次交易存檔演算法 (bulk_save)。
    """
    def get_queryset(self):
        try:
            self.queryset.model._meta.get_field('serialno')
            return self.queryset.order_by('serialno')
        except Exception:
            return self.queryset.all()

    @action(detail=False, methods=['post'], url_path='bulk_save')
    def bulk_save(self, request):
        # 插入 Pattern A Validation 攔截點
        if hasattr(self, 'check_bulk_save_validation'):
            self.check_bulk_save_validation(request)

        upsert_data = request.data.get('upsert', [])
        delete_keys = request.data.get('delete', [])
        model_cls = self.queryset.model
        serializer_cls = self.get_serializer_class()

        try:
            # 動態偵測物理模型是否包含 serialno
            has_serialno = False
            try:
                model_cls._meta.get_field('serialno')
                has_serialno = True
            except Exception:
                has_serialno = False

            with transaction.atomic():
                # 1. 物理刪除
                if delete_keys:
                    if model_cls.__name__ == 'Ba001':
                        model_cls.objects.filter(gkey__in=delete_keys, f2type='BA').delete()
                    elif model_cls.__name__ == 'Dp001':
                        model_cls.objects.filter(gkey__in=delete_keys, f2type='DP').delete()
                    else:
                        model_cls.objects.filter(gkey__in=delete_keys).delete()
                
                # 2. 物理新增或異動修改
                current_max = 0
                if has_serialno:
                    current_max = self.queryset.aggregate(Max('serialno'))['serialno__max'] or 0
                
                upserted_instances = []
                for item in upsert_data:
                    data_copy = {k: v for k, v in item.items()}
                    gkey = data_copy.get('gkey')
                    
                    if gkey and str(gkey).startswith('temp_'): 
                        # 自動新增 (觸發 generate_pb_gkey)
                        data_copy.pop('gkey', None)
                        provided_serialno = data_copy.pop('serialno', None)
                        
                        # 自動補上 create audit fields 和 es101gkey
                        apply_create_audit_fields(data_copy, request, model_cls=model_cls)
                        
                        if model_cls.__name__ == 'Ba001':
                            data_copy['f2type'] = 'BA'
                        elif model_cls.__name__ == 'Dp001':
                            data_copy['f2type'] = 'DP'
                        
                        serializer = serializer_cls(data=data_copy)
                        serializer.is_valid(raise_exception=True)
                        if has_serialno:
                            # 💡 物理優化：如果前端有給有效數字序號則優先採用 (支持手動排序)
                            try:
                                final_sn = int(provided_serialno)
                            except (TypeError, ValueError):
                                current_max += 1
                                final_sn = current_max
                            instance = serializer.save(serialno=final_sn)
                        else:
                            instance = serializer.save()
                        upserted_instances.append(instance)
                    elif gkey:
                        # 單行物理更新
                        # 💡 物理優化：不再強制 pop serialno，允許前端異動排序
                        if model_cls.__name__ == 'Ba001':
                            instance = model_cls.objects.get(gkey=gkey, f2type='BA')
                        elif model_cls.__name__ == 'Dp001':
                            instance = model_cls.objects.get(gkey=gkey, f2type='DP')
                        else:
                            instance = model_cls.objects.get(gkey=gkey)
                        
                        # 自動補上 update audit fields
                        apply_update_audit_fields(data_copy, request, model_cls=model_cls)
                        
                        if model_cls.__name__ == 'Ba001':
                            data_copy['f2type'] = 'BA'
                        elif model_cls.__name__ == 'Dp001':
                            data_copy['f2type'] = 'DP'
                        
                        serializer = serializer_cls(instance, data=data_copy, partial=True)
                        serializer.is_valid(raise_exception=True)
                        instance = serializer.save()
                        upserted_instances.append(instance)
                    else:
                        # 例外防呆
                        data_copy.pop('gkey', None)
                        data_copy.pop('serialno', None)
                        
                        # 自動補上 create audit fields 和 es101gkey
                        apply_create_audit_fields(data_copy, request, model_cls=model_cls)
                        
                        if model_cls.__name__ == 'Ba001':
                            data_copy['f2type'] = 'BA'
                        elif model_cls.__name__ == 'Dp001':
                            data_copy['f2type'] = 'DP'
                        
                        serializer = serializer_cls(data=data_copy)
                        serializer.is_valid(raise_exception=True)
                        if has_serialno:
                            current_max += 1
                            instance = serializer.save(serialno=current_max)
                        else:
                            instance = serializer.save()
                        upserted_instances.append(instance)
                
                # 回傳序列化後的結果，讓前端獲取新產生的 gkey
                upserted_records = serializer_cls(upserted_instances, many=True).data
                        
            return Response({
                "success": True, 
                "message": "通用字典資料批次交易成功",
                "upserted_records": upserted_records
            })
        except Exception as e:
            from rest_framework.exceptions import ValidationError
            if isinstance(e, ValidationError) and isinstance(e.detail, dict) and "errors" in e.detail:
                # 若為標準 ValidationMixin 錯誤格式，直接回傳
                return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
            # 強迫報出具體 unique 錯誤等細節
            return Response({"success": False, "detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
