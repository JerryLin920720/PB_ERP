import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

export default createDataWindowSheet({
  sheetId: 'mr001',
  title: '資材片語字庫設定',
  breadcrumb: ['資材部門管理', '片語字庫設定'],
  apiUrl: 'http://localhost:8001/api/mr001/',
  sequenceField: 'serialno',
  autoRenumber: true,
  columns: [
    { key: 'serialno', label: '流水號', width: '100px', editable: false, type: 'number' },
    { key: 'description', label: '片語說明', width: '450px', editable: true, type: 'string' },
    { key: 'f2type', label: '類別代號', width: '120px', editable: false, type: 'string', initialValue: 'MR' }
  ]
});
