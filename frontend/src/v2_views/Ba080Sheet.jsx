import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

/**
 * BA080Sheet - 配件設定
 * 
 * 符合 V2 架構規範的 SingleTableSheet.
 * 1. 透過 createDataWindowSheet 工廠函數宣告建立，完全無私有 CRUD 與事件監聽.
 */
export default createDataWindowSheet({
  sheetId: 'ba080',
  title: '配件設定',
  breadcrumb: ['基本資料管理', '配件設定'],
  apiUrl: 'http://localhost:8001/api/ba080/',
  sequenceField: 'serialno',
  autoRenumber: true,
  columns: [
    { key: 'serialno', label: '流水號', width: '80px', editable: false, type: 'number' },
    // 💡 註解：maxLength 必須與後端 API Contract / model 一致
    { key: 'accessory', label: '配件名稱', width: '300px', editable: true, type: 'string', maxLength: 50 },
    { key: 'description', label: '配件說明', width: '360px', editable: true, type: 'string', maxLength: 100 }
  ]
});
