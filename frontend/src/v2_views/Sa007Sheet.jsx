import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

/**
 * Sa007Sheet - 報價其他費用設定
 *
 * V2 架構規範：
 * 1. 透過 createDataWindowSheet 工廠函數宣告建立，完全無私有 CRUD state。
 * 2. 欄位渲染與 CRUD 控制委託給 Layer 2 (Win32DataWindow)。
 *
 * PB 原始邏輯對照 (d_sa007)：
 *   - Retrieve：sa007 全表
 *   - Insert：自動遞增 serialno
 *   - agument +1=外加 / -1=折扣
 *   - 計算結構較 sa006 單純，僅固定金額，無 computemode
 *   - 被 sa010 (報價單) 的費用明細 sa014 引用
 */
export default createDataWindowSheet({
  sheetId: 'sa007',
  title: '報價其他費用設定',
  breadcrumb: ['業務部門管理', '報價其他費用設定'],
  apiUrl: 'http://localhost:8001/api/sa007/',
  sequenceField: 'serialno',
  autoRenumber: true,
  columns: [
    {
      key: 'serialno',
      label: '流水號',
      width: '80px',
      editable: false,
      type: 'number'
    },
    {
      key: 'typename',
      label: '費用項目名稱',
      width: '240px',
      editable: true,
      type: 'string',
      maxLength: 50
    },
    {
      key: 'agument',
      label: '加減項',
      width: '120px',
      editable: true,
      type: 'select',
      options: [
        { value: '1', label: '+ 外加' },
        { value: '-1', label: '- 折扣' }
      ]
    },
    {
      key: 'amount',
      label: '金額',
      width: '140px',
      editable: true,
      type: 'number'
    }
  ]
});
