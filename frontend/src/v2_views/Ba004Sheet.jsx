import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

/**
 * BA004Sheet - 區域設定檔
 * 
 * 符合 V2 架構規範的 SingleTableSheet.
 * 1. 透過 createDataWindowSheet 工廠函數宣告建立，完全無私有 CRUD 與事件監聽.
 */
export default createDataWindowSheet({
  sheetId: 'ba004',
  title: '區域設定檔',
  breadcrumb: ['基本資料管理', '區域設定'],
  apiUrl: 'http://localhost:8001/api/ba004/',
  sequenceField: 'serialno',
  autoRenumber: true,
  columns: [
    { key: 'serialno', label: '流水號', width: '80px', editable: false, type: 'number' },
    { key: 'areacode', label: '區域代號', width: '120px', editable: true, type: 'string' },
    { key: 'carea', label: '區域名稱(中)', width: '220px', editable: true, type: 'string' },
    { key: 'earea', label: '區域名稱(英)', width: '220px', editable: true, type: 'string' }
  ]
});
