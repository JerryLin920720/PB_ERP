import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

/**
 * Sa006Sheet - 其他費用設定
 *
 * V2 架構規範：
 * 1. 透過 createDataWindowSheet 工廠函數宣告建立，完全無私有 CRUD state。
 * 2. 欄位渲染與 CRUD 控制委託給 Layer 2 (Win32DataWindow)。
 *
 * PB 原始邏輯對照 (d_sa006)：
 *   - Retrieve：sa006 全表
 *   - Insert：自動遞增 serialno
 *   - computemode 1=固定金額 / 2=總金額 / 3=總雙數
 *   - agument +1=外加 / -1=折扣
 *   - PB ItemChanged 邏輯：
 *     computemode='1' → spercent 設為唯讀，清為 0
 *     computemode='2'/'3' → amount 設為唯讀，清為 0
 *   注意：欄位連動 protect 邏輯目前依靠使用者自行判斷輸入，
 *         後續可在 createDataWindowSheet 支援 conditionalEditable 擴充後升級。
 */
export default createDataWindowSheet({
  sheetId: 'sa006',
  title: '其他費用設定',
  breadcrumb: ['業務部門管理', '其他費用設定'],
  apiUrl: 'http://localhost:8001/api/sa006/',
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
      width: '200px',
      editable: true,
      type: 'string',
      maxLength: 50
    },
    {
      key: 'computemode',
      label: '計算方式',
      width: '130px',
      editable: true,
      type: 'select',
      options: [
        { value: '1', label: '固定金額' },
        { value: '2', label: '總金額比例' },
        { value: '3', label: '總雙數比例' }
      ]
    },
    {
      key: 'agument',
      label: '加減項',
      width: '100px',
      editable: true,
      type: 'select',
      options: [
        { value: '1', label: '+ 外加' },
        { value: '-1', label: '- 折扣' }
      ]
    },
    {
      key: 'spercent',
      label: '比例 (%)',
      width: '110px',
      editable: true,
      type: 'number'
    },
    {
      key: 'amount',
      label: '金額',
      width: '110px',
      editable: true,
      type: 'number'
    }
  ]
});
