import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

export default createDataWindowSheet({
  sheetId: 'mr020',
  title: '材料厚度設定',
  breadcrumb: ['資材部門管理', '材料厚度設定'],
  apiUrl: 'http://localhost:8001/api/mr020/',
  sequenceField: 'serialno',
  autoRenumber: true,
  columns: [
    { key: 'serialno', label: '流水號', width: '100px', editable: false, type: 'number' },
    { key: 'depthno', label: '厚度編號', width: '150px', editable: true, type: 'string', maxLength: 20 },
    { key: 'depth', label: '厚度', width: '200px', editable: true, type: 'string', maxLength: 30 },
    { key: 'unit', label: '單位', width: '120px', editable: true, type: 'string', maxLength: 15 }
  ]
});
