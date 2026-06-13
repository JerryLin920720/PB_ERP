# Common 目錄

1. **用途**: 存放所有跨模組共用的底層機制與框架，不包含具體業務邏輯。
2. **mixins/**: 存放 ViewSet 與 Serializer 的 Mixins (如 BulkSaveMixin, DeepSaveMixin, AuditFieldsMixin)。
3. **permissions/**: 存放全站共用的權限檢查機制 (如 HasProgramPermission, 按鈕權限, 欄位權限)。
4. **utils/**: 存放無狀態的工具函數 (如 f_gkey, bill no generator, audit log helper, data constraint filter)。
5. **services/**: 存放跨模組的底層業務服務 (如 posting base service 過帳底層)。

未來要搬入的候選項目：
- BulkSaveMixin
- DeepSaveMixin
- AuditFieldsMixin
- HasProgramPermission
- f_gkey
- bill no generator
- data constraint
- audit log helper
- posting base service
