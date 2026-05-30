import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

/**
 * BA045Sheet - 部門設定檔
 * 
 * 符合 V2 架構規範的 SingleTableSheet.
 * 1. 透過 createDataWindowSheet 工廠函數宣告建立，完全無私有 CRUD 與事件監聽.
 */
export default createDataWindowSheet({
  sheetId: 'ba045',
  title: '部門設定檔',
  breadcrumb: ['基本資料管理', '部門設定'],
  apiUrl: 'http://localhost:8001/api/ba045/',
  sequenceField: 'serialno',
  autoRenumber: true,
  columns: [
    { key: 'serialno', label: '流水號', width: '80px', editable: false, type: 'number' },
    { key: 'department', label: '部門名稱', width: '320px', editable: true, type: 'string' }
  ]
});
