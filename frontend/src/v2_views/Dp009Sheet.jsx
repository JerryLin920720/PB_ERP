import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

/**
 * DP009Sheet - 部件加工設定 (Processing Method Setup)
 */
export default createDataWindowSheet({
  sheetId: 'dp009',
  title: 'DP009 部件加工設定',
  breadcrumb: ['開發管理', '部件加工設定'],
  apiUrl: 'http://localhost:8001/api/dp009/',
  sequenceField: 'serialno',
  autoRenumber: true,
  columns: [
    { key: 'serialno', label: '序號', width: '80px', editable: false, type: 'number' },
    { key: 'cmakedescription', label: '加工描述 (中)', width: '320px', editable: true, type: 'string', maxLength: 200 },
    { key: 'emakedescription', label: 'Processing Method (EN)', width: '320px', editable: true, type: 'string', maxLength: 100 }
  ]
});
