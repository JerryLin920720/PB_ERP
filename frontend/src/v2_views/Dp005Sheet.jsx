import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

/**
 * DP005Sheet - 部位類別設定
 * 
 * 符合 V2 架構規範的 SingleTableSheet.
 * 1. 透過 createDataWindowSheet 工廠函數宣告建立.
 * 2. 驗證 SingleTableSheet 對 select 下拉選單欄位 (parttype) 的支援與正確性.
 */
export default createDataWindowSheet({
  sheetId: 'dp005',
  title: '部位類別設定',
  breadcrumb: ['開發管理', '部位類別設定'],
  apiUrl: 'http://localhost:8001/api/dp005/',
  sequenceField: 'serialno',
  autoRenumber: true,
  columns: [
    { key: 'serialno', label: '序號', width: '80px', editable: false, type: 'number' },
    { key: 'partgroup', label: '類別名稱 (中文)', width: '220px', editable: true, type: 'string' },
    { key: 'epartgroup', label: '類別名稱 (英文)', width: '220px', editable: true, type: 'string' },
    {
      key: 'parttype',
      label: '部位別',
      width: '180px',
      editable: true,
      type: 'select',
      required: true,
      options: [
        { value: 'UPPER', label: 'UPPER' },
        { value: 'LINING', label: 'LINING' },
        { value: 'SOCK', label: 'SOCK' },
        { value: 'OUTSOLE', label: 'OUTSOLE' },
        { value: 'HEEL', label: 'HEEL' },
        { value: 'TONGUE', label: 'TONGUE' },
        { value: 'ORNAMENT', label: 'ORNAMENT' },
        { value: 'OTHER', label: 'OTHER' }
      ]
    }
  ]
});
