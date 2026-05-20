import createDictSheet from './createDictSheet';

export default createDictSheet({
  sheetId: 'ba020',
  title: '材料供應商類別設定',
  icon: '🗂️',
  breadcrumb: '基本資料管理 > 材料供應商類別設定',
  apiUrl: 'http://localhost:8001/api/ba020/',
  columns: [
    { key: 'type', label: '類型 (2/3)', width: '100px', editable: true, type: 'string' },
    { key: 'code', label: '代碼', width: '100px', editable: true, type: 'string' },
    { key: 'category', label: '分類名稱', width: '260px', editable: true, type: 'string' }
  ]
});
