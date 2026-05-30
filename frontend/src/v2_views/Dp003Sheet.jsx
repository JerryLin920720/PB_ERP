import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

/**
 * DP003Sheet - 鞋種類別設定 (Shoe Type Setup)
 */
export default createDataWindowSheet({
  sheetId: 'dp003',
  title: 'DP003 鞋種類別設定 (Shoe Type Setup)',
  breadcrumb: ['開發管理', '鞋種類別設定'],
  apiUrl: 'http://localhost:8001/api/dp003/',
  sequenceField: 'serialno',
  autoRenumber: true,
  columns: [
    { key: 'serialno', label: '序號', width: '80px', editable: false, type: 'number' },
    { key: 'shoetype', label: '鞋種類別 (中文)', width: '240px', editable: true, type: 'string', maxLength: 20 },
    { key: 'eshoetype', label: '鞋種類別 (英文)', width: '240px', editable: true, type: 'string', maxLength: 50 }
  ]
});
