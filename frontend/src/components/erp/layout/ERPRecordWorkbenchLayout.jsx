import React from 'react';
import { Tabs } from 'antd';
import '../../../styles/erp-record-workbench.css';

const { TabPane } = Tabs;

/**
 * ERPRecordWorkbenchLayout
 * Standard layout component for RecordWorkbenchSheet.
 * Replicates the dual-tabbed, sidebar list + form layout of legacy high-density screens.
 */
export default function ERPRecordWorkbenchLayout({
  mode = 'list',
  onModeChange,
  queryPanel,
  listGrid,
  sidebar,
  masterForm,
  detailTabs,
  statusContent,
  renderMainWrapper,
  mainClassName,
  layout = {},
}) {
  const enableContentScroll = layout.contentScroll === true;
  const contentHeight = layout.contentHeight || 'calc(100vh - 230px)';

  const mainContent = (
    <>
      {masterForm && <div className="erp-rw-master-form">{masterForm}</div>}
      {detailTabs && <div className="erp-rw-detail-tabs">{detailTabs}</div>}
    </>
  );

  return (
    <div className="erp-rw-page">
      <Tabs
        activeKey={mode}
        onChange={onModeChange}
        size="small"
        className="erp-rw-tabs"
      >
        <TabPane tab="查詢列表" key="list">
          <div className="erp-rw-list-mode">
            {queryPanel && <div className="erp-rw-query-panel">{queryPanel}</div>}
            {listGrid && <div className="erp-rw-list-grid">{listGrid}</div>}
          </div>
        </TabPane>

        <TabPane tab="編輯維護" key="edit">
          <div className="erp-rw-edit-mode">
            <div className="erp-rw-editor">
              {sidebar && <div className="erp-rw-sidebar">{sidebar}</div>}

              <div
                className={[
                  'erp-rw-main',
                  mainClassName || '',
                  enableContentScroll ? 'erp-rw-main-scroll' : '',
                ].filter(Boolean).join(' ')}
                style={
                  enableContentScroll
                    ? {
                        height: contentHeight,
                        maxHeight: contentHeight,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        paddingRight: 8,
                        boxSizing: 'border-box',
                        minHeight: 0,
                      }
                    : undefined
                }
              >
                {renderMainWrapper
                  ? renderMainWrapper(mainContent)
                  : mainContent}
              </div>
            </div>

            {statusContent && (
              <div className="erp-rw-statusbar">{statusContent}</div>
            )}
          </div>
        </TabPane>
      </Tabs>
    </div>
  );
}