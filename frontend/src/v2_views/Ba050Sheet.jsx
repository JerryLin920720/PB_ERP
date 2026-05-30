import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

/**
 * BA050Sheet - 職務設定檔
 * 
 * 符合 V2 架構規範的 SingleTableSheet.
 * 1. 透過 createDataWindowSheet 工廠函數宣告建立，完全無私有 CRUD 與事件監聽.
 */
export default createDataWindowSheet({
  sheetId: 'ba050',
  title: '職務設定檔',
  breadcrumb: ['基本資料管理', '職務設定'],
  apiUrl: 'http://localhost:8001/api/ba050/',
  sequenceField: 'serialno',
  autoRenumber: true,
  columns: [
    { key: 'serialno', label: '流水號', width: '80px', editable: false, type: 'number' },
    { key: 'jobpositon', label: '職務名稱', width: '320px', editable: true, type: 'string' }
  ]
});
