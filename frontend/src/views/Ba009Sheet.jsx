import createDictSheet from './createDictSheet';

export default createDictSheet({
  sheetId: 'ba009',
  title: '品牌設定檔',
  icon: '🏷️',
  breadcrumb: '基本資料管理 > 品牌設定',
  apiUrl: 'http://localhost:8001/api/ba009/',
  columns: [
    { key: 'serialno', label: '流水號', width: '80px', editable: false, type: 'number' },
    { key: 'cbrand', label: '品牌名稱(中)', width: '220px', editable: true, type: 'string' },
    { key: 'ebrand', label: '品牌名稱(英)', width: '260px', editable: true, type: 'string' }
  ]
});
