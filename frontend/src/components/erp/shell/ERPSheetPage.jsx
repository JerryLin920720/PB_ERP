import React from 'react';
import './ERPSheetPage.css';

/**
 * ERPSheetPage - 全系統作業畫面的統一外殼包裝組件
 */
export default function ERPSheetPage({
  sheetId,
  title,
  breadcrumb,
  mode,
  children,
  className = ''
}) {
  // 依據當前 mode 決定狀態標籤的顯示文字
  const getModeLabel = () => {
    switch (mode) {
      case 'create':
        return '新增中';
      case 'edit':
        return '編輯中';
      case 'view':
        return '唯讀';
      default:
        return null;
    }
  };

  // 組合模式的 CSS class
  const modeClass = mode ? `erp-sheet-mode-${mode}` : '';

  return (
    <div className={`erp-sheet-page ${modeClass} ${className}`}>
      {/* 頁頭區域 */}
      <div className="erp-sheet-header">
        {/* 麵包屑導航 */}
        {breadcrumb && (
          <div className="erp-sheet-breadcrumb">
            {Array.isArray(breadcrumb) ? breadcrumb.join(' / ') : breadcrumb}
          </div>
        )}

        {/* 標題與元數據包裝區 */}
        <div className="erp-sheet-title-area">
          <div className="erp-sheet-meta">
            {sheetId && <span className="erp-sheet-id">[{sheetId.toUpperCase()}]</span>}
            {title && <span className="erp-sheet-title">{title}</span>}
          </div>
          {mode && (
            <span className={`erp-sheet-mode-tag erp-sheet-mode-${mode}`}>
              {getModeLabel()}
            </span>
          )}
        </div>
      </div>

      {/* 內容主體區 */}
      <div className="erp-sheet-body">
        {children}
      </div>
    </div>
  );
}


