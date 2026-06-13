from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework import status
from django.db import transaction

class DeepSaveMixin:
    """
    提供標準 Pattern B (Master-Detail) 的共用深層儲存能力。
    支援 upsert_delete, wipe_and_recreate, delete_excluded 等模式。
    """

    def get_deep_save_config(self):
        config = getattr(self, 'deep_save_config', None)
        if not config:
            raise NotImplementedError(f"{self.__class__.__name__} 必須定義 deep_save_config 才能使用 DeepSaveMixin")
        return config

    @action(detail=False, methods=['post'], url_path='deep_save')
    def deep_save(self, request, *args, **kwargs):
        config = self.get_deep_save_config()
        payload = request.data
        options = config.get('options', {})
        
        master_data = payload.get(config['master']['payload_key'], {})
        if not master_data:
            return Response({"error": "Missing master data"}, status=status.HTTP_400_BAD_REQUEST)

        context = {
            "gkey_map": {},
            "detail_results": {},
            "request": request
        }

        # For generating response
        response_data = {
            "master": {},
            "details": {}
        }

        try:
            with transaction.atomic():
                # 0. Process delete_masters (Deferred Master Delete)
                if options.get('allow_delete_masters', False):
                    delete_key = options.get('delete_masters_key', 'delete_masters')
                    delete_masters = payload.get(delete_key, [])
                    if delete_masters:
                        master_model = config['master']['model']
                        master_pk_field = config['master']['pk_field']
                        master_model.objects.filter(**{f"{master_pk_field}__in": delete_masters}).delete()

                # Normalize master data if hook is provided
                normalize_master_hook = config['master'].get('normalize_hook')
                if normalize_master_hook and hasattr(self, normalize_master_hook):
                    getattr(self, normalize_master_hook)(master_data, context)

                # 1. Save Master
                master_instance, is_master_created = self._save_master(master_data, config['master'], context)
                master_pk_val = getattr(master_instance, config['master']['pk_field'])
                
                temp_master_id = master_data.get(options.get('temp_id_field', '_temp_id'))
                if temp_master_id:
                    context["gkey_map"][temp_master_id] = master_pk_val

                response_data["master"] = {
                    "temp_id": temp_master_id,
                    "gkey": master_pk_val,
                    "action": "create" if is_master_created else "update"
                }

                # After master save hook
                after_master_hook = options.get("after_master_save")
                if after_master_hook and hasattr(self, after_master_hook):
                    getattr(self, after_master_hook)(master_instance, context)

                # 2. Save Details
                for detail_key, detail_conf in config.get('details', {}).items():
                    detail_payload = payload.get(detail_conf['payload_key'])
                    
                    if detail_payload is None:
                        continue

                    # Determine sync_mode
                    sync_mode = detail_conf.get('sync_mode') or options.get('sync_mode', 'upsert_delete')

                    if sync_mode == "upsert_delete":
                        if not isinstance(detail_payload, dict):
                            raise ValidationError({
                                "error": f"Invalid payload format for detail {detail_key}", 
                                "detail_key": detail_key,
                                "message": f"Expected dict with 'upsert'/'delete' keys, got {type(detail_payload).__name__}"
                            })

                        response_data["details"][detail_key] = {"upserted": [], "deleted": []}

                        upsert_rows = detail_payload.get('upsert', [])
                        if upsert_rows:
                            upsert_results = self._save_detail_group(
                                master_instance, master_pk_val, detail_key, upsert_rows, detail_conf, context
                            )
                            response_data["details"][detail_key]["upserted"] = upsert_results

                        delete_rows = detail_payload.get('delete', [])
                        if delete_rows:
                            delete_results = self._delete_detail_rows(detail_key, delete_rows, detail_conf, context)
                            response_data["details"][detail_key]["deleted"] = delete_results

                    elif sync_mode == "wipe_and_recreate":
                        if not isinstance(detail_payload, list):
                            raise ValidationError({
                                "error": f"Invalid payload format for detail {detail_key}", 
                                "detail_key": detail_key,
                                "message": f"Expected list for wipe_and_recreate, got {type(detail_payload).__name__}"
                            })
                        
                        response_data["details"][detail_key] = {"upserted": [], "deleted": []}
                        
                        # 1. Wipe
                        model_class = detail_conf['model']
                        fk_field = detail_conf['fk_field']
                        model_class.objects.filter(**{fk_field: master_instance}).delete()
                        
                        # 2. Recreate
                        if detail_payload:
                            upsert_results = self._save_detail_group(
                                master_instance, master_pk_val, detail_key, detail_payload, detail_conf, context
                            )
                            response_data["details"][detail_key]["upserted"] = upsert_results

                    elif sync_mode == "delete_excluded":
                        if not isinstance(detail_payload, list):
                            raise ValidationError({
                                "error": f"Invalid payload format for detail {detail_key}", 
                                "detail_key": detail_key,
                                "message": f"Expected list for delete_excluded, got {type(detail_payload).__name__}"
                            })
                        
                        response_data["details"][detail_key] = {"upserted": [], "deleted": []}
                        
                        upsert_results = []
                        if detail_payload:
                            upsert_results = self._save_detail_group(
                                master_instance, master_pk_val, detail_key, detail_payload, detail_conf, context
                            )
                            response_data["details"][detail_key]["upserted"] = upsert_results
                        
                        # Gather saved gkeys
                        saved_gkeys = [res['gkey'] for res in upsert_results if 'gkey' in res]
                        
                        # Delete excluded
                        model_class = detail_conf['model']
                        fk_field = detail_conf['fk_field']
                        pk_field = detail_conf['pk_field']
                        excluded_qs = model_class.objects.filter(**{fk_field: master_instance})
                        if saved_gkeys:
                            excluded_qs = excluded_qs.exclude(**{f"{pk_field}__in": saved_gkeys})
                        
                        excluded_qs.delete()
                        
                    else:
                        raise ValidationError({"error": f"Unsupported sync_mode: {sync_mode}", "detail_key": detail_key})

        except ValidationError as e:
            response_mode = options.get("response_mode", "standard")
            if response_mode == "legacy_success_gkey":
                return Response({"success": False, "detail": e.detail}, status=status.HTTP_400_BAD_REQUEST)
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            response_mode = options.get("response_mode", "standard")
            if response_mode == "legacy_success_gkey":
                return Response({"success": False, "detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        response_mode = options.get("response_mode", "standard")
        if response_mode == "legacy_status_gkey":
            return Response({
                "status": "success",
                "gkey": response_data["master"].get("gkey")
            }, status=status.HTTP_200_OK)
        elif response_mode == "legacy_success_gkey":
            success_msg = options.get("success_message", "客戶主從明細原子儲存成功！")
            return Response({
                "success": True,
                "message": success_msg,
                "gkey": response_data["master"].get("gkey")
            }, status=status.HTTP_200_OK)

        return Response(response_data, status=status.HTTP_200_OK)

    def _save_master(self, master_data, master_config, context):
        serializer_class = master_config['serializer']
        model_class = master_config['model']
        pk_field = master_config['pk_field']
        
        pk_val = master_data.get(pk_field)
        
        # Check if it's an update
        if pk_val and not str(pk_val).startswith('temp_'):
            instance = model_class.objects.filter(**{pk_field: pk_val}).first()
            if instance:
                serializer = serializer_class(instance, data=master_data, partial=True)
                if not serializer.is_valid():
                    raise ValidationError({"error": "Master validation failed", "details": serializer.errors})
                serializer.save()
                return instance, False
        
        # Otherwise, create
        serializer = serializer_class(data=master_data)
        if not serializer.is_valid():
            raise ValidationError({"error": "Master validation failed", "details": serializer.errors})
        
        instance = serializer.save()
        return instance, True

    def _apply_fk_mappings(self, row, detail_config, context):
        fk_mappings = detail_config.get('fk_mappings', {})
        for field_name, mapping_conf in fk_mappings.items():
            if field_name in row:
                val = row[field_name]
                if val and str(val).startswith('temp_'):
                    source = mapping_conf.get('source')
                    if source == 'gkey_map':
                        mapped_val = context["gkey_map"].get(val)
                        if mapped_val is not None:
                            row[field_name] = mapped_val
                        else:
                            if not mapping_conf.get('allow_null', False):
                                raise ValidationError({"error": f"Failed to map FK {field_name} from gkey_map", "temp_id": val})
                            else:
                                row[field_name] = None

    def _save_detail_group(self, master_instance, master_pk_val, detail_key, rows, detail_config, context):
        serializer_class = detail_config['serializer']
        model_class = detail_config['model']
        pk_field = detail_config['pk_field']
        fk_field = detail_config['fk_field']
        
        options = self.get_deep_save_config().get('options', {})
        temp_id_field = options.get('temp_id_field', '_temp_id')
        normalize_hook = detail_config.get('normalize_hook')

        results = []
        for row in rows:
            # Set foreign key to master
            row[fk_field] = master_pk_val
            
            # FK Mappings
            self._apply_fk_mappings(row, detail_config, context)
            
            # Normalize hook
            if normalize_hook and hasattr(self, normalize_hook):
                getattr(self, normalize_hook)(row, context)

            pk_val = row.get(pk_field)
            if pk_val and not str(pk_val).startswith('temp_'):
                instance = model_class.objects.filter(**{pk_field: pk_val}).first()
                if instance:
                    serializer = serializer_class(instance, data=row, partial=True)
                    if not serializer.is_valid():
                        raise ValidationError({"error": f"Validation failed in {detail_key}", "row": row, "details": serializer.errors})
                    serializer.save()
                    results.append({"temp_id": row.get(temp_id_field), "gkey": getattr(instance, pk_field), "action": "update"})
                    continue
            
            # Create
            serializer = serializer_class(data=row)
            if not serializer.is_valid():
                raise ValidationError({"error": f"Validation failed in {detail_key}", "row": row, "details": serializer.errors})
            instance = serializer.save()
            new_pk_val = getattr(instance, pk_field)
            
            # Add to gkey_map if temp_id exists
            temp_id = row.get(temp_id_field)
            if temp_id:
                context["gkey_map"][temp_id] = new_pk_val
                
            results.append({"temp_id": temp_id, "gkey": new_pk_val, "action": "create"})
            
        return results

    def _delete_detail_rows(self, detail_key, delete_rows, detail_config, context):
        model_class = detail_config['model']
        pk_field = detail_config['pk_field']
        
        results = []
        for row in delete_rows:
            pk_val = row.get(pk_field)
            if pk_val and not str(pk_val).startswith('temp_'):
                instance = model_class.objects.filter(**{pk_field: pk_val}).first()
                if instance:
                    instance.delete()
                    results.append({"gkey": pk_val, "action": "delete"})
        return results
