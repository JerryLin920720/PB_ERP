import createDictSheet from './createDictSheet';

export default createDictSheet({
  sheetId: 'ba065',
  title: '交易港口設定檔',
  icon: '⚓',
  breadcrumb: '基本資料管理 > 交易港口設定',
  apiUrl: 'http://localhost:8001/api/ba065/',
  columns: [
    { key: 'serialno', label: '流水號', width: '80px', editable: false, type: 'number' },
    { key: 'term', label: '港口名稱', width: '360px', editable: true, type: 'string' }
  ]
});
