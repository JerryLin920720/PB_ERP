import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

/**
 * DP001Sheet - 開發片語字庫 (Development Phrase Library)
 */
export default createDataWindowSheet({
  sheetId: 'dp001',
  title: 'DP001 開發片語字庫 (Development Phrase Library)',
  breadcrumb: ['開發管理', '開發片語字庫'],
  apiUrl: 'http://localhost:8001/api/dp001/',
  sequenceField: 'serialno',
  autoRenumber: true,
  columns: [
    { key: 'serialno', label: '流水號', width: '100px', editable: false, type: 'number' },
    { key: 'description', label: '片語描述', width: '520px', editable: true, type: 'string' }
  ]
});
