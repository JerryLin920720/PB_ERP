/**
 * lookupRegistry - ERP 字典開窗檢索設定註冊表
 * 
 * 每個檢索類型包含：
 * - title: Modal 標題
 * - moduleCode: 模組代號
 * - moduleName: 模組名稱
 * - apiUrl: 資料 API 路徑
 * - rowKey: Table 唯一的 row key
 * - searchFields: 前端過濾用的模糊搜尋欄位
 * - columns: 表格顯示的欄位配置
 * - displayField: 顯示在 Input 中的文字欄位
 * - returnValue: 回傳給外層表單的值所使用的欄位 (通常是 gkey)
 */
export const lookupRegistry = {
  // 客戶
  customer: {
    moduleCode: 'BA010',
    moduleName: '客戶基本資料',
    title: '關聯作業：BA010 客戶基本資料',
    apiUrl: '/api/ba010/',
    rowKey: 'gkey',
    searchFields: ['customerno', 'custno', 'shortname', 'fullname'],
    columns: [
      { title: '客戶代號', dataIndex: 'custno', key: 'custno', width: '120px' },
      { title: '客戶簡稱', dataIndex: 'shortname', key: 'shortname', width: '150px' },
      { title: '客戶全稱', dataIndex: 'fullname', key: 'fullname' }
    ],
    displayField: 'shortname',
    returnValue: 'gkey'
  },
  ba010: {
    moduleCode: 'BA010',
    moduleName: '客戶基本資料',
    title: '關聯作業：BA010 客戶基本資料',
    apiUrl: '/api/ba010/',
    rowKey: 'gkey',
    searchFields: ['customerno', 'custno', 'shortname', 'fullname'],
    columns: [
      { title: '客戶代號', dataIndex: 'custno', key: 'custno', width: '120px' },
      { title: '客戶簡稱', dataIndex: 'shortname', key: 'shortname', width: '150px' },
      { title: '客戶全稱', dataIndex: 'fullname', key: 'fullname' }
    ],
    displayField: 'shortname',
    returnValue: 'gkey'
  },

  // 廠商 / 工廠
  supplier: {
    moduleCode: 'BA015',
    moduleName: '工廠基本資料',
    title: '關聯作業：BA015 工廠基本資料',
    apiUrl: '/api/ba015/',
    rowKey: 'gkey',
    searchFields: ['factoryno', 'factno', 'shortname', 'fullname'],
    columns: [
      { title: '工廠代號', dataIndex: 'factno', key: 'factno', width: '120px' },
      { title: '工廠簡稱', dataIndex: 'shortname', key: 'shortname', width: '150px' },
      { title: '工廠全稱', dataIndex: 'fullname', key: 'fullname' }
    ],
    displayField: 'shortname',
    returnValue: 'gkey'
  },
  ba015: {
    moduleCode: 'BA015',
    moduleName: '工廠基本資料',
    title: '關聯作業：BA015 工廠基本資料',
    apiUrl: '/api/ba015/',
    rowKey: 'gkey',
    searchFields: ['factoryno', 'factno', 'shortname', 'fullname'],
    columns: [
      { title: '工廠代號', dataIndex: 'factno', key: 'factno', width: '120px' },
      { title: '工廠簡稱', dataIndex: 'shortname', key: 'shortname', width: '150px' },
      { title: '工廠全稱', dataIndex: 'fullname', key: 'fullname' }
    ],
    displayField: 'shortname',
    returnValue: 'gkey'
  },

  // 季節
  season: {
    moduleCode: 'BA055',
    moduleName: '季節設定',
    title: '關聯作業：BA055 季節設定',
    apiUrl: '/api/ba055/',
    rowKey: 'gkey',
    searchFields: ['groupcode'],
    columns: [
      { title: '代號名稱', dataIndex: 'groupcode', key: 'groupcode' }
    ],
    displayField: 'groupcode',
    returnValue: 'gkey'
  },
  ba055: {
    moduleCode: 'BA055',
    moduleName: '季節設定',
    title: '關聯作業：BA055 季節設定',
    apiUrl: '/api/ba055/',
    rowKey: 'gkey',
    searchFields: ['groupcode'],
    columns: [
      { title: '代號名稱', dataIndex: 'groupcode', key: 'groupcode' }
    ],
    displayField: 'groupcode',
    returnValue: 'gkey'
  },

  // 楦頭
  last: {
    moduleCode: 'DP010',
    moduleName: '楦頭基本資料',
    title: '關聯作業：DP010 楦頭基本資料',
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
  dp010: {
    moduleCode: 'DP010',
    moduleName: '楦頭基本資料',
    title: '關聯作業：DP010 楦頭基本資料',
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

  // 大底
  bottom: {
    moduleCode: 'DP015',
    moduleName: '大底基本資料',
    title: '關聯作業：DP015 大底基本資料',
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
  dp015: {
    moduleCode: 'DP015',
    moduleName: '大底基本資料',
    title: '關聯作業：DP015 大底基本資料',
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

  // 跟型
  heel: {
    moduleCode: 'DP020',
    moduleName: '鞋跟基本資料',
    title: '關聯作業：DP020 鞋跟基本資料',
    apiUrl: '/api/dp020/',
    rowKey: 'gkey',
    searchFields: ['heelno'],
    columns: [
      { title: '跟型編號', dataIndex: 'heelno', key: 'heelno', width: '150px' }
    ],
    displayField: 'heelno',
    returnValue: 'gkey'
  },
  dp020: {
    moduleCode: 'DP020',
    moduleName: '鞋跟基本資料',
    title: '關聯作業：DP020 鞋跟基本資料',
    apiUrl: '/api/dp020/',
    rowKey: 'gkey',
    searchFields: ['heelno'],
    columns: [
      { title: '跟型編號', dataIndex: 'heelno', key: 'heelno', width: '150px' }
    ],
    displayField: 'heelno',
    returnValue: 'gkey'
  },

  // 性別 / 碼類
  gender: {
    moduleCode: 'DP004',
    moduleName: '鞋種性別設定',
    title: '關聯作業：DP004 鞋種性別設定',
    apiUrl: '/api/dp004/',
    rowKey: 'gkey',
    searchFields: ['gender'],
    columns: [
      { title: '性別', dataIndex: 'gender', key: 'gender' }
    ],
    displayField: 'gender',
    returnValue: 'gkey'
  },
  dp004: {
    moduleCode: 'DP004',
    moduleName: '鞋種性別設定',
    title: '關聯作業：DP004 鞋種性別設定',
    apiUrl: '/api/dp004/',
    rowKey: 'gkey',
    searchFields: ['gender'],
    columns: [
      { title: '性別', dataIndex: 'gender', key: 'gender' }
    ],
    displayField: 'gender',
    returnValue: 'gkey'
  },

  // 歸屬公司
  company: {
    moduleCode: 'BA005',
    moduleName: '公司資料設定',
    title: '關聯作業：BA005 公司資料設定',
    apiUrl: '/api/ba005/',
    rowKey: 'gkey',
    searchFields: ['companycode', 'shortname'],
    columns: [
      { title: '公司代號', dataIndex: 'companycode', key: 'companycode', width: '120px' },
      { title: '公司簡稱', dataIndex: 'shortname', key: 'shortname', width: '150px' }
    ],
    displayField: 'shortname',
    returnValue: 'gkey'
  },
  ba005: {
    moduleCode: 'BA005',
    moduleName: '公司資料設定',
    title: '關聯作業：BA005 公司資料設定',
    apiUrl: '/api/ba005/',
    rowKey: 'gkey',
    searchFields: ['companycode', 'shortname'],
    columns: [
      { title: '公司代號', dataIndex: 'companycode', key: 'companycode', width: '120px' },
      { title: '公司簡稱', dataIndex: 'shortname', key: 'shortname', width: '150px' }
    ],
    displayField: 'shortname',
    returnValue: 'gkey'
  },

  // 幣別
  currency: {
    moduleCode: 'BA060',
    moduleName: '幣別匯率設定',
    title: '關聯作業：BA060 幣別匯率設定',
    apiUrl: '/api/ba060/',
    rowKey: 'gkey',
    searchFields: ['currencyno'],
    columns: [
      { title: '幣別代號', dataIndex: 'currencyno', key: 'currencyno', width: '150px' },
      { title: '參考匯率', dataIndex: 'exrate', key: 'exrate' }
    ],
    displayField: 'currencyno',
    returnValue: 'gkey'
  },
  ba060: {
    moduleCode: 'BA060',
    moduleName: '幣別匯率設定',
    title: '關聯作業：BA060 幣別匯率設定',
    apiUrl: '/api/ba060/',
    rowKey: 'gkey',
    searchFields: ['currencyno'],
    columns: [
      { title: '幣別代號', dataIndex: 'currencyno', key: 'currencyno', width: '150px' },
      { title: '參考匯率', dataIndex: 'exrate', key: 'exrate' }
    ],
    displayField: 'currencyno',
    returnValue: 'gkey'
  },
  es101: {
    moduleCode: 'ES101',
    moduleName: '員工基本資料',
    title: '關聯作業：ES101 員工基本資料',
    apiUrl: '/api/es101/',
    rowKey: 'gkey',
    searchFields: ['employeeno', 'chinesename', 'englishname'],
    columns: [
      { title: '工號', dataIndex: 'employeeno', key: 'employeeno', width: '120px' },
      { title: '中文姓名', dataIndex: 'chinesename', key: 'chinesename', width: '120px' },
      { title: '英文姓名', dataIndex: 'englishname', key: 'englishname' }
    ],
    displayField: 'englishname',
    returnValue: 'gkey'
  },
  ba076: {
    moduleCode: 'BA076',
    moduleName: '付款條件明細',
    title: '關聯作業：BA076 付款條件明細',
    apiUrl: '/api/ba076/',
    rowKey: 'gkey',
    searchFields: ['payment'],
    columns: [
      { title: '付款描述', dataIndex: 'payment', key: 'payment' },
      { title: '天數', dataIndex: 'days', key: 'days', width: '100px' }
    ],
    displayField: 'payment',
    returnValue: 'payment'
  },
  ba040: {
    moduleCode: 'BA040',
    moduleName: '銀行基本資料',
    title: '關聯作業：BA040 銀行基本資料',
    apiUrl: '/api/ba040/',
    rowKey: 'gkey',
    searchFields: ['bankno', 'shortname', 'cbankname'],
    columns: [
      { title: '銀行編號', dataIndex: 'bankno', key: 'bankno', width: '120px' },
      { title: '銀行簡稱', dataIndex: 'shortname', key: 'shortname', width: '150px' },
      { title: '詳細資訊', dataIndex: 'bankinginformation', key: 'bankinginformation' }
    ],
    displayField: 'bankinginformation',
    returnValue: 'bankinginformation'
  },
  ba065: {
    moduleCode: 'BA065',
    moduleName: '交易港口設定',
    title: '關聯作業：BA065 交易港口設定',
    apiUrl: '/api/ba065/',
    rowKey: 'gkey',
    searchFields: ['term'],
    columns: [
      { title: '序號', dataIndex: 'serialno', key: 'serialno', width: '100px' },
      { title: '交易港口', dataIndex: 'term', key: 'term' }
    ],
    displayField: 'term',
    returnValue: 'term'
  },
  dp001: {
    moduleCode: 'DP001',
    moduleName: '開發片語字庫',
    title: '關聯作業：DP001 開發片語字庫',
    apiUrl: '/api/dp001/',
    rowKey: 'gkey',
    searchFields: ['description'],
    columns: [
      { title: '流水號', dataIndex: 'serialno', key: 'serialno', width: '100px' },
      { title: '片語描述', dataIndex: 'description', key: 'description' }
    ],
    displayField: 'description',
    returnValue: 'description'
  },
  ba003: {
    moduleCode: 'BA003',
    moduleName: '產地基本資料',
    title: '關聯作業：BA003 產地基本資料',
    apiUrl: '/api/ba003/',
    rowKey: 'gkey',
    searchFields: ['corigin', 'eorigin'],
    columns: [
      { title: '中文名稱', dataIndex: 'corigin', key: 'corigin', width: '150px' },
      { title: '英文名稱', dataIndex: 'eorigin', key: 'eorigin' }
    ],
    displayField: 'corigin',
    returnValue: 'gkey'
  },
  ba085: {
    moduleCode: 'BA085',
    moduleName: 'SIZERUN尺碼設定',
    title: '關聯作業：BA085 SIZERUN 尺碼設定',
    apiUrl: '/api/ba085/',
    rowKey: 'gkey',
    searchFields: ['sizerange'],
    columns: [
      { title: '尺碼區間', dataIndex: 'sizerange', key: 'sizerange', width: '150px' },
      { title: '起始碼', dataIndex: 'startsize', key: 'startsize', width: '100px' },
      { title: '結束碼', dataIndex: 'endsize', key: 'endsize', width: '100px' }
    ],
    displayField: 'sizerange',
    returnValue: 'gkey'
  },
  mr035: {
    moduleCode: 'MR035',
    moduleName: '材料基本資料',
    title: '關聯作業：MR035 材料基本資料',
    apiUrl: '/api/mr035/',
    rowKey: 'gkey',
    searchFields: ['mstkno', 'material'],
    columns: [
      { title: '材料編號', dataIndex: 'mstkno', key: 'mstkno', width: '150px' },
      { title: '材料名稱', dataIndex: 'material', key: 'material' }
    ],
    displayField: 'material',
    returnValue: 'gkey'
  },
  dp003: {
    moduleCode: 'DP003',
    moduleName: '鞋種類別設定',
    title: '關聯作業：DP003 鞋種類別設定',
    apiUrl: '/api/dp003/',
    rowKey: 'gkey',
    searchFields: ['shoetype', 'eshoetype'],
    columns: [
      { title: '鞋種類別', dataIndex: 'shoetype', key: 'shoetype', width: '150px' },
      { title: '英文說明', dataIndex: 'eshoetype', key: 'eshoetype' }
    ],
    displayField: 'shoetype',
    returnValue: 'gkey'
  },
  dp023: {
    moduleCode: 'DP023',
    moduleName: '配色組別設定',
    title: '關聯作業：DP023 配色組別設定',
    apiUrl: '/api/dp023/',
    rowKey: 'gkey',
    searchFields: ['groupname'],
    columns: [
      { title: '組別名稱', dataIndex: 'groupname', key: 'groupname', width: '150px' },
      { title: '楦頭', dataIndex: 'lastno', key: 'lastno', width: '100px' },
      { title: '大底', dataIndex: 'bottomno', key: 'bottomno', width: '100px' },
      { title: '鞋跟', dataIndex: 'heelno', key: 'heelno', width: '100px' }
    ],
    displayField: 'groupname',
    returnValue: 'gkey'
  },
  ba070: {
    moduleCode: 'BA070',
    moduleName: '交易條件設定',
    title: '關聯作業：BA070 交易條件設定',
    apiUrl: '/api/ba070/',
    rowKey: 'gkey',
    searchFields: ['termtype'],
    columns: [
      { title: '貿易條件', dataIndex: 'termtype', key: 'termtype' }
    ],
    displayField: 'termtype',
    returnValue: 'gkey'
  },
  dp002: {
    moduleCode: 'DP002',
    moduleName: '樣品類別設定',
    title: '關聯作業：DP002 樣品類別設定',
    apiUrl: '/api/dp002/',
    rowKey: 'gkey',
    searchFields: ['sampletype', 'samplename'],
    columns: [
      { title: '樣品類別代號', dataIndex: 'sampletype', key: 'sampletype', width: '150px' },
      { title: '類別名稱', dataIndex: 'samplename', key: 'samplename' }
    ],
    displayField: 'samplename',
    returnValue: 'gkey'
  },
  ba009: {
    moduleCode: 'BA009',
    moduleName: '品牌資料設定',
    title: '關聯作業：BA009 品牌資料設定',
    apiUrl: '/api/ba009/',
    rowKey: 'gkey',
    searchFields: ['cbrand', 'ebrand'],
    columns: [
      { title: '品牌中文名', dataIndex: 'cbrand', key: 'cbrand', width: '150px' },
      { title: '品牌英文名', dataIndex: 'ebrand', key: 'ebrand' }
    ],
    displayField: 'cbrand',
    returnValue: 'gkey'
  },
  dp008: {
    moduleCode: 'DP008',
    moduleName: '鞋墊標籤設定',
    title: '關聯作業：DP008 鞋墊標籤設定',
    apiUrl: '/api/dp008/',
    rowKey: 'gkey',
    searchFields: ['socklabel'],
    columns: [
      { title: '鞋墊標籤', dataIndex: 'socklabel', key: 'socklabel' }
    ],
    displayField: 'socklabel',
    returnValue: 'gkey'
  },
  dp006: {
    moduleCode: 'DP006',
    moduleName: '部位基本資料',
    title: '關聯作業：DP006 部位基本資料',
    apiUrl: '/api/dp006/',
    rowKey: 'gkey',
    searchFields: ['parts', 'eparts'],
    columns: [
      { title: '部位代碼', dataIndex: 'partscode', key: 'partscode', width: '120px' },
      { title: '部位中文名', dataIndex: 'parts', key: 'parts', width: '150px' },
      { title: '部位英文名', dataIndex: 'eparts', key: 'eparts' }
    ],
    displayField: 'parts',
    returnValue: 'gkey'
  },
  mr010: {
    moduleCode: 'MR010',
    moduleName: '材料顏色設定',
    title: '關聯作業：MR010 材料顏色設定',
    apiUrl: '/api/mr010/',
    rowKey: 'gkey',
    searchFields: ['colorcode', 'clrnm', 'clrenm'],
    columns: [
      { title: '顏色代號', dataIndex: 'colorcode', key: 'colorcode', width: '120px' },
      { title: '顏色中文名', dataIndex: 'clrnm', key: 'clrnm', width: '150px' },
      { title: '顏色英文名', dataIndex: 'clrenm', key: 'clrenm' }
    ],
    displayField: 'clrnm',
    returnValue: 'gkey'
  },
  ba075: {
    moduleCode: 'BA075',
    moduleName: '付款條件',
    title: '關聯作業：BA075 付款條件設定',
    apiUrl: '/api/ba075/',
    rowKey: 'gkey',
    searchFields: ['paymenttype'],
    columns: [
      { title: '序號', dataIndex: 'serialno', key: 'serialno', width: '120px' },
      { title: '付款條件代碼', dataIndex: 'paymenttype', key: 'paymenttype' }
    ],
    displayField: 'paymenttype',
    returnValue: 'gkey'
  }
};

