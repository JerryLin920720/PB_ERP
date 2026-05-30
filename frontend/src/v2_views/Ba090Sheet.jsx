import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

/**
 * BA090Sheet - 快遞公司設定
 * 
 * 符合 V2 架構規範的 SingleTableSheet.
 * 1. 透過 createDataWindowSheet 工廠函數宣告建立，完全無私有 CRUD 與事件監聽.
 */
export default createDataWindowSheet({
  sheetId: 'ba090',
  title: '快遞公司設定',
  breadcrumb: ['基本資料管理', '快遞公司設定'],
  apiUrl: 'http://localhost:8001/api/ba090/',
  sequenceField: 'serialno',
  autoRenumber: true,
  columns: [
    { key: 'serialno', label: '流水號', width: '80px', editable: false, type: 'number' },
    // 💡 註解：maxLength 必須與後端 API Contract / model 一致
    { key: 'express', label: '快遞公司名稱', width: '320px', editable: true, type: 'string', maxLength: 20 }
  ]
});
