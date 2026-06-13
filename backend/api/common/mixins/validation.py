import logging
from rest_framework.exceptions import ValidationError

logger = logging.getLogger(__name__)

class ValidationMixin:
    """
    通用資料檢核與必填防呆機制 (對應 PB wf_CheckData)。
    在資料儲存前 (create, update, deep_save, bulk_save) 進行統一驗證。
    """
    
    def get_validation_config(self):
        return getattr(self, "validation_config", None)

    def validate_master_data(self, data, request):
        """
        依據 validation_config 驗證主檔資料
        """
        errors = []
        config = self.get_validation_config()
        if not config:
            return errors

        # 1. 必填驗證
        for req in config.get("required_fields", []):
            field = req.get("field")
            if not data.get(field):
                errors.append({
                    "scope": "master",
                    "field": field,
                    "label": req.get("label", field),
                    "message": f"{req.get('label', field)} 不可空白"
                })

        # 2. 數值驗證
        for num in config.get("numeric_fields", []):
            field = num.get("field")
            val = data.get(field)
            if val is not None and str(val).strip() != "":
                try:
                    val_float = float(val)
                    if "min" in num and val_float < num["min"]:
                        errors.append({
                            "scope": "master",
                            "field": field,
                            "label": num.get("label", field),
                            "message": f"{num.get('label', field)} 不可小於 {num['min']}"
                        })
                    if "max" in num and val_float > num["max"]:
                        errors.append({
                            "scope": "master",
                            "field": field,
                            "label": num.get("label", field),
                            "message": f"{num.get('label', field)} 不可大於 {num['max']}"
                        })
                except ValueError:
                    errors.append({
                        "scope": "master",
                        "field": field,
                        "label": num.get("label", field),
                        "message": f"{num.get('label', field)} 必須為數字"
                    })

        # 3. 提供客製化鉤子
        custom_errors = self.validate_master(data, request)
        if custom_errors:
            errors.extend(custom_errors)
            
        return errors

    def validate_details_data(self, detail_data, request):
        """
        驗證明細資料
        detail_data: {"dp031": [row1, row2...], ...}
        """
        errors = []
        config = self.get_validation_config()
        if not config:
            return errors

        for rule in config.get("detail_rules", []):
            detail_key = rule.get("detail_key")
            min_rows = rule.get("min_rows", 0)
            rows = detail_data.get(detail_key, [])
            # 過濾掉已經標記刪除的列
            active_rows = [r for r in rows if r.get("_status") != "deleted" and not r.get("_deleted")]
            if len(active_rows) < min_rows:
                errors.append({
                    "scope": "detail",
                    "detail_key": detail_key,
                    "message": rule.get("message", f"{detail_key} 至少需要 {min_rows} 筆資料")
                })
                
        # 客製化明細檢查鉤子
        custom_errors = self.validate_details(detail_data, request)
        if custom_errors:
            errors.extend(custom_errors)
            
        return errors

    def perform_full_validation(self, master_data, detail_data, request):
        errors = []
        errors.extend(self.validate_master_data(master_data, request))
        if detail_data:
            errors.extend(self.validate_details_data(detail_data, request))
        
        # 跨表明細業務規則
        custom_errors = self.validate_business_rules(master_data, detail_data, request)
        if custom_errors:
            errors.extend(custom_errors)
            
        if errors:
            # 拋出標準化的 ValidationError
            raise ValidationError({"success": False, "errors": errors})

    # Hook interfaces for subclasses to override
    def validate_master(self, data, request):
        return []

    def validate_details(self, details, request):
        return []

    def validate_business_rules(self, master_data, detail_data, request):
        return []

    # Intercept DRF views
    def perform_create(self, serializer):
        self.perform_full_validation(serializer.validated_data, {}, self.request)
        super().perform_create(serializer)

    def perform_update(self, serializer):
        self.perform_full_validation(serializer.validated_data, {}, self.request)
        super().perform_update(serializer)
        
    # 如果 ViewSet 有提供 deep_save，可在其中呼叫 perform_full_validation
    # 這裡提供一個 helper 方法供 DeepSaveMixin 或 Views 調用
    def check_deep_save_validation(self, request):
        master_data = request.data.get("master", {})
        detail_data = request.data.get("details", {})
        self.perform_full_validation(master_data, detail_data, request)

    def validate_grid_rows(self, rows_data, request):
        """
        依據 validation_config 驗證 Pattern A 網格多筆資料
        """
        errors = []
        config = self.get_validation_config()
        if not config:
            return errors

        for idx, data in enumerate(rows_data):
            row_index = idx + 1 # 1-based index for UI
            
            # 1. 必填驗證
            for req in config.get("required_fields", []):
                field = req.get("field")
                if not data.get(field):
                    errors.append({
                        "scope": "grid",
                        "row": row_index,
                        "field": field,
                        "label": req.get("label", field),
                        "message": f"第 {row_index} 列 {req.get('label', field)} 不可空白"
                    })

            # 2. 數值驗證
            for num in config.get("numeric_fields", []):
                field = num.get("field")
                val = data.get(field)
                if val is not None and str(val).strip() != "":
                    try:
                        val_float = float(val)
                        if "min" in num and val_float < num["min"]:
                            errors.append({
                                "scope": "grid",
                                "row": row_index,
                                "field": field,
                                "label": num.get("label", field),
                                "message": f"第 {row_index} 列 {num.get('label', field)} 不可小於 {num['min']}"
                            })
                        if "max" in num and val_float > num["max"]:
                            errors.append({
                                "scope": "grid",
                                "row": row_index,
                                "field": field,
                                "label": num.get("label", field),
                                "message": f"第 {row_index} 列 {num.get('label', field)} 不可大於 {num['max']}"
                            })
                    except ValueError:
                        errors.append({
                            "scope": "grid",
                            "row": row_index,
                            "field": field,
                            "label": num.get("label", field),
                            "message": f"第 {row_index} 列 {num.get('label', field)} 必須為數字"
                        })
            
            # 3. 字串長度驗證
            for s in config.get("string_rules", []):
                field = s.get("field")
                val = data.get(field)
                if val is not None and str(val).strip() != "":
                    if "max_length" in s and len(str(val)) > s["max_length"]:
                        errors.append({
                            "scope": "grid",
                            "row": row_index,
                            "field": field,
                            "label": s.get("label", field),
                            "message": f"第 {row_index} 列 {s.get('label', field)} 長度不可超過 {s['max_length']}"
                        })

        return errors

    def check_bulk_save_validation(self, request):
        upsert_data = request.data.get("upsert", [])
        if not upsert_data:
            return
            
        errors = self.validate_grid_rows(upsert_data, request)
        if errors:
            raise ValidationError({"success": False, "errors": errors})
