import createDictSheet from './createDictSheet';

export default createDictSheet({
  sheetId: 'ba070',
  title: '交易條件設定檔',
  icon: '📜',
  breadcrumb: '基本資料管理 > 交易條件設定',
  apiUrl: 'http://localhost:8001/api/ba070/',
  columns: [
    { key: 'serialno', label: '流水號', width: '80px', editable: false, type: 'number' },
    { key: 'termtype', label: '貿易條件名稱', width: '360px', editable: true, type: 'string' }
  ]
});
