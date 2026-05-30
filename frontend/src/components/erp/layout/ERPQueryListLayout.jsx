import React from 'react';
import { Tabs } from 'antd';

const { TabPane } = Tabs;

/**
 * ERPQueryListLayout
 *
 * Query-only shell extracted from Pattern B's query page.
 *
 * Important:
 * - It uses the same visual idea as ERPRecordWorkbenchLayout's list mode.
 * - It only renders 查詢列表.
 * - It never renders 編輯維護.
 */
export default function ERPQueryListLayout({
  queryPanel,
  resultContent,
  mainClassName,
  layout = {},
}) {
  const enableContentScroll = layout.contentScroll === true;
  const contentHeight = layout.contentHeight || 'calc(100vh - 190px)';

  const contentStyle = enableContentScroll
    ? {
        height: contentHeight,
        maxHeight: contentHeight,
        minHeight: 0,
        overflow: 'hidden',
        boxSizing: 'border-box',
      }
    : undefined;

  return (
    <div
      className={['erp-qrs-layout', mainClassName].filter(Boolean).join(' ')}
      style={contentStyle}
    >
      <Tabs size="small" activeKey="list" className="erp-qrs-tabs">
        <TabPane tab="查詢列表" key="list">
          <div className="erp-qrs-list-page">
            <div className="erp-qrs-query-panel">
              {queryPanel}
            </div>
            <div className="erp-qrs-result-panel">
              {resultContent}
            </div>
          </div>
        </TabPane>
      </Tabs>
    </div>
  );
}
