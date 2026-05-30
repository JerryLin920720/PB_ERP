import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

/**
 * DP008Sheet - Sock Label 設定 (Sock Label Setup)
 */
export default createDataWindowSheet({
  sheetId: 'dp008',
  title: 'DP008 Sock Label 設定',
  breadcrumb: ['開發管理', 'Sock Label 設定'],
  apiUrl: 'http://localhost:8001/api/dp008/',
  sequenceField: 'serialno',
  autoRenumber: true,
  columns: [
    { key: 'serialno', label: '序號', width: '100px', editable: false, type: 'number' },
    { key: 'socklabel', label: 'Sock Label 描述', width: '480px', editable: true, type: 'string', maxLength: 100 }
  ]
});
