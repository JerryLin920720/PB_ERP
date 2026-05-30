import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

/**
 * BA002Sheet - 國家設定檔
 * 
 * 符合 V2 架構規範的 SingleTableSheet.
 * 1. 透過 createDataWindowSheet 工廠函數宣告建立，完全無私有 CRUD 與事件監聽.
 */
export default createDataWindowSheet({
  sheetId: 'ba002',
  title: '國家設定檔',
  breadcrumb: ['基本資料管理', '國家設定'],
  apiUrl: 'http://localhost:8001/api/ba002/',
  sequenceField: 'serialno',
  autoRenumber: true,
  columns: [
    { key: 'serialno', label: '流水號', width: '100px', editable: false, type: 'number' },
    { key: 'ccountry', label: '國家名稱(中)', width: '260px', editable: true, type: 'string' },
    { key: 'ecountry', label: '國家名稱(英)', width: '260px', editable: true, type: 'string' }
  ]
});
