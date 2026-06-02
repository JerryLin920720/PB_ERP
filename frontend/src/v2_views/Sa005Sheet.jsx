import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

/**
 * Sa005Sheet - Assortment 設定
 *
 * V2 架構規範：
 * 1. 透過 createDataWindowSheet 工廠函數宣告建立，完全無私有 CRUD state。
 * 2. 欄位渲染與 CRUD 控制委託給 Layer 2 (Win32DataWindow)。
 *
 * PB 原始邏輯對照 (d_sa005)：
 *   - Retrieve：sa005 全表，關聯 ba010 客戶
 *   - Insert：新增空白行，預設初值
 *   - 主要欄位：sa005_code (配比代碼)、ba010gkey (客戶)
 *   - SizeRun 設定：sa005_startsize, sa005_endsize, sa005_fullhalf, sa005_maxsize
 *   - 各尺碼雙數：pairs1~pairs22 (由使用者輸入)
 *   - sa005_ctnpairs：後端 save 時自動重算 = sum(pairs1~22)
 *   - size1~size22：前端或後端展開後的尺碼標籤 (本期顯示為 DB 欄位直接呈現)
 *
 * 注意：
 *   - SizeRun 動態展開邏輯 (wf_getsizerun) 屬於 Pattern A 擴充需求，
 *     本期僅實作基本 CRUD，尺碼展開由使用者手動輸入。
 *   - 後端 save() 自動重算 sa005_ctnpairs。
 *   - sa005 無 es101gkey，不需要個人隔離。
 *
 * 欄位排列順序依照 PB d_sa005 DataWindow 顯示順序。
 */
export default createDataWindowSheet({
  sheetId: 'sa005',
  title: 'Assortment 設定',
  breadcrumb: ['業務部門管理', 'Assortment 設定'],
  apiUrl: 'http://localhost:8001/api/sa005/',
  sequenceField: null,   // sa005 沒有獨立 serialno 主流水號欄位
  autoRenumber: false,
  columns: [
    // 基本識別欄位
    {
      key: 'sa005_code',
      label: '配比代碼',
      width: '120px',
      editable: true,
      type: 'string',
      maxLength: 20
    },
    {
      key: 'ba010gkey',
      label: '客戶代號(gkey)',
      width: '180px',
      editable: true,
      type: 'string',
      maxLength: 20
    },
    // SizeRun 設定欄位
    {
      key: 'sa005_startsize',
      label: '起始尺碼',
      width: '90px',
      editable: true,
      type: 'number'
    },
    {
      key: 'sa005_endsize',
      label: '終止尺碼',
      width: '90px',
      editable: true,
      type: 'number'
    },
    {
      key: 'sa005_fullhalf',
      label: '跳號方式',
      width: '110px',
      editable: true,
      type: 'select',
      options: [
        { value: '1', label: '1-全號' },
        { value: '2', label: '2-半號' },
        { value: '3', label: '3-連號雙碼' }
      ]
    },
    {
      key: 'sa005_maxsize',
      label: '最大尺碼',
      width: '90px',
      editable: true,
      type: 'number'
    },
    {
      key: 'sa005_ctnpairs',
      label: '箱裝總雙數',
      width: '100px',
      editable: false,
      type: 'number'
    },
    // 尺碼標籤 size1~size22 (顯示尺碼名稱，唯讀展示)
    { key: 'size1',  label: 'S1',  width: '60px', editable: true, type: 'number' },
    { key: 'size2',  label: 'S2',  width: '60px', editable: true, type: 'number' },
    { key: 'size3',  label: 'S3',  width: '60px', editable: true, type: 'number' },
    { key: 'size4',  label: 'S4',  width: '60px', editable: true, type: 'number' },
    { key: 'size5',  label: 'S5',  width: '60px', editable: true, type: 'number' },
    { key: 'size6',  label: 'S6',  width: '60px', editable: true, type: 'number' },
    { key: 'size7',  label: 'S7',  width: '60px', editable: true, type: 'number' },
    { key: 'size8',  label: 'S8',  width: '60px', editable: true, type: 'number' },
    { key: 'size9',  label: 'S9',  width: '60px', editable: true, type: 'number' },
    { key: 'size10', label: 'S10', width: '60px', editable: true, type: 'number' },
    { key: 'size11', label: 'S11', width: '60px', editable: true, type: 'number' },
    { key: 'size12', label: 'S12', width: '60px', editable: true, type: 'number' },
    // 各尺碼雙數 pairs1~pairs22
    { key: 'pairs1',  label: 'P1',  width: '55px', editable: true, type: 'number' },
    { key: 'pairs2',  label: 'P2',  width: '55px', editable: true, type: 'number' },
    { key: 'pairs3',  label: 'P3',  width: '55px', editable: true, type: 'number' },
    { key: 'pairs4',  label: 'P4',  width: '55px', editable: true, type: 'number' },
    { key: 'pairs5',  label: 'P5',  width: '55px', editable: true, type: 'number' },
    { key: 'pairs6',  label: 'P6',  width: '55px', editable: true, type: 'number' },
    { key: 'pairs7',  label: 'P7',  width: '55px', editable: true, type: 'number' },
    { key: 'pairs8',  label: 'P8',  width: '55px', editable: true, type: 'number' },
    { key: 'pairs9',  label: 'P9',  width: '55px', editable: true, type: 'number' },
    { key: 'pairs10', label: 'P10', width: '55px', editable: true, type: 'number' },
    { key: 'pairs11', label: 'P11', width: '55px', editable: true, type: 'number' },
    { key: 'pairs12', label: 'P12', width: '55px', editable: true, type: 'number' }
  ]
});
