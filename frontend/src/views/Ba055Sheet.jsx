import createDictSheet from './createDictSheet';

export default createDictSheet({
  sheetId: 'ba055',
  title: '季節設定檔',
  icon: '🍂',
  breadcrumb: '基本資料管理 > 季節設定',
  apiUrl: 'http://localhost:8001/api/ba055/',
  columns: [
    { key: 'serialno', label: '流水號', width: '80px', editable: false, type: 'number' },
    { key: 'groupcode', label: '季節代號', width: '150px', editable: true, type: 'string' },
    { key: 'groupname', label: '季節說明', width: '260px', editable: true, type: 'string' }
  ]
});
