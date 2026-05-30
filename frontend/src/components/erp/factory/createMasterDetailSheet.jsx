import React, { useEffect } from 'react';
import { Table, Input, InputNumber, Select, Switch, DatePicker, Button, message } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import ERPSheetPage from '../shell/ERPSheetPage';
import ERPMasterDetailLayout from '../master-detail/ERPMasterDetailLayout';
import useMasterDetailCrud from '../../../hooks/useMasterDetailCrud';

/**
 * createMasterDetailSheet - 工廠函數，用於建立標準的 MasterDetailSheet (原 Pattern B1)
 * 
 * 該工廠函數封裝了 Layer 1 (Page Shell)、Layer 2 (CRUD Hook) 與 Layer 3 (Layout)，
 * 統一了所有單主從作業的排版佈局、事件對接與校驗邏輯，禁止在具體 Sheet 內編寫 axios 或自行監聽指令。
 * 
 * @param {Object} config
 * @param {string} config.sheetId - 系統作業代號，例如 'ba060'
 * @param {string} config.title - 作業名稱，例如 '全域幣別設定'
 * @param {Array<string>} [config.breadcrumb] - 麵包屑路徑，例如 ['基本資料', '全域幣別設定']
 * @param {Object} config.master - 主檔配置
 * @param {string} config.master.apiUrl - 主檔 API 路徑
 * @param {string} [config.master.key='gkey'] - 主檔主鍵欄位名
 * @param {Array} config.master.columns - 主檔欄位配置列表
 * @param {Function} config.master.createDefaultRow - 新增主檔預設列生成器
 * @param {Function} config.master.buildPayload - 主檔送出 Payload 前的處理與校驗函數
 * @param {Function} [config.master.getDisplayText] - 刪除提示用的主檔顯示文字生成器
 * @param {Function} [config.master.validateRow] - 主檔單列額外校驗函數
 * @param {Function} [config.master.onFieldChange] - 主檔欄位變動时的回呼函數（通用根據欄位變動重算明細）
 *                                                      簽章：({ row, field, value, nextRow, detailRows, replaceDetailRows, updateDetailRows, markDetailRowsDirty }) => void
 * @param {Object} config.detail - 明細配置
 * @param {string} config.detail.apiUrl - 明細 API 路徑
 * @param {string} [config.detail.key='gkey'] - 明細主鍵欄位名
 * @param {string} config.detail.parentKey - 明細關聯主檔的外鍵欄位名
 * @param {Array} config.detail.columns - 明細欄位配置列表
 * @param {Function} config.detail.createDefaultRow - 新增明細預設列生成器
 * @param {Function} config.detail.buildPayload - 明細送出 Payload 前的處理與校驗函數
 * @param {Function} [config.detail.getDisplayText] - 刪除提示用的明細顯示文字生成器
 * @param {Function} [config.detail.validateRow] - 明細單列額外校驗函數
 * @param {React.ComponentType} [config.detail.renderer] - 自訂 Detail 渲染器元件（如 SizeMatrixRenderer）
 *                                                           若不提供，使用通用 Table renderer。
 * @param {boolean} [config.detail.disableAddAction=false] - 若為 true，隐藏「新增明細」按鈕（用於明細從其他機制自動產生的情尺）
 * @param {Object} [config.fieldLabels] - 欄位英中對照表 (錯誤翻譯用)
 * @param {boolean} [config.cascadeDeleteDetailOnMasterDelete=true] - 刪除主檔時，是否假設後端 cascade 刪除明細
 * @param {Function} [config.validateAll] - 跨主從全域校驗函數
 *
 * @returns {React.ComponentType} 回傳封裝完成的主從作業 React 元件
 */
export default function createMasterDetailSheet(config) {
  const {
    sheetId,
    title,
    breadcrumb,
    master,
    detail,
    fieldLabels = {},
    cascadeDeleteDetailOnMasterDelete = true,
    validateAll,
    saveAllOverride
  } = config;

  return function MasterDetailSheet() {
    const crud = useMasterDetailCrud({
      sheetId,
      masterApiUrl: master.apiUrl,
      detailApiUrl: detail.apiUrl,
      masterKey: master.key || 'gkey',
      detailKey: detail.key || 'gkey',
      detailParentKey: detail.parentKey,
      masterColumns: master.columns,
      detailColumns: detail.columns,
      cascadeDeleteDetailOnMasterDelete,
      fieldLabels,
      getMasterDisplayText: master.getDisplayText,
      getDetailDisplayText: detail.getDisplayText,
      createDefaultMasterRow: master.createDefaultRow,
      createDefaultDetailRow: detail.createDefaultRow,
      buildMasterPayload: master.buildPayload,
      buildDetailPayload: detail.buildPayload,
      validateMasterRow: master.validateRow,
      validateDetailRow: detail.validateRow,
      validateAll,
      disableDetailAddAction: detail.disableAddAction,
      saveAllOverride
    });

    const {
      masterRows,
      detailRows,
      selectedMaster,
      selectedDetail,
      activeArea,
      isEditing,
      loading,
      fetchMaster,
      handleSelectMaster,
      handleSelectDetail,
      handleMasterFieldChange: _handleMasterFieldChange,
      handleDetailFieldChange: _handleDetailFieldChange,
      confirmDeleteMaster,
      confirmDeleteDetail,
      isDirty,
      replaceDetailRows,
      updateDetailRows,
      markDetailRowsDirty
    } = crud;

    // 包裝 master field change，在原始處理後额外呼叫 config.master.onFieldChange
    const handleMasterFieldChange = (gkey, field, val) => {
      _handleMasterFieldChange(gkey, field, val);
      if (typeof master.onFieldChange === 'function') {
        // 小延遲以確保 React state 已更新（不影響同步 flow）
        // nextRow 計算：從目前 masterRows 找出對應 row 對象再展開欄位
        const masterKeyField = master.key || 'gkey';
        const currentRow = masterRows.find(r => r[masterKeyField] === gkey) || {};
        const nextRow = { ...currentRow, [field]: val };
        master.onFieldChange({
          row: currentRow,
          field,
          value: val,
          nextRow,
          detailRows,
          replaceDetailRows,
          updateDetailRows,
          markDetailRowsDirty,
          handleMasterFieldChange
        });
      }
    };

    // 包裝 detail field change，在原始處理後额外呼叫 config.detail.onFieldChange
    const handleDetailFieldChange = (gkey, field, val) => {
      _handleDetailFieldChange(gkey, field, val);
      if (typeof detail.onFieldChange === 'function') {
        const detailKeyField = detail.key || 'gkey';
        const masterKeyField = master.key || 'gkey';
        const currentRow = detailRows.find(r => r[detailKeyField] === gkey) || {};
        const nextRow = { ...currentRow, [field]: val };
        const nextDetailRows = detailRows.map(r => r[detailKeyField] === gkey ? nextRow : r);
        detail.onFieldChange({
          row: currentRow,
          field,
          value: val,
          nextRow,
          detailRows: nextDetailRows,
          replaceDetailRows,
          updateDetailRows,
          markDetailRowsDirty,
          masterRows,
          selectedMaster,
          handleMasterFieldChange
        });
      }
    };

    // 元件載入時，全自動檢索 Master 資料
    useEffect(() => {
      fetchMaster();
    }, []);

    // 建立 Table 欄位定義的通用 Renderer
    const buildTableColumns = (columns, isMaster) => {
      const fieldChangeHandler = isMaster ? handleMasterFieldChange : handleDetailFieldChange;
      const keyField = isMaster ? (master.key || 'gkey') : (detail.key || 'gkey');

      const resolveEditable = (col, record) => {
        if (typeof col.editable === 'function') {
          return col.editable(record);
        }
        return col.editable !== false;
      };

      const targetCols = columns.map(col => {
        return {
          title: col.label,
          dataIndex: col.key,
          key: col.key,
          width: col.width,
          render: (text, record) => {
            const cellEditable = isEditing && resolveEditable(col, record);

            if (cellEditable) {
              if (col.type === 'number') {
                return (
                  <InputNumber
                    value={text}
                    precision={col.precision}
                    style={{ width: '100%' }}
                    onChange={(v) => fieldChangeHandler(record[keyField], col.key, v)}
                  />
                );
              }

              if (col.type === 'select') {
                return (
                  <Select
                    value={text}
                    options={col.options || []}
                    style={{ width: '100%' }}
                    onChange={(v) => fieldChangeHandler(record[keyField], col.key, v)}
                  />
                );
              }

              if (col.type === 'switch') {
                const checkedValue = col.options?.checkedValue ?? 'Y';
                const unCheckedValue = col.options?.unCheckedValue ?? 'N';
                return (
                  <Switch
                    checked={text === checkedValue}
                    onChange={(checked) => fieldChangeHandler(record[keyField], col.key, checked ? checkedValue : unCheckedValue)}
                  />
                );
              }

              if (col.type === 'datetime') {
                const formatStr = col.format || 'YYYY-MM-DD HH:mm';
                // TODO: DatePicker 於 BA060 等日期元件細部對接可能需要更豐富的配置
                return (
                  <DatePicker
                    value={text ? dayjs(text) : null}
                    showTime
                    format={formatStr}
                    style={{ width: '100%' }}
                    onChange={(date) => fieldChangeHandler(
                      record[keyField],
                      col.key,
                      date ? date.format('YYYY-MM-DDTHH:mm:ss') : null
                    )}
                  />
                );
              }

              // 預設為一般 text 欄位
              return (
                <Input
                  value={text}
                  maxLength={col.maxLength}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (col.textTransform === 'uppercase') {
                      val = val.toUpperCase();
                    }
                    fieldChangeHandler(record[keyField], col.key, val);
                  }}
                />
              );
            }

            // 唯讀渲染 View Mode
            if (col.type === 'select') {
              const opt = col.options?.find(o => String(o.value) === String(text));
              return <span>{opt ? opt.label : text}</span>;
            }

            if (col.type === 'switch') {
              const checkedValue = col.options?.checkedValue ?? 'Y';
              return <span>{text === checkedValue ? '✅ 是' : '❌ 否'}</span>;
            }

            if (col.type === 'datetime') {
              const formatStr = col.format || 'YYYY-MM-DD HH:mm';
              return <span>{text ? dayjs(text).format(formatStr) : '-'}</span>;
            }

            if (col.type === 'number' && col.precision !== undefined) {
              return <span>{text !== null && text !== undefined ? Number(text).toFixed(col.precision) : '-'}</span>;
            }

            return <span>{text}</span>;
          }
        };
      });

      // 附加操作列 (刪除按鈕)
      targetCols.push({
        title: '操作',
        key: 'action',
        width: '80px',
        align: 'center',
        render: (_, record) => {
          const deleteHandler = isMaster ? confirmDeleteMaster : confirmDeleteDetail;
          return (
            <Button
              danger
              icon={<DeleteOutlined />}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                deleteHandler(record);
              }}
            />
          );
        }
      });

      return targetCols;
    };

    const masterTableColumns = buildTableColumns(master.columns, true);
    // detail.columns 可能為空（使用 custom renderer 時）—延遲算，防止無列欄時崩潰
    const detailTableColumns = (detail.columns && detail.columns.length > 0)
      ? buildTableColumns(detail.columns, false)
      : [];

    const masterKeyField = master.key || 'gkey';
    const detailKeyField = detail.key || 'gkey';

    const statusMsg = `讀取完成。共 ${masterRows.length} 筆主檔資料，${detailRows.length} 筆明細資料。`;

    // detail renderer：若 config 提供 detail.renderer，使用客製元件；否則使用通用 Table
    const DetailRenderer = detail.renderer || null;

    const masterActions = (
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        className="erp-md-action-button"
        onClick={() => {
          crud.handleAddMaster();
        }}
      >
        新增主檔
      </Button>
    );

    // 若 detail.disableAddAction=true，隱藏新增明細按鈕（通用能力，不寫 DP004 特規）
    const detailActions = detail.disableAddAction ? null : (
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        className="erp-md-action-button"
        onClick={() => {
          if (!selectedMaster) {
            message.warning('請先選擇主檔資料！');
            return;
          }
          crud.handleAddDetail();
        }}
      >
        新增明細
      </Button>
    );

    return (
      <ERPSheetPage
        sheetId={sheetId}
        title={title}
        breadcrumb={breadcrumb}
      >
        <ERPMasterDetailLayout
          masterActions={masterActions}
          detailActions={detailActions}
          masterTitle={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span>
                🌍 {title} (主檔)
                {isEditing && <span style={{ fontSize: '11px', color: '#52c41a', marginLeft: '8px' }}>(✏️ 編輯中)</span>}
              </span>
              <span style={{ color: '#8c8c8c', fontSize: '11px', fontWeight: 'normal' }}>💡 雙擊表格列進行修改</span>
            </div>
          }
          detailTitle={
            <span>
              📅 明細資料：
              {selectedMaster
                ? (typeof master.getDisplayText === 'function' ? master.getDisplayText(selectedMaster) : selectedMaster[masterKeyField])
                : '未選擇'}
            </span>
          }
          masterContent={
            <Table
              columns={masterTableColumns}
              dataSource={masterRows}
              rowKey={masterKeyField}
              loading={loading && activeArea === 'master'}
              pagination={false}
              size="small"
              rowClassName={(record) => record[masterKeyField] === selectedMaster?.[masterKeyField] ? 'row-active' : ''}
              onRow={(record) => ({
                onClick: () => handleSelectMaster(record),
                onDoubleClick: () => crud.setIsEditing(true)
              })}
            />
          }
          detailContent={
            DetailRenderer ? (
              <DetailRenderer
                detailRows={detailRows}
                selectedDetail={selectedDetail}
                onSelectDetail={handleSelectDetail}
                onDetailCellChange={handleDetailFieldChange}
                isEditing={isEditing}
                loading={loading && activeArea === 'detail'}
                detailKey={detailKeyField}
                selectedMaster={selectedMaster}
                parentKeyField={detail.parentKey}
                masterKeyField={masterKeyField}
              />
            ) : (
              <Table
                columns={detailTableColumns}
                dataSource={detailRows}
                rowKey={detailKeyField}
                loading={loading && activeArea === 'detail'}
                pagination={false}
                size="small"
                rowClassName={(record) => record[detailKeyField] === selectedDetail?.[detailKeyField] ? 'row-active' : ''}
                onRow={(record) => ({
                  onClick: () => handleSelectDetail(record),
                  onDoubleClick: () => crud.setIsEditing(true)
                })}
              />
            )
          }
          statusContent={
            <>
              <span>提示：點擊或雙擊列進行修改；全域工具列提供「查詢、增行、刪行、存檔、放棄」動作</span>
              <span>
                狀態：{statusMsg}
                {isDirty && (
                  <span style={{ color: '#ef4444', marginLeft: '10px', fontWeight: 'bold' }}>
                    * 有未儲存變更
                  </span>
                )}
              </span>
            </>
          }
        />
      </ERPSheetPage>
    );
  };
}
