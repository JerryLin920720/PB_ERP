import React, { useState } from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import ERPLookupModal from './ERPLookupModal';
import { lookupRegistry } from './lookupRegistry';
import './ERPLookup.css';

/**
 * ERPLookupField - 雙擊檢索開窗輸入框元件
 */
export default function ERPLookupField({
  type,
  value,
  displayText,
  onChange,
  placeholder = '雙擊或按 F2 檢索...',
  disabled = false,
  apiBase = '',
  className = '',
  ...rest
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const config = lookupRegistry[type];

  // 開啟彈窗
  const handleOpen = () => {
    if (disabled) return;
    setModalVisible(true);
  };

  // 攔截鍵盤事件 (監聽 F2 鍵，F2 keyCode 是 113)
  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'F2' || e.keyCode === 113) {
      e.preventDefault();
      handleOpen();
    }
  };

  // 處理選取回傳值
  const handleSelect = (record) => {
    setModalVisible(false);
    if (onChange && config) {
      const val = record[config.returnValue || 'gkey'];
      const lbl = record[config.displayField];
      
      // 回傳選取物件，至少包含 value, label 與原始 record 欄位
      onChange({
        ...record,
        value: val,
        label: lbl
      });
    }
  };

  // 決定輸入框中要呈現的字串內容
  const displayVal = displayText || value || '';

  return (
    <>
      <Input
        placeholder={placeholder}
        value={displayVal}
        readOnly
        disabled={disabled}
        onDoubleClick={handleOpen}
        onKeyDown={handleKeyDown}
        suffix={
          <SearchOutlined
            className="erp-lookup-icon"
            onClick={handleOpen}
          />
        }
        className={`erp-lookup-input ${className}`}
        {...rest}
      />

      {config && (
        <ERPLookupModal
          type={type}
          visible={modalVisible}
          onCancel={() => setModalVisible(false)}
          onSelect={handleSelect}
          apiBase={apiBase}
        />
      )}
    </>
  );
}


