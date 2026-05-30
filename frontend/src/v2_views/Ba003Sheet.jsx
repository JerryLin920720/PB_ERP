import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

/**
 * BA003Sheet - 產地設定檔
 * 
 * 符合 V2 架構規範的 SingleTableSheet.
 * 1. 透過 createDataWindowSheet 工廠函數宣告建立，完全無私有 CRUD 與事件監聽.
 */
export default createDataWindowSheet({
  sheetId: 'ba003',
  title: '產地設定檔',
  breadcrumb: ['基本資料管理', '產地設定'],
  apiUrl: 'http://localhost:8001/api/ba003/',
  sequenceField: 'serialno',
  autoRenumber: true,
  columns: [
    { key: 'serialno', label: '流水號', width: '100px', editable: false, type: 'number' },
    { key: 'corigin', label: '產地名稱(中)', width: '260px', editable: true, type: 'string' },
    { key: 'eorigin', label: '產地名稱(英)', width: '260px', editable: true, type: 'string' }
  ]
});
