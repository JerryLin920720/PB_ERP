import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

export default createDataWindowSheet({
  sheetId: 'mr031',
  title: '加工方式設定',
  breadcrumb: ['資材部門管理', '加工方式設定'],
  apiUrl: 'http://localhost:8001/api/mr031/',
  sequenceField: 'serialno',
  autoRenumber: true,
  columns: [
    { key: 'serialno', label: '流水號', width: '100px', editable: false, type: 'number' },
    { key: 'makeno', label: '加工編號', width: '180px', editable: true, type: 'string', maxLength: 20 },
    { key: 'makedescription', label: '加工方式', width: '400px', editable: true, type: 'string', maxLength: 200 }
  ]
});
