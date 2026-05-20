import createDictSheet from './createDictSheet';

export default createDictSheet({
  sheetId: 'ba075',
  title: '付款條件設定檔',
  icon: '💳',
  breadcrumb: '基本資料管理 > 付款條件設定',
  apiUrl: 'http://localhost:8001/api/ba075/',
  columns: [
    { key: 'serialno', label: '流水號', width: '80px', editable: false, type: 'number' },
    { key: 'paymenttype', label: '付款大類名稱', width: '320px', editable: true, type: 'string' }
  ]
});
