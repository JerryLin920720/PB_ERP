import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

/**
 * BA009Sheet - 品牌設定檔
 * 
 * 符合 V2 架構規範的 SingleTableSheet.
 * 1. 透過 createDataWindowSheet 工廠函數宣告建立，完全無私有 CRUD 與事件監聽.
 */
export default createDataWindowSheet({
  sheetId: 'ba009',
  title: '品牌設定檔',
  breadcrumb: ['基本資料管理', '品牌設定'],
  apiUrl: 'http://localhost:8001/api/ba009/',
  sequenceField: 'serialno',
  autoRenumber: true,
  columns: [
    { key: 'serialno', label: '流水號', width: '80px', editable: false, type: 'number' },
    { key: 'cbrand', label: '品牌名稱(中)', width: '220px', editable: true, type: 'string' },
    { key: 'ebrand', label: '品牌名稱(英)', width: '260px', editable: true, type: 'string' }
  ]
});
