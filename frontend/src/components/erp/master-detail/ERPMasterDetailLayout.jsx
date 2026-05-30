import React from 'react';

/**
 * ERPMasterDetailLayout
 * 通用主從版面配置組件 (上下垂直堆疊型，Master 固定高度，Detail 自動延展填滿剩餘高度)
 */
export default function ERPMasterDetailLayout({
  masterTitle,
  detailTitle,
  masterContent,
  detailContent,
  statusContent,
  masterHeight = '240px',
  masterActions,
  detailActions
}) {
  return (
    <div className="erp-md-page">
      {/* 上方 Master 區區塊 */}
      <div 
        className="erp-md-section erp-md-master-section" 
        style={{ height: masterHeight }}
      >
        <div className="erp-md-section-header">
          <span className="erp-md-section-title">{masterTitle}</span>
          {masterActions && (
            <div className="erp-md-section-actions">
              {masterActions}
            </div>
          )}
        </div>
        <div className="erp-md-section-body">
          {masterContent}
        </div>
      </div>

      {/* 下方 Detail 區區塊 */}
      <div className="erp-md-section erp-md-detail-section">
        <div className="erp-md-section-header">
          <span className="erp-md-section-title">{detailTitle}</span>
          {detailActions && (
            <div className="erp-md-section-actions">
              {detailActions}
            </div>
          )}
        </div>
        <div className="erp-md-section-body">
          {detailContent}
        </div>
      </div>

      {/* 底部狀態列 */}
      {statusContent && (
        <div className="erp-md-statusbar">
          {statusContent}
        </div>
      )}
    </div>
  );
}
