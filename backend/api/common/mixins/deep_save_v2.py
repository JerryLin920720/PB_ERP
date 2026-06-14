from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework import status
from django.db import transaction

class DeepSaveMixinV2:
    """
    Phase 6B: DeepSaveMixinV2
    提供標準 Pattern B (Master-Detail) 的共用深層儲存能力，並完美整合:
    - ValidationMixin (事前整包驗證)
    - ApprovalMixin (Approve Lock 防呆)
    - DataConstraint (權限範圍防護)
    - BillNoMixin (由前端產生單號)
    """

    def get_deep_save_config(self):
        config = getattr(self, 'deep_save_config', None)
        if not config:
            raise NotImplementedError(f"{self.__class__.__name__} 必須定義 deep_save_config 才能使用 DeepSaveMixinV2")
        return config

    # Hooks 預留區 (允許 ViewSet 覆寫)
    def pre_deep_save_hook(self, master_data, detail_data, request):
        pass

    def post_master_save_hook(self, master_instance, master_data, request):
        pass

    def post_detail_save_hook(self, master_instance, detail_key, detail_instances, request, raw_detail_payload=None, detail_result=None, **kwargs):
        pass

    def post_deep_save_hook(self, master_instance, detail_result, request):
        pass

    @action(detail=False, methods=['post'], url_path='deep_save')
    def deep_save(self, request, *args, **kwargs):
        config = self.get_deep_save_config()
        payload = request.data
        
        master_data = payload.get('master', {})
        details_data = payload.get('details', {})
        if not details_data and 'details' not in payload:
            for k in config.get('details', {}).keys():
                if k in payload:
                    details_data[k] = payload[k]
        
        if not master_data:
            return Response({"error": "Missing master data"}, status=status.HTTP_400_BAD_REQUEST)

        master_pk_field = config['master_lookup_field']
        master_pk_val = master_data.get(master_pk_field)

        # 0. Phase 9A-3: Granular Action Permission Check
        from core.authz.services import has_program_permission
        account = getattr(request.user, 'sys_account', None)
        program_id = getattr(self, 'program_id', None)
        # Import STRICT_PERMISSION_PROGRAMS        # TODO: 將 allowlist 抽離到 settings
        STRICT_PERMISSION_PROGRAMS = {'w_dp030', 'w_dp040'}
        
        if program_id and account and program_id in STRICT_PERMISSION_PROGRAMS:
            is_update = bool(master_pk_val and not str(master_pk_val).startswith('temp_'))
            if is_update:
                if not has_program_permission(account, program_id, 'edit', strict_backend=True):
                    return Response({"success": False, "detail": "您沒有修改此作業資料的權限 (缺少 edit 權限)"}, status=status.HTTP_403_FORBIDDEN)
            else:
                if not has_program_permission(account, program_id, 'new', strict_backend=True):
                    return Response({"success": False, "detail": "您沒有新增此作業資料的權限 (缺少 new 權限)"}, status=status.HTTP_403_FORBIDDEN)
            
            # Check detail delete
            has_detail_delete = any(len(d.get('delete', [])) > 0 for d in details_data.values() if isinstance(d, dict))
            if has_detail_delete:
                if not (has_program_permission(account, program_id, 'edit', strict_backend=True) or 
                        has_program_permission(account, program_id, 'delete', strict_backend=True)):
                    return Response({"success": False, "detail": "您沒有刪除明細資料的權限 (缺少 edit 或 delete 權限)"}, status=status.HTTP_403_FORBIDDEN)


        # 1. Approval Lock 防護
        if master_pk_val and not str(master_pk_val).startswith('temp_'):
            master_model = config['master_serializer'].Meta.model
            existing_master = master_model.objects.filter(**{master_pk_field: master_pk_val}).first()
            if existing_master:
                # 檢查 is_approved
                if getattr(existing_master, 'is_approved', None) in ['Y', True] or                    getattr(existing_master, 'approve', None) in ['Y', True] or                    getattr(existing_master, 'capprove', None) in ['Y', True]:
                    return Response({"success": False, "detail": "此資料已審核，請先反審核後再修改"}, status=status.HTTP_403_FORBIDDEN)
                
                # Data Constraint 防護 (若資料不屬於該使用者能看見的範圍，拒絕異動)
                if hasattr(self, 'filter_queryset'):
                    qs = self.filter_queryset(master_model.objects.all())
                    if not qs.filter(**{master_pk_field: master_pk_val}).exists():
                        return Response({"success": False, "detail": "此資料不屬於您的權限範圍，無法修改"}, status=status.HTTP_403_FORBIDDEN)

        # 2. ValidationMixin 前置驗證 (Phase 5C 整合)
        if hasattr(self, 'check_deep_save_validation'):
            # check_deep_save_validation 如果失敗會直接 raise ValidationError，DRF 會處理為 400
            self.check_deep_save_validation(request)

        context = {
            "gkey_map": {},
            "detail_results": {},
            "request": request
        }

        response_data = {
            "master": {},
            "details": {}
        }

        try:
            with transaction.atomic():
                # Hook: Pre Deep Save
                self.pre_deep_save_hook(master_data, details_data, request)

                # 3. Save Master
                master_instance, is_master_created = self._save_master(master_data, config, context)
                new_master_pk_val = getattr(master_instance, master_pk_field)
                
                temp_master_id = master_data.get('_tempId')
                if temp_master_id:
                    context["gkey_map"][temp_master_id] = new_master_pk_val

                response_data["master"] = {
                    "tempId": temp_master_id,
                    master_pk_field: new_master_pk_val,
                    "action": "create" if is_master_created else "update"
                }

                # Hook: Post Master Save
                self.post_master_save_hook(master_instance, master_data, request)

                # 4. Save Details
                for detail_key, detail_conf in config.get('details', {}).items():
                    detail_payload = details_data.get(detail_key)
                    if not detail_payload:
                        continue

                    response_data["details"][detail_key] = {"upsert": [], "delete": []}

                    # Delete
                    delete_rows = detail_payload.get('delete', [])
                    if delete_rows:
                        delete_results = self._delete_detail_rows(detail_key, delete_rows, detail_conf, context)
                        response_data["details"][detail_key]["delete"] = delete_results

                    # Upsert
                    upsert_rows = detail_payload.get('upsert', [])
                    if upsert_rows:
                        upsert_results, upserted_instances = self._save_detail_group(
                            master_instance, new_master_pk_val, detail_key, upsert_rows, detail_conf, context
                        )
                        response_data["details"][detail_key]["upsert"] = upsert_results
                        
                        # Hook: Post Detail Save
                        self.post_detail_save_hook(
                            master_instance,
                            detail_key,
                            upserted_instances,
                            request,
                            raw_detail_payload=detail_payload,
                            detail_result=upsert_results
                        )

                # Hook: Post Deep Save
                self.post_deep_save_hook(master_instance, response_data, request)

        except Exception as e:
            if isinstance(e, ValidationError):
                return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
            from rest_framework.exceptions import PermissionDenied
            if isinstance(e, PermissionDenied):
                return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
            import traceback
            traceback.print_exc()
            return Response({"success": False, "detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 回傳最新完整資料給前端
        # 利用 master serializer 再撈一次

        # Clean response_data of non-serializable objects (instance, raw_row)
        clean_sync_map = {"master": response_data["master"], "details": {}}
        for dk, dvals in response_data["details"].items():
            clean_sync_map["details"][dk] = {"upsert": [], "delete": dvals.get("delete", [])}
            for u in dvals.get("upsert", []):
                clean_u = {k: v for k, v in u.items() if k not in ["instance", "raw_row"]}
                clean_sync_map["details"][dk]["upsert"].append(clean_u)

        final_serializer = config['master_serializer'](master_instance)
        
        return Response({
            "success": True,
            "message": "資料儲存成功",
            "action": response_data["master"]["action"],
            "data": final_serializer.data,
            "sync_map": clean_sync_map # 回傳 tempId -> gkey 對照表，利於前端更新 state
        }, status=status.HTTP_200_OK)

    def _save_master(self, master_data, config, context):
        serializer_class = config['master_serializer']
        model_class = serializer_class.Meta.model
        pk_field = config['master_lookup_field']
        
        pk_val = master_data.get(pk_field)
        
        # Check if it's an update
        if pk_val and not str(pk_val).startswith('temp_'):
            instance = model_class.objects.filter(**{pk_field: pk_val}).first()
            if instance:
                serializer = serializer_class(instance, data=master_data, partial=True, context={'request': self.request})
                serializer.is_valid(raise_exception=True)
                # Audit 欄位維護
                if hasattr(instance, 'modifyuser'):
                    serializer.validated_data['modifyuser'] = getattr(self.request.user, 'username', 'system')
                import datetime
                if hasattr(instance, 'modifydate'):
                    serializer.validated_data['modifydate'] = datetime.datetime.now()
                serializer.save()
                return instance, False
        
        # Otherwise, create
        serializer = serializer_class(data=master_data, context={'request': self.request})
        serializer.is_valid(raise_exception=True)
        # Audit 欄位維護
        mock_instance = model_class()
        if hasattr(mock_instance, 'createuser'):
            serializer.validated_data['createuser'] = getattr(self.request.user, 'username', 'system')
        import datetime
        if hasattr(mock_instance, 'createdate'):
            serializer.validated_data['createdate'] = datetime.datetime.now()
            
        instance = serializer.save()
        return instance, True

    def _save_detail_group(self, master_instance, master_pk_val, detail_key, rows, detail_config, context):
        serializer_class = detail_config['serializer']
        model_class = detail_config['model']
        pk_field = detail_config['lookup_field']
        fk_field = detail_config['parent_field']
        
        results = []
        instances = []
        
        for row in rows:
            row[fk_field] = master_pk_val
            
            # Prepare serializer data, excluding custom children to prevent unknown field errors
            custom_children = detail_config.get('custom_children', [])
            ser_data = {k: v for k, v in row.items() if k not in custom_children}
            
            pk_val = row.get(pk_field)
            if pk_val and not str(pk_val).startswith('temp_'):
                instance = model_class.objects.filter(**{pk_field: pk_val}).first()
                if instance:
                    serializer = serializer_class(instance, data=ser_data, partial=True, context={'request': self.request})
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                    results.append({"_tempId": row.get('_tempId'), pk_field: getattr(instance, pk_field), "action": "update", "instance": instance, "raw_row": row})
                    instances.append(instance)
                    continue
            
            # Create
            serializer = serializer_class(data=ser_data, context={'request': self.request})
            serializer.is_valid(raise_exception=True)
            instance = serializer.save()
            new_pk_val = getattr(instance, pk_field)
            
            temp_id = row.get('_tempId')
            if temp_id:
                context["gkey_map"][temp_id] = new_pk_val
                
            results.append({"_tempId": temp_id, pk_field: new_pk_val, "action": "create", "instance": instance, "raw_row": row})
            instances.append(instance)
            
        return results, instances

    def _delete_detail_rows(self, detail_key, delete_rows, detail_config, context):
        model_class = detail_config['model']
        pk_field = detail_config['lookup_field']
        
        results = []
        # Bulk get IDs to delete
        ids_to_delete = [row.get(pk_field) for row in delete_rows if row.get(pk_field) and not str(row.get(pk_field)).startswith('temp_')]
        if ids_to_delete:
            # Check delete mode
            delete_mode = detail_config.get('delete_mode', 'hard')
            qs = model_class.objects.filter(**{f"{pk_field}__in": ids_to_delete})
            if delete_mode == 'soft' and hasattr(model_class, 'deleted'):
                qs.update(deleted='Y')
            else:
                qs.delete()
            for pk_val in ids_to_delete:
                results.append({pk_field: pk_val, "action": "delete"})
        return results
