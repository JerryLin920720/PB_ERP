import React from 'react';
import { Table, InputNumber } from 'antd';
import { formatSize } from './sizeRun';

/**
 * SizeMatrixRenderer - 尺碼矩陣 Detail Renderer
 *
 * DP004 專屬 UI 元件，放置於 src/v2_views/dp004/。
 *
 * 設計原則：
 *   - 本元件只負責「顯示」與「儲存格編輯回呼」，不管理任何 CRUD 狀態。
 *   - 不含 Add Row / Save button / axios / toolbar listener。
 *   - 所有資料由父元件（透過 createMasterDetailSheet）管理，
 *     透過 props 傳入；編輯時只呼叫 onDetailCellChange 通知父元件。
 *   - 欄位顯示：每個 detail row 依 sizetype 決定的主要尺碼欄位（tszus/tszeu/tszuk/tszjp/tszot），
 *     以及所有可編輯的尺碼換算欄位。
 *
 * Props：
 *   @param {Array}    detailRows          - detail row 陣列（來自 useMasterDetailCrud）
 *   @param {Object}   selectedDetail      - 當前選取的 detail row（可為 null）
 *   @param {Function} onSelectDetail      - 點選 row 時呼叫，傳入該 row
 *   @param {Function} onDetailCellChange  - 儲存格值變動時呼叫，簽章：(gkey, field, newValue)
 *   @param {boolean}  isEditing           - 是否處於編輯模式
 *   @param {boolean}  loading             - 是否正在載入（顯示 Table loading）
 *   @param {string}   sizeColumn          - 主要尺碼欄位名稱（如 'tszus'），由 sizetype 決定
 *   @param {string}   [detailKey='gkey']  - detail row 主鍵欄位名稱
 */
const SizeMatrixRenderer = ({
  detailRows = [],
  selectedDetail,
  onSelectDetail,
  onDetailCellChange,
  isEditing = false,
  loading = false,
  sizeColumn = 'tszus',
  detailKey = 'gkey',
  selectedMaster,
  parentKeyField = 'dp004gkey',
  masterKeyField = 'gkey',
}) => {

  // 尺碼欄位定義（五個體系）
  const sizeFields = [
    { key: 'tszus', label: 'US碼' },
    { key: 'tszeu', label: 'EU碼' },
    { key: 'tszuk', label: 'UK碼' },
    { key: 'tszjp', label: 'JP碼' },
    { key: 'tszot', label: '其他碼' },
  ];

  // 決定「主要尺碼」欄（sizetype 對應欄），顯示為 readonly / 標示色
  const primaryCol = sizeColumn;

  // 建立 Table columns
  const columns = [
    {
      title: '#',
      dataIndex: 'displaySerialNo',
      key: 'displaySerialNo',
      width: 48,
      align: 'center',
      render: (val) => <span className="erp-matrix-seq">{val}</span>,
    },
    ...sizeFields.map((sf) => {
      const isPrimary = sf.key === primaryCol;
      return {
        title: (
          <span className={isPrimary ? 'erp-matrix-primary-header' : undefined}>
            {sf.label}
            {isPrimary && <span className="erp-matrix-primary-badge"> ★</span>}
          </span>
        ),
        dataIndex: sf.key,
        key: sf.key,
        width: 90,
        align: 'center',
        render: (val, record) => {
          const gkey = record[detailKey];

          // 主要尺碼欄：唯讀顯示（由 size run 自動產生）
          if (isPrimary) {
            return (
              <span className="erp-matrix-primary-cell">
                {formatSize(val)}
              </span>
            );
          }

          // 其他尺碼欄：編輯模式下可輸入，否則唯讀
          if (isEditing) {
            return (
              <InputNumber
                value={val}
                precision={1}
                step={0.5}
                min={0}
                max={99}
                style={{ width: '100%' }}
                size="small"
                onChange={(newVal) => {
                  if (typeof onDetailCellChange === 'function') {
                    onDetailCellChange(gkey, sf.key, newVal);
                  }
                }}
              />
            );
          }

          return (
            <span className="erp-matrix-cell">
              {val !== null && val !== undefined ? formatSize(val) : '-'}
            </span>
          );
        },
      };
    }),
  ];

  const SIZE_FIELDS = ['tszus', 'tszeu', 'tszuk', 'tszjp', 'tszot'];

  const hasAnySizeValue = (row) => {
    return SIZE_FIELDS.some((field) => {
      const value = row?.[field];
      return value !== undefined && value !== null && String(value).trim() !== '';
    });
  };

  // 過濾掉所有尺碼欄位皆為空的 row（防範空白列被渲染）
  // 並且只保留屬於目前 selectedMaster 的明細，防範其他 master 混入
  const filteredRows = (detailRows || []).filter(row => {
    if (!selectedMaster) return false;
    const masterGkey = selectedMaster[masterKeyField];
    if (parentKeyField && String(row[parentKeyField]) !== String(masterGkey)) return false;
    return hasAnySizeValue(row);
  });

  const normalizedRows = filteredRows.map((row, index) => ({
    ...row,
    displaySerialNo: index + 1,
  }));

  return (
    <Table
      className="erp-size-matrix-table"
      columns={columns}
      dataSource={normalizedRows}
      rowKey={detailKey}
      loading={loading}
      pagination={false}
      size="small"
      rowClassName={(record) =>
        record[detailKey] === selectedDetail?.[detailKey]
          ? 'row-active'
          : ''
      }
      onRow={(record) => ({
        onClick: () => {
          if (typeof onSelectDetail === 'function') {
            onSelectDetail(record);
          }
        },
      })}
      scroll={{ x: 'max-content' }}
    />
  );
};

export default SizeMatrixRenderer;
