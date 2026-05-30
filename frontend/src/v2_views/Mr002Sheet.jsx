import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

export default createDataWindowSheet({
  sheetId: 'mr002',
  title: '顏色大類設定',
  breadcrumb: ['資材部門管理', '顏色大類設定'],
  apiUrl: 'http://localhost:8001/api/mr002/',
  sequenceField: 'serialno',
  autoRenumber: true,
  columns: [
    { key: 'serialno', label: '流水號', width: '100px', editable: false, type: 'number' },
    { 
      key: 'kind', 
      label: '顏色組成', 
      width: '150px', 
      editable: true, 
      type: 'select',
      options: [
        { value: '1', label: '顏色' },
        { value: '2', label: '配色' }
      ]
    },
    { key: 'code', label: '基本色代號', width: '150px', editable: true, type: 'string', maxLength: 8 },
    { key: 'cname', label: '基本色名稱', width: '250px', editable: true, type: 'string', maxLength: 20 }
  ]
});
