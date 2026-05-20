import createDictSheet from './createDictSheet';

export default createDictSheet({
  sheetId: 'ba092',
  title: '單位設定檔',
  icon: '📏',
  breadcrumb: '基本資料管理 > 單位設定',
  apiUrl: 'http://localhost:8001/api/ba092/',
  columns: [
    { key: 'serialno', label: '流水號', width: '80px', editable: false, type: 'number' },
    { key: 'express', label: '單位名稱', width: '320px', editable: true, type: 'string' }
  ]
});
