import createDictSheet from './createDictSheet';

export default createDictSheet({
  sheetId: 'ba090',
  title: '快遞公司設定檔',
  icon: '🚚',
  breadcrumb: '基本資料管理 > 快遞公司設定',
  apiUrl: 'http://localhost:8001/api/ba090/',
  columns: [
    { key: 'serialno', label: '流水號', width: '80px', editable: false, type: 'number' },
    { key: 'express', label: '快遞公司名稱', width: '320px', editable: true, type: 'string' }
  ]
});
