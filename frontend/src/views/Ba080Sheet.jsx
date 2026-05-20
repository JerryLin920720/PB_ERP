import createDictSheet from './createDictSheet';

export default createDictSheet({
  sheetId: 'ba080',
  title: '配件設定檔',
  icon: '🔩',
  breadcrumb: '基本資料管理 > 配件設定',
  apiUrl: 'http://localhost:8001/api/ba080/',
  columns: [
    { key: 'serialno', label: '流水號', width: '80px', editable: false, type: 'number' },
    { key: 'accessory', label: '配件名稱', width: '300px', editable: true, type: 'string' },
    { key: 'description', label: '配件說明', width: '360px', editable: true, type: 'string' }
  ]
});
