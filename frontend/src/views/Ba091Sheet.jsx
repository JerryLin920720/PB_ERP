import createDictSheet from './createDictSheet';

export default createDictSheet({
  sheetId: 'ba091',
  title: '運輸方式設定檔',
  icon: '🚢',
  breadcrumb: '基本資料管理 > 運輸方式設定',
  apiUrl: 'http://localhost:8001/api/ba091/',
  columns: [
    { key: 'serialno', label: '流水號', width: '80px', editable: false, type: 'number' },
    { key: 'shipvia', label: '運輸簡稱', width: '200px', editable: true, type: 'string' },
    { key: 'type', label: '運輸類型', width: '150px', editable: true, type: 'string' }
  ]
});
