/**
 * lookupRegistry - ERP 字典開窗檢索設定註冊表
 * 
 * 每個檢索類型包含：
 * - title: Modal 標題
 * - apiUrl: 資料 API 路徑
 * - rowKey: Table 唯一的 row key
 * - searchFields: 前端過濾用的模糊搜尋欄位
 * - columns: 表格顯示的欄位配置
 * - displayField: 顯示在 Input 中的文字欄位
 * - returnValue: 回傳給外層表單的值所使用的欄位 (通常是 gkey)
 */
export const lookupRegistry = {
  customer: {
    title: '客戶檢索開窗',
    apiUrl: '/api/ba010/',
    rowKey: 'gkey',
    searchFields: ['customerno', 'custno', 'shortname', 'fullname'],
    columns: [
      { title: '客戶代號', dataIndex: 'customerno', key: 'customerno', width: '120px' },
      { title: '客戶簡稱', dataIndex: 'shortname', key: 'shortname', width: '150px' },
      { title: '客戶全稱', dataIndex: 'fullname', key: 'fullname' }
    ],
    displayField: 'shortname',
    returnValue: 'gkey'
  },
  supplier: {
    title: '供應商工廠檢索開窗',
    apiUrl: '/api/ba015/',
    rowKey: 'gkey',
    searchFields: ['factoryno', 'factno', 'shortname', 'fullname'],
    columns: [
      { title: '工廠代號', dataIndex: 'factoryno', key: 'factoryno', width: '120px' },
      { title: '工廠簡稱', dataIndex: 'shortname', key: 'shortname', width: '150px' },
      { title: '工廠全稱', dataIndex: 'fullname', key: 'fullname' }
    ],
    displayField: 'shortname',
    returnValue: 'gkey'
  },
  season: {
    title: '學歷季節檢索開窗',
    apiUrl: '/api/ba055/',
    rowKey: 'gkey',
    searchFields: ['groupcode'],
    columns: [
      { title: '代號名稱', dataIndex: 'groupcode', key: 'groupcode' }
    ],
    displayField: 'groupcode',
    returnValue: 'gkey'
  },
  last: {
    title: '楦頭檢索開窗',
    apiUrl: '/api/dp010/',
    rowKey: 'gkey',
    searchFields: ['lastno', 'year', 'remark'],
    columns: [
      { title: '楦頭編號', dataIndex: 'lastno', key: 'lastno', width: '150px' },
      { title: '年份', dataIndex: 'year', key: 'year', width: '100px' },
      { title: '備註說明', dataIndex: 'remark', key: 'remark' }
    ],
    displayField: 'lastno',
    returnValue: 'gkey'
  },
  bottom: {
    title: '大底模具檢索開窗',
    apiUrl: '/api/dp015/',
    rowKey: 'gkey',
    searchFields: ['bottomno', 'bottomname'],
    columns: [
      { title: '大底編號', dataIndex: 'bottomno', key: 'bottomno', width: '150px' },
      { title: '大底名稱', dataIndex: 'bottomname', key: 'bottomname' }
    ],
    displayField: 'bottomno',
    returnValue: 'gkey'
  },
  gender: {
    title: '性別代碼檢索開窗',
    apiUrl: '/api/dp004/',
    rowKey: 'gkey',
    searchFields: ['gender'],
    columns: [
      { title: '性別', dataIndex: 'gender', key: 'gender' }
    ],
    displayField: 'gender',
    returnValue: 'gkey'
  },
  currency: {
    title: '幣別匯率檢索開窗',
    apiUrl: '/api/ba060/',
    rowKey: 'gkey',
    searchFields: ['currencyno'],
    columns: [
      { title: '幣別代號', dataIndex: 'currencyno', key: 'currencyno', width: '150px' },
      { title: '參考匯率', dataIndex: 'exrate', key: 'exrate' }
    ],
    displayField: 'currencyno',
    returnValue: 'gkey'
  }
};
