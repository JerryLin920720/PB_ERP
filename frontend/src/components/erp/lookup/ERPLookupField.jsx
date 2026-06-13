import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Select, Spin, message } from 'antd';
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
  readOnly = false,
  apiBase = '',
  form,
  returnFields,
  lookupConfig,
  queryParams = {},
  contextValues = {},
  className = '',
  title,
  lookupTitle,
  ...rest
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  // 整合 lookupConfig (優先順序: props.lookupConfig > programRegistry > lookupRegistry)
  const config = lookupConfig || lookupRegistry[type];
  const selectRef = useRef(null);

  const serializedQueryParams = useMemo(() => JSON.stringify(queryParams || {}), [queryParams]);
  const queryParamsMemo = useMemo(() => JSON.parse(serializedQueryParams), [serializedQueryParams]);

  // 處理 cascading (dependsOn) 邏輯
  const getDynamicQueryParams = useCallback(() => {
    if (!config || !config.dependsOn) return { params: {}, missingRequired: null };

    const deps = Array.isArray(config.dependsOn) ? config.dependsOn : [config.dependsOn];
    const dynamicParams = {};
    let missingRequired = null;

    for (const dep of deps) {
      let val = undefined;
      // 依序嘗試從 contextValues, form 取值
      if (contextValues && contextValues[dep.sourceField] !== undefined) {
        val = contextValues[dep.sourceField];
      } else if (form) {
        val = form.getFieldValue(dep.sourceField);
      }

      if (val !== undefined && val !== null && val !== '') {
        dynamicParams[dep.queryParam || dep.sourceField] = val;
      } else if (dep.required) {
        missingRequired = dep.message || `請先選擇/輸入 ${dep.sourceField} 的值`;
        break;
      }
    }

    return { params: dynamicParams, missingRequired };
  }, [config, contextValues, form]);

  const dynamicQueryParams = getDynamicQueryParams().params;
  const missingRequired = getDynamicQueryParams().missingRequired;

  const finalQueryParams = useMemo(() => ({
    ...queryParamsMemo,
    ...dynamicQueryParams
  }), [queryParamsMemo, JSON.stringify(dynamicQueryParams)]);


  // Reset options cache when queryParams change
  useEffect(() => {
    setOptions([]);
  }, [serializedQueryParams, JSON.stringify(dynamicQueryParams)]);

  // Fetch initial option dynamically if value is set but not in current options
  const fetchSingleOption = useCallback(async (val) => {
    if (!config || !val || String(val).startsWith('temp_')) return;
    try {
      const url = `${getFullUrl(config.apiUrl)}${val}/`;
      const res = await axios.get(url, { params: finalQueryParams });
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
  }, [config, finalQueryParams]);

  // Load dynamic list (top 50)
  const fetchOptions = useCallback(async (search = '') => {
    if (!config) return;
    if (getDynamicQueryParams().missingRequired) return;
    setLoading(true);
    try {
      const params = { ...finalQueryParams };
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
  }, [config, finalQueryParams]);

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
    if (missingRequired) {
      message.warning(missingRequired);
      return;
    }
    setModalVisible(true);
  };

  // Keyboard listener for F2
  const handleKeyDown = (e) => {
    if (disabled || readOnly) return;
    if (e.key === 'F2' || e.keyCode === 113) {
      e.preventDefault();
      e.stopPropagation();
      handleOpenModal();
    }
  };

  // Handlers for modal selection
  const handleModalSelect = (record) => {
    setModalVisible(false);
    if (config) {
      const val = record[config.returnValue || 'gkey'];
      const lbl = record[config.displayField] || val;
      
      setOptions((prev) => {
        if (prev.some((o) => o.value === val)) return prev;
        return [...prev, { value: val, label: lbl, record }];
      });
      
      if (form && returnFields && record) {
        const updates = {};
        for (const [targetField, sourceField] of Object.entries(returnFields)) {
          if (record[sourceField] !== undefined) {
            updates[targetField] = record[sourceField];
          }
        }
        form.setFieldsValue(updates);
      }
      
      if (onChange) {
        onChange(val, record);
      }
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
        onInputKeyDown={handleKeyDown}
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
          const record = selectedOpt ? selectedOpt.record : null;
          
          if (form && returnFields && record) {
            const updates = {};
            for (const [targetField, sourceField] of Object.entries(returnFields)) {
              if (record[sourceField] !== undefined) {
                updates[targetField] = record[sourceField];
              }
            }
            form.setFieldsValue(updates);
          }
          
          if (onChange) {
            onChange(val, record);
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
        queryParams={finalQueryParams}
        title={title || lookupTitle}
        lookupConfig={config}
      />
    </div>
  );
}
