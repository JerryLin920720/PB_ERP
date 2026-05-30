import React from 'react';
import ERPSheetPage from '../shell/ERPSheetPage';
import Win32DataWindow from '../../Win32DataWindow';

/**
 * createDataWindowSheet - 工廠函數，用於建立標準的 SingleTableSheet (原 Pattern A / A2)
 * 
 * 該工廠函數封裝了 Layer 1 (Page Shell) 與 Layer 2 (CRUD Controller)，
 * 統一了單表維護作業的介面結構與事件對接，且禁止在 Sheet 頁面層級進行任何客製的 API 呼叫或 toolbar 渲染。
 * 
 * @param {Object} config
 * @param {string} config.sheetId - 系統作業代號，例如 'ba001'
 * @param {string} config.title - 作業名稱，例如 '個人片語字庫設定'
 * @param {Array<string>} [config.breadcrumb] - 麵包屑導航路徑，例如 ['基礎資料', '個人片語字庫']
 * @param {string} config.apiUrl - 資料庫 API Endpoint 連接網址
 * @param {Array} config.columns - DataWindow 網格顯示與編輯欄位配置表
 * @param {string} [config.sequenceField='serialno'] - 用於排序或累加的序列欄位名稱
 * @param {boolean} [config.autoRenumber=true] - 刪除列後是否自動重新編排序列欄位號碼
 * 
 * @returns {React.ComponentType} 回傳封裝完成的 SingleTableSheet React 組件
 */
export default function createDataWindowSheet({
  sheetId,
  title,
  breadcrumb,
  apiUrl,
  columns: configColumns,
  sequenceField = 'serialno',
  autoRenumber = true
}) {
  return function DataWindowSheet(props) {
    return (
      <ERPSheetPage
        sheetId={sheetId}
        title={title}
        breadcrumb={breadcrumb}
      >
        <Win32DataWindow
          sheetId={sheetId}
          apiUrl={apiUrl}
          title={title}
          columns={props?.columns || configColumns}
          sequenceField={sequenceField}
          autoRenumber={autoRenumber}
          {...props}
        />
      </ERPSheetPage>
    );
  };
}
