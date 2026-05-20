import createDictSheet from './createDictSheet';

export default createDictSheet({
  sheetId: 'ba050',
  title: '職務設定檔',
  icon: '👔',
  breadcrumb: '基本資料管理 > 職務設定',
  apiUrl: 'http://localhost:8001/api/ba050/',
  columns: [
    { key: 'serialno', label: '流水號', width: '80px', editable: false, type: 'number' },
    { key: 'jobpositon', label: '職務名稱', width: '320px', editable: true, type: 'string' }
  ]
});
