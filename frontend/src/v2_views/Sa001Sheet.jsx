import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

/**
 * Sa001Sheet - 業務片語字庫
 *
 * V2 架構規範：
 * 1. 透過 createDataWindowSheet 工廠函數宣告建立，完全無私有 CRUD state。
 * 2. 欄位渲染與 CRUD 控制委託給 Layer 2 (Win32DataWindow)。
 * 3. 使用 ba001 表，以 f2type='SA' 區分業務部門片語。
 *    後端 ViewSet 自動過濾並在新增時強制帶入 f2type='SA'。
 *
 * PB 原始邏輯對照：
 *   - Retrieve：ba001 where f2type = 'SA'
 *   - Insert：自動遞增 serialno，強制 f2type = 'SA'
 *   - 欄位 description 不可空白
 *   - f2type 唯讀（由後端自動管理）
 */
export default createDataWindowSheet({
  sheetId: 'sa001',
  title: '業務片語字庫',
  breadcrumb: ['業務部門管理', '業務片語字庫'],
  apiUrl: 'http://localhost:8001/api/sa001/',
  sequenceField: 'serialno',
  sequenceScopeField: 'f2type',
  autoRenumber: true,
  columns: [
    {
      key: 'serialno',
      label: '流水號',
      width: '90px',
      editable: false,
      type: 'number'
    },
    {
      key: 'description',
      label: '片語說明',
      width: '560px',
      editable: true,
      type: 'string',
      maxLength: 500
    },
    { key: 'f2type', label: '類別代號', width: '120px', editable: false, type: 'string', initialValue: 'SA' }
    
  ]
});
