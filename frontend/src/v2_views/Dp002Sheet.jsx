import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

/**
 * DP002Sheet - 樣品類別設定 (Sample Type Setup)
 */
export default createDataWindowSheet({
  sheetId: 'dp002',
  title: 'DP002 樣品類別設定 (Sample Type Setup)',
  breadcrumb: ['開發管理', '樣品類別設定'],
  apiUrl: 'http://localhost:8001/api/dp002/',
  sequenceField: 'serialno',
  autoRenumber: true,
  columns: [
    { key: 'serialno', label: '序號', width: '80px', editable: false, type: 'number' },
    { key: 'sampletype', label: '代號', width: '120px', editable: true, type: 'string', maxLength: 20 },
    { key: 'samplename', label: '中文名稱', width: '220px', editable: true, type: 'string', maxLength: 50 },
    { key: 'sampleename', label: '英文名稱', width: '220px', editable: true, type: 'string', maxLength: 50 }
  ]
});
