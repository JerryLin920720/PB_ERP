import React from 'react';
import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

/**
 * BA001Sheet - 個人片語字庫設定
 * 
 * 符合 V2 架構規範的第一支 SingleTableSheet 試點頁面。
 * 1. 透過 createDataWindowSheet 工廠函數宣告建立，完全無私有 state。
 * 2. 禁止手寫 toolbar 或直接監聽 mdi-global-command。
 * 3. 欄位渲染與 CRUD 控制委託給 Layer 2 (Win32DataWindow)。
 */
const BaseBa001Sheet = createDataWindowSheet({
  sheetId: 'ba001',
  title: '個人片語字庫設定',
  breadcrumb: ['基本資料管理', '個人片語'],
  apiUrl: 'http://localhost:8001/api/ba001/',
  sequenceField: 'serialno',
  sequenceScopeField: 'f2type',
  autoRenumber: true,
  columns: [
    { key: 'serialno', label: '流水號', width: '100px', editable: false, type: 'number' },
    { key: 'description', label: '片語說明', width: '420px', editable: true, type: 'string' },
    { key: 'f2type', label: '類別代號', width: '120px', editable: false, type: 'string', initialValue: 'BA' }
  ]
});

export default function Ba001Sheet(props) {
  return <BaseBa001Sheet {...props} enableSheetState={true} />;
}
