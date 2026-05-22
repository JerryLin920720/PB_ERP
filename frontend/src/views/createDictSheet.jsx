import React from 'react';
import Win32DataWindow from '../components/Win32DataWindow';
import ERPSheetPage from '../components/erp/shell/ERPSheetPage';

/**
 * 通用字典作業視窗產生器 (Generic Dictionary Sheet Factory)
 * 
 * 所有單一 Grid 行內編輯的靜態字典都共用此結構，
 * 僅需傳入 config 即可 100% 動態渲染出完整的作業畫面。
 */
export default function createDictSheet(config) {
  const { sheetId, title, icon, breadcrumb, columns, apiUrl, sheetName } = config;
  
  // 1. sheetId 來源優先順序：config.sheetId -> config.apiUrl -> 從 apiUrl 推導
  const resolvedSheetId = sheetId || apiUrl?.split('/').filter(Boolean).pop() || '';
  
  // 2. title 來源優先順序：config.title -> config.sheetName -> sheetId
  const resolvedTitle = title || sheetName || resolvedSheetId;
  
  // 3. breadcrumb 來源優先順序：config.breadcrumb -> 預設 "基本資料管理 > " + title
  const resolvedBreadcrumb = breadcrumb || `基本資料管理 > ${resolvedTitle}`;

  return function DictSheet() {
    return (
      <ERPSheetPage
        sheetId={resolvedSheetId}
        title={resolvedTitle}
        breadcrumb={resolvedBreadcrumb}
      >
        <Win32DataWindow 
          columns={columns}
          apiUrl={apiUrl}
          title={`${resolvedSheetId}--${resolvedTitle}`}
          sheetId={resolvedSheetId}
        />
      </ERPSheetPage>
    );
  };
}

