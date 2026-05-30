import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

/**
 * BA020Sheet - 材料供應商類別設定
 * 
 * 符合 V2 架構規範的 SingleTableSheet.
 * 1. 透過 createDataWindowSheet 工廠函數宣告建立，完全無私有 CRUD 與事件監聽.
 */
export default createDataWindowSheet({
  sheetId: 'ba020',
  title: '材料供應商類別設定',
  breadcrumb: ['基本資料管理', '材料供應商類別設定'],
  apiUrl: 'http://localhost:8001/api/ba020/',
  // 該單元不包含流水號序列排序，保留預設配置
  columns: [
    // 💡 註解：BA020 的 maxLength 必須以後端 API Contract / model / serializer 的真實 max_length 為準，不能在前端永久寫死舊限制。
    // 當前 api/models.py 定義：type max_length=1, code max_length=2, category max_length=50。
    { key: 'type', label: '類型 (2/3)', width: '100px', editable: true, type: 'string', maxLength: 1 },
    { key: 'code', label: '代碼', width: '100px', editable: true, type: 'string', maxLength: 2 },
    { key: 'category', label: '分類名稱', width: '260px', editable: true, type: 'string', maxLength: 50 }
  ]
});
