import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

/**
 * BA055Sheet - 季節設定
 * 
 * 符合 V2 架構規範的 SingleTableSheet.
 * 1. 透過 createDataWindowSheet 工廠函數宣告建立，完全無私有 CRUD 與事件監聽.
 */
export default createDataWindowSheet({
  sheetId: 'ba055',
  title: '季節設定',
  breadcrumb: ['基本資料管理', '季節設定'],
  apiUrl: 'http://localhost:8001/api/ba055/',
  sequenceField: 'serialno',
  autoRenumber: true,
  columns: [
    { key: 'serialno', label: '流水號', width: '80px', editable: false, type: 'number' },
    // 💡 註解：maxLength 必須與後端 API Contract / model 一致
    { key: 'groupcode', label: '季節代號', width: '150px', editable: true, type: 'string', maxLength: 10 },
    { key: 'groupname', label: '季節說明', width: '260px', editable: true, type: 'string', maxLength: 30 }
  ]
});
