import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

/**
 * BA091Sheet - 運輸方式設定
 * 
 * 符合 V2 架構規範的 SingleTableSheet.
 * 1. 透過 createDataWindowSheet 工廠函數宣告建立，完全無私有 CRUD 與事件監聽.
 */
export default createDataWindowSheet({
  sheetId: 'ba091',
  title: '運輸方式設定',
  breadcrumb: ['基本資料管理', '運輸方式設定'],
  apiUrl: 'http://localhost:8001/api/ba091/',
  sequenceField: 'serialno',
  autoRenumber: true,
  columns: [
    { key: 'serialno', label: '流水號', width: '80px', editable: false, type: 'number' },
    // 💡 註解：maxLength 必須與後端 API Contract / model 一致
    { key: 'shipvia', label: '運輸簡稱', width: '200px', editable: true, type: 'string', maxLength: 10 },
    { 
      key: 'type', 
      label: '運輸類型', 
      width: '150px', 
      editable: true, 
      type: 'select',
      maxLength: 1,
      options: [
        { value: '1', label: '海運' },
        { value: '2', label: '空運' },
        { value: '3', label: '快遞' },
        { value: '4', label: '其他' }
      ]
    }
  ]
});
