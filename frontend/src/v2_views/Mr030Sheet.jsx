import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

export default createDataWindowSheet({
  sheetId: 'mr030',
  title: '材料紋路設定',
  breadcrumb: ['資材部門管理', '材料紋路設定'],
  apiUrl: 'http://localhost:8001/api/mr030/',
  sequenceField: 'serialno',
  autoRenumber: true,
  columns: [
    { key: 'serialno', label: '流水號', width: '80px', editable: false, type: 'number' },
    { key: 'veinno', label: '紋路代號', width: '120px', editable: true, type: 'string', maxLength: 20 },
    { key: 'cname', label: '中文名稱', width: '200px', editable: true, type: 'string', maxLength: 60 },
    { key: 'ename', label: '英文名稱', width: '200px', editable: true, type: 'string', maxLength: 60 },
    { key: 'veinphoto', label: '紋路圖片', width: '250px', editable: true, type: 'image' }
  ]
});
