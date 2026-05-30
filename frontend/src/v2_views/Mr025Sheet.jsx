import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

export default createDataWindowSheet({
  sheetId: 'mr025',
  title: '材料幅度設定',
  breadcrumb: ['資材部門管理', '材料幅度設定'],
  apiUrl: 'http://localhost:8001/api/mr025/',
  sequenceField: 'serialno',
  autoRenumber: true,
  columns: [
    { key: 'serialno', label: '流水號', width: '100px', editable: false, type: 'number' },
    { key: 'breadthno', label: '幅度編號', width: '150px', editable: true, type: 'string', maxLength: 20 },
    { key: 'breadth', label: '幅度', width: '200px', editable: true, type: 'string', maxLength: 30 },
    { key: 'unit', label: '單位', width: '120px', editable: true, type: 'string', maxLength: 15 }
  ]
});
