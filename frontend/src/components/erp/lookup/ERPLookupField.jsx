import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Select, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import axios from 'axios';
import ERPLookupModal from './ERPLookupModal';
import { lookupRegistry } from './lookupRegistry';
import './ERPLookup.css';

const { Option } = Select;

/**
 * Helper to resolve absolute API urls.
 */
const getFullUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  let cleanPath = path.trim().replace(/^\/|\/$/g, '');
  if (cleanPath.startsWith('api/')) {
    cleanPath = cleanPath.substring(4);
  }
  return `http://localhost:8001/api/${cleanPath}/`;
};

/**
 * ERPLookupField
 * Dual Mode ERP Lookup Field: Dropdown Search + F2 / Double-Click Modal.
 */
export default function ERPLookupField({
  type,
  value,
  onChange,
  placeholder = '下拉搜尋 或 雙擊 F2 檢索...',
  disabled = false,
  apiBase = '',
  queryParams = {},
  className = '',
  title,
  lookupTitle,
  ...rest
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const config = lookupRegistry[type];
  const selectRef = useRef(null);

  const serializedQueryParams = useMemo(() => JSON.stringify(queryParams || {}), [queryParams]);
  const queryParamsMemo = useMemo(() => JSON.parse(serializedQueryParams), [serializedQueryParams]);

  // Reset options cache when queryParams change
  useEffect(() => {
    setOptions([]);
  }, [serializedQueryParams]);

  // Fetch initial option dynamically if value is set but not in current options
  const fetchSingleOption = useCallback(async (val) => {
    if (!config || !val || String(val).startsWith('temp_')) return;
    try {
      const url = `${getFullUrl(config.apiUrl)}${val}/`;
      const res = await axios.get(url, { params: queryParamsMemo });
      if (res.data) {
        const label = res.data[config.displayField] || val;
        setOptions((prev) => {
          if (prev.some((o) => o.value === val)) return prev;
          return [...prev, { value: val, label, record: res.data }];
        });
      }
    } catch (e) {
      console.warn(`Failed to fetch lookup display value for ${val}:`, e);
    }
  }, [config, queryParamsMemo]);

  // Load dynamic list (top 50)
  const fetchOptions = useCallback(async (search = '') => {
    if (!config) return;
    setLoading(true);
    try {
      const params = { ...queryParamsMemo };
      if (search && config.searchFields && config.searchFields.length > 0) {
        // Simple search query or backend query if supported
        params.search = search;
      }
      const url = getFullUrl(config.apiUrl);
      const res = await axios.get(url, { params });
      
      const rows = res.data || [];
      const opts = rows.map((item) => {
        const val = item[config.returnValue || 'gkey'];
        const label = item[config.displayField] || val;
        return { value: val, label, record: item };
      });
      setOptions(opts);
    } catch (e) {
      console.warn('Failed to load lookup options:', e);
    } finally {
      setLoading(false);
    }
  }, [config, queryParamsMemo]);

  // Sync initial value
  useEffect(() => {
    if (value) {
      const exists = options.some((o) => o.value === value);
      if (!exists) {
        fetchSingleOption(value);
      }
    }
  }, [value, options, fetchSingleOption]);

  // Trigger modal open
  const handleOpenModal = () => {
    if (disabled) return;
    setModalVisible(true);
  };

  // Keyboard listener for F2
  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'F2' || e.keyCode === 113) {
      e.preventDefault();
      handleOpenModal();
    }
  };

  // Handlers for modal selection
  const handleModalSelect = (record) => {
    setModalVisible(false);
    if (onChange && config) {
      const val = record[config.returnValue || 'gkey'];
      const lbl = record[config.displayField] || val;
      
      setOptions((prev) => {
        if (prev.some((o) => o.value === val)) return prev;
        return [...prev, { value: val, label: lbl, record }];
      });
      
      onChange(val, record);
    }
  };

  if (!config) {
    return <Select placeholder="檢索設定不存在，請聯絡系統管理員。" disabled style={{ width: '100%' }} />;
  }

  return (
    <div
      onDoubleClick={handleOpenModal}
      onKeyDown={handleKeyDown}
      className={`erp-lookup-wrapper ${className}`}
    >
      <Select
        ref={selectRef}
        showSearch
        placeholder={placeholder}
        disabled={disabled}
        value={value || undefined}
        onSearch={fetchOptions}
        onFocus={() => {
          if (options.length <= 1) {
            fetchOptions();
          }
        }}
        filterOption={(input, option) =>
          String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
        }
        onChange={(val) => {
          const selectedOpt = options.find((o) => o.value === val);
          if (onChange && selectedOpt) {
            onChange(val, selectedOpt.record);
          } else if (onChange) {
            onChange(val, null);
          }
        }}
        suffixIcon={
          <SearchOutlined
            className="erp-lookup-icon"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenModal();
            }}
            style={{ cursor: 'pointer' }}
          />
        }
        notFoundContent={loading ? <Spin size="small" /> : '關聯作業目前沒有可選資料'}
        style={{ width: '100%' }}
        {...rest}
      >
        {options.map((opt) => (
          <Option key={opt.value} value={opt.value} label={opt.label}>
            {opt.label}
          </Option>
        ))}
      </Select>

      <ERPLookupModal
        type={type}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onSelect={handleModalSelect}
        apiBase={apiBase}
        queryParams={queryParams}
        title={title || lookupTitle}
      />
    </div>
  );
}
