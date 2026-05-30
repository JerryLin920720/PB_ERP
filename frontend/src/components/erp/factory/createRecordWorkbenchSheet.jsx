import React from 'react';
import { Table, Form, Spin, Button, Space, Tabs } from 'antd';
import ERPSheetPage from '../shell/ERPSheetPage';
import ERPRecordWorkbenchLayout from '../layout/ERPRecordWorkbenchLayout';
import useRecordWorkbenchCrud from '../../../hooks/useRecordWorkbenchCrud';

const { TabPane } = Tabs;

/**
 * createRecordWorkbenchSheet
 * Factory function to create a standard RecordWorkbenchSheet.
 *
 * Config keys:
 *   sheetId, title, breadcrumb, api, masterKey, fieldLabels,
 *   createDefaultRecord, buildDeepSavePayload, validateMasterRow,
 *   validateAll, afterSave, detailTabs,
 *   renderQueryForm, renderMasterForm,
 *   layout: {
 *     contentScroll?: boolean,
 *     contentHeight?: string | number,
 *   },
 *   sidebar: { title, getDisplayText }
 */
export default function createRecordWorkbenchSheet(config) {
  const {
    sheetId,
    title,
    breadcrumb,
    api = {},
    masterKey = 'gkey',
    fieldLabels = {},
    createDefaultRecord,
    buildDeepSavePayload,
    validateMasterRow,
    validateAll,
    afterSave,
    detailTabs = [],
    layout = {},
    // Renderers passed from page
    renderQueryForm,
    renderMasterForm,
    // Sidebar config — title and display text function
    sidebar: sidebarConfig = {},
  } = config;

  const sidebarTitle = sidebarConfig.title || '資料列表';
  const sidebarGetDisplayText = sidebarConfig.getDisplayText || ((item) => item[masterKey]);

  // Optional Pattern B content scroll.
  // Default is off, so existing Pattern B pages will not be affected.
  const enableContentScroll = layout.contentScroll === true;
  const contentHeight = layout.contentHeight || 'calc(100vh - 190px)';

  return function RecordWorkbenchSheet() {
    const [searchForm] = Form.useForm();
    const [masterForm] = Form.useForm();

    const crud = useRecordWorkbenchCrud({
      sheetId,
      api,
      masterKey,
      fieldLabels,
      createDefaultMasterRow: createDefaultRecord,
      detailTabsConfig: detailTabs.map((tab) => ({
        key: tab.key,
        title: tab.title,
        readOnly: tab.readOnly,
        parentKey: tab.parentKey,
        apiUrl: tab.apiUrl,
      })),
      validateMasterRow,
      validateAll,
      buildDeepSavePayload,
      afterSave,
      form: masterForm,
    });

    const {
      mode,
      setMode,
      loading,
      setQueryParams,
      listRows,
      selectedListRow,
      handleSelectListRow,
      handleOpenRecord,
      fetchList,
      activeRecord,
      isEditing,
      isDirty,
      updateMasterField,
      detailStates,
      updateDetailRow,
      addDetailRow,
      deleteDetailRow,
      replaceDetailRows,
    } = crud;

    // React to activeRecord or mode updates by refilling master form values
    React.useEffect(() => {
      if (activeRecord) {
        masterForm.setFieldsValue(activeRecord);
      } else {
        masterForm.resetFields();
      }
    }, [activeRecord, mode, masterForm]);

    // Query Search submit
    const handleSearchSubmit = () => {
      const vals = searchForm.getFieldsValue();
      let params = vals;
      if (typeof config.query?.buildParams === 'function') {
        params = config.query.buildParams(vals);
      }
      setQueryParams(params);
      fetchList(params);
    };

    // ── Query Panel ────────────────────────────────────────
    const queryPanel = (
      <Form
        form={searchForm}
        layout="vertical"
        size="small"
        onFinish={handleSearchSubmit}
        onValuesChange={() => {
          const vals = searchForm.getFieldsValue();
          let params = vals;
          if (typeof config.query?.buildParams === 'function') {
            params = config.query.buildParams(vals);
          }
          setQueryParams(params);
        }}
      >
        {renderQueryForm && renderQueryForm({ form: searchForm })}
        <div style={{ textAlign: 'right', marginTop: '6px' }}>
          <Space>
            <Button
              size="small"
              type="default"
              onClick={() => {
                searchForm.resetFields();
                setQueryParams({});
              }}
            >
              清除條件
            </Button>
            <Button size="small" type="primary" htmlType="submit">
              查詢
            </Button>
          </Space>
        </div>
      </Form>
    );

    // ── List Grid ──────────────────────────────────────────
    const queryResultHeight = layout?.queryResultHeight !== undefined
      ? layout.queryResultHeight
      : 360;

    const listGrid = (
      <Table
        size="small"
        dataSource={listRows}
        rowKey={config.list?.rowKey || masterKey}
        pagination={{ pageSize: 50, size: 'small' }}
        columns={config.list?.columns || []}
        bordered
        scroll={queryResultHeight ? { y: queryResultHeight, x: 'max-content' } : undefined}
        onRow={(record) => ({
          onClick: () => handleSelectListRow(record),
          onDoubleClick: () => handleOpenRecord(record),
          className:
            selectedListRow && selectedListRow[masterKey] === record[masterKey]
              ? 'row-active'
              : '',
        })}
      />
    );

    // ── Sidebar ────────────────────────────────────────────
    // Prepend temp master row if active
    const isTempActive =
      activeRecord && String(activeRecord[masterKey]).startsWith('temp_');
    const sidebarItems = [...listRows];
    if (
      isTempActive &&
      !sidebarItems.some((item) => item[masterKey] === activeRecord[masterKey])
    ) {
      sidebarItems.unshift({
        [masterKey]: activeRecord[masterKey],
        _displayLabel: '(新增資料)',
      });
    }

    const sidebar = (
      <>
        <div className="erp-rw-sidebar-header">{sidebarTitle}</div>
        <div className="erp-rw-sidebar-content">
          {sidebarItems.map((item) => {
            const label = item._displayLabel || sidebarGetDisplayText(item);
            const isActive =
              activeRecord && activeRecord[masterKey] === item[masterKey];
            return (
              <div
                key={item[masterKey]}
                className={`erp-rw-sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => !item._displayLabel && handleOpenRecord(item)}
              >
                <span>{label}</span>
              </div>
            );
          })}
        </div>
      </>
    );

    // ── Master Form ────────────────────────────────────────
    const masterFormBodyStyle = enableContentScroll
      ? {
          height: contentHeight,
          maxHeight: contentHeight,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: 8,
          boxSizing: 'border-box',
        }
      : undefined;

    const masterFormSection = (
      <Form
        form={masterForm}
        layout="vertical"
        size="small"
        disabled={!isEditing}
        onValuesChange={(changed) => {
          Object.entries(changed).forEach(([k, v]) => {
            updateMasterField(k, v);
          });
        }}
      >
        <div className="erp-rw-section-header">主檔資料</div>
        <div
          className={[
            'erp-rw-master-form-body',
            enableContentScroll ? 'erp-rw-master-form-body-scroll' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={masterFormBodyStyle}
        >
          {renderMasterForm &&
            renderMasterForm({
              form: masterForm,
              isEditing,
              activeRecord,
              updateMasterField,
              isDirty,
              detailStates,
            })}
        </div>
      </Form>
    );

    // ── Detail Tabs ────────────────────────────────────────
    const detailTabsSection = (
      <Tabs size="small" type="card">
        {detailTabs
          .filter((tab) => !tab.hidden)
          .map((tab) => {
            const tabState = detailStates[tab.key] || {
              rows: [],
              loading: false,
              readOnly: false,
            };
            return (
              <TabPane tab={tab.title} key={tab.key}>
                <Spin spinning={tabState.loading}>
                  {tab.renderer ? (
                    React.createElement(tab.renderer, {
                      rows: tabState.rows,
                      isEditing: isEditing,
                      loading: tabState.loading,
                      onCellChange: (rowKey, field, val) =>
                        updateDetailRow(tab.key, rowKey, field, val),
                      onAddRow: (defaultVal) =>
                        addDetailRow(tab.key, defaultVal),
                      onDeleteRow: (rowKey) =>
                        deleteDetailRow(tab.key, rowKey),
                      replaceDetailRows: (newRows, options) =>
                        replaceDetailRows(tab.key, newRows, options),
                      activeRecord: activeRecord,
                      detailStates: detailStates,
                      globalReplaceDetailRows: replaceDetailRows,
                      globalDeleteDetailRow: deleteDetailRow,
                      globalUpdateDetailRow: updateDetailRow,
                      globalAddDetailRow: addDetailRow,
                      updateMasterField: updateMasterField,
                      form: masterForm,
                    })
                  ) : (
                    <Table
                      size="small"
                      dataSource={tabState.rows}
                      columns={tab.columns || []}
                      rowKey="gkey"
                      pagination={false}
                      bordered
                    />
                  )}
                </Spin>
              </TabPane>
            );
          })}
      </Tabs>
    );

    // ── Status Bar ─────────────────────────────────────────
    const statusContent = (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          alignItems: 'center',
        }}
      >
        <span>
          模式: {mode === 'list' ? '列表檢索' : '編輯維護'} | 狀態:{' '}
          {isEditing ? (
            <span style={{ color: '#fa8c16' }}>編輯中</span>
          ) : (
            '檢視中'
          )}
        </span>
        {mode === 'edit' && (
          <Button size="small" onClick={() => setMode('list')}>
            返回查詢列表
          </Button>
        )}
      </div>
    );

    return (
      <ERPSheetPage sheetId={sheetId} title={title} breadcrumb={breadcrumb}>
        <Spin spinning={loading}>
          <ERPRecordWorkbenchLayout
            mode={mode}
            onModeChange={setMode}
            queryPanel={queryPanel}
            listGrid={listGrid}
            sidebar={sidebar}
            masterForm={masterFormSection}
            detailTabs={detailTabsSection}
            statusContent={statusContent}
            renderMainWrapper={config.renderMainWrapper}
            mainClassName={config.mainClassName}
            layout={config.layout}
          />
        </Spin>
      </ERPSheetPage>
    );
  };
}
