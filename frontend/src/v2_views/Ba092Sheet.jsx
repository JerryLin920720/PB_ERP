import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

/**
 * BA092Sheet - 單位設定
 * 
 * 符合 V2 架構規範的 SingleTableSheet.
 * 1. 透過 createDataWindowSheet 工廠函數宣告建立，完全無私有 CRUD 與事件監聽.
 */
export default createDataWindowSheet({
  sheetId: 'ba092',
  title: '單位設定',
  breadcrumb: ['基本資料管理', '單位設定'],
  apiUrl: 'http://localhost:8001/api/ba092/',
  sequenceField: 'serialno',
  autoRenumber: true,
  columns: [
    { key: 'serialno', label: '流水號', width: '80px', editable: false, type: 'number' },
    // 💡 註解：maxLength 必須與後端 API Contract / model 一致；欄位 key 依舊版設定為 express
    { key: 'express', label: '單位名稱', width: '320px', editable: true, type: 'string', maxLength: 20 }
  ]
});
