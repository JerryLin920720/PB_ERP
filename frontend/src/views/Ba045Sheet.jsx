import createDictSheet from './createDictSheet';

export default createDictSheet({
  sheetId: 'ba045',
  title: '部門設定檔',
  icon: '🏢',
  breadcrumb: '基本資料管理 > 部門設定',
  apiUrl: 'http://localhost:8001/api/ba045/',
  columns: [
    { key: 'serialno', label: '流水號', width: '80px', editable: false, type: 'number' },
    { key: 'department', label: '部門名稱', width: '320px', editable: true, type: 'string' }
  ]
});
