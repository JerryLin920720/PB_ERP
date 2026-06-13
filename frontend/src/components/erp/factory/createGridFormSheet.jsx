import React from 'react';
import { Table, Form, Spin, Card } from 'antd';
import ERPSheetPage from '../shell/ERPSheetPage';
import useSingleTableCrud from '../../../hooks/useSingleTableCrud';
import { useEffect } from 'react';
import { SHEET_STATE } from '../../../config/programRegistry';

/**
 * createGridFormSheet - 工廠函數，用於建立標準的 SingleTableSheet-GridForm (上 Grid 下 Form 佈局)
 * 
 * @param {Object} config
 * @param {string} config.sheetId - 系統作業代號，例如 'ba005'
 * @param {string} config.title - 作業名稱，例如 '公司主體基本設定'
 * @param {Array<string>} [config.breadcrumb] - 麵包屑路徑
 * @param {string} config.apiUrl - API 路徑
 * @param {string} [config.rowKey='gkey'] - 主鍵欄位
 * @param {Array} config.columns - Grid 顯示的欄位配置表
 * @param {Object} [config.fieldLabels] - 欄位英中對照表
 * @param {Function} [config.createDefaultRow] - 新增時的預設列產生器
 * @param {Function} [config.buildPayload] - 儲存前資料轉換與處理
 * @param {Function} [config.validateRow] - 儲存前自定義防呆驗證
 * @param {Function} config.renderForm - 自定義下半部 Form 渲染函數
 *                                         簽章：({ form, isEditing, selectedRow }) => ReactElement
 * @param {Function} [config.onValuesChange] - Form 欄位變更時的聯動防呆處理
 *                                              簽章：(changedValues, allValues, form) => void
 */
export default function createGridFormSheet(config) {
  const {
    sheetId,
    title,
    breadcrumb,
    apiUrl,
    rowKey = 'gkey',
    columns,
    fieldLabels = {},
    createDefaultRow,
    buildPayload,
    validateRow,
    renderForm,
    onValuesChange,
    prepareFormValues,
    sequenceField,
    autoRenumber = false,
    deleteConfirmTitle,
    deleteConfirmMessage,
    layout = {}
  } = config;

  const {
    gridHeight = 180,
    gridMaxHeight,
    gridFormGap = 8,
    compact = true
  } = layout;

  return function GridFormSheet() {
    const [form] = Form.useForm();

    const crud = useSingleTableCrud({
      sheetId,
      apiUrl,
      rowKey,
      fieldLabels,
      createDefaultRow,
      buildPayload,
      validateRow,
      prepareFormValues,
      sequenceField,
      autoRenumber,
      deleteConfirmTitle,
      deleteConfirmMessage,
      form
    });

    const {
      rows,
      selectedRow,
      isEditing,
      loading,
      isDirty,
      setIsDirty,
      handleSelectRow,
      setIsEditing
    } = crud;

    const selectedRowKey = selectedRow ? selectedRow[rowKey] : null;

    // 監聽狀態並廣播給 Navbar
    useEffect(() => {
      let currentState = SHEET_STATE.BROWSE;
      const isDirty = crud.isDirty; // useSingleTableCrud 需要暴露 isDirty 或是用 isEditing 判斷
      if (isEditing) {
        currentState = selectedRow ? SHEET_STATE.EDIT : SHEET_STATE.NEW;
      }

      window.dispatchEvent(new CustomEvent('mdi-sheet-state-change', {
        detail: {
          tabId: sheetId,
          programId: sheetId,
          state: currentState,
          dirty: isDirty,
          selectedCount: selectedRow ? 1 : 0,
          approved: selectedRow?.is_approved === 'Y',
          readonly: false,
          selectedRecord: selectedRow
        }
      }));
    }, [isEditing, selectedRow, sheetId, crud.isDirty]);


    // 行選取配置
    const rowSelection = {
      type: 'radio',
      selectedRowKeys: selectedRowKey ? [selectedRowKey] : [],
      onChange: (keys, selectedRows) => {
        if (!isEditing) {
          handleSelectRow(selectedRows[0]);
        }
      }
    };

    const gridStyle = {
      height: typeof gridHeight === 'number' ? `${gridHeight}px` : gridHeight,
      ...(gridMaxHeight ? { maxHeight: typeof gridMaxHeight === 'number' ? `${gridMaxHeight}px` : gridMaxHeight } : {})
    };

    return (
      <ERPSheetPage
        sheetId={sheetId}
        title={title}
        breadcrumb={breadcrumb}
        className={`erp-sheet-page-${sheetId}`}
      >
        <Spin spinning={loading}>
          <div className="erp-gridform-container" style={{ gap: `${gridFormGap}px` }}>
            
            {/* 編輯狀態指示 */}
            <div className="erp-gridform-status-header">
              <h4 style={{ margin: 0, fontWeight: 600, color: 'var(--primary-color)' }}>
                {title} 維護列表
                {isEditing && (
                  <span style={{ fontSize: '13px', color: '#52c41a', marginLeft: '10px' }}>
                    (✏️ 編輯中)
                  </span>
                )}
              </h4>
              <span style={{ color: '#8c8c8c', fontSize: '12.5px' }}>
                💡 點擊頂部全域【編輯】或【雙擊上表行】可解鎖下方表單
              </span>
            </div>

            {/* 上半部：Grid 清單 */}
            <div 
              className={`erp-gridform-grid-section ${compact ? 'erp-gridform-grid-compact' : ''}`}
              style={gridStyle}
            >
              <Table
                columns={columns}
                dataSource={rows}
                rowKey={rowKey}
                size="small"
                pagination={false}
                rowSelection={rowSelection}
                onRow={(record) => ({
                  onClick: () => {
                    if (!isEditing) handleSelectRow(record);
                  },
                  onDoubleClick: () => {
                    if (!isEditing) {
                      handleSelectRow(record);
                      setIsEditing(true);
                    }
                  }
                })}
              />
            </div>

            {/* 下半部：Form 面板 */}
            <div className={`erp-gridform-form-section ${compact ? 'erp-gridform-form-compact' : ''} erp-gridform-form-scroll-area`}>
              <Form
                form={form}
                layout="vertical"
                disabled={!isEditing || !selectedRow}
                onValuesChange={(changedValues, allValues) => {
                  setIsDirty(true);
                  if (onValuesChange) {
                    onValuesChange(changedValues, allValues, form);
                  }
                }}
              >
                {renderForm && renderForm({ form, isEditing, selectedRow })}
              </Form>
            </div>

          </div>
        </Spin>
      </ERPSheetPage>
    );
  };
}
