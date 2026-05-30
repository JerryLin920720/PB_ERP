import React from 'react';
import { Form, Spin, Button, Space, Table, message } from 'antd';
import axios from 'axios';
import ERPSheetPage from '../shell/ERPSheetPage';
import ERPQueryListLayout from '../layout/ERPQueryListLayout';

/**
 * createQueryListSheet
 *
 * Pattern C: Query/List/Report Sheet.
 *
 * This factory intentionally extracts the query-list part from Pattern B
 * createRecordWorkbenchSheet:
 * - ERPSheetPage header / breadcrumb / [SheetId] title
 * - 查詢列表 tab
 * - queryPanel render contract
 * - 清除條件 / 查詢 buttons
 * - result list area
 * - MDI retrieve / save / reset command
 *
 * It intentionally does NOT include:
 * - 編輯維護 tab
 * - sidebar
 * - master form
 * - detail tabs
 * - deep_save
 */
export default function createQueryListSheet(config) {
  const {
    sheetId,
    title,
    breadcrumb,
    api = {},
    query = {},
    list = {},
    layout = {},
    renderQueryForm,
    renderResult,
    onSave,
    onReset,
    afterRetrieve,
    initialContext,
    mainClassName,
  } = config;

  const rowKey = list.rowKey || 'gkey';
  const pageSize = list.pageSize || 50;
  const queryResultHeight =
    layout.queryResultHeight !== undefined ? layout.queryResultHeight : 360;

  return function QueryListSheet() {
    const [searchForm] = Form.useForm();
    const [rows, setRows] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [queryParams, setQueryParams] = React.useState({});
    const [context, setContext] = React.useState(() => {
      if (typeof initialContext === 'function') return initialContext();
      return initialContext || {};
    });

    const normalizeRows = React.useCallback((payload) => {
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.results)) return payload.results;
      if (Array.isArray(payload?.data)) return payload.data;
      return [];
    }, []);

    const getErrorMessage = React.useCallback((error, fallback) => {
      const data = error?.response?.data;

      if (typeof data?.detail === 'string') return data.detail;
      if (typeof data === 'string') return data;

      if (data && typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        const firstValue = data[firstKey];
        if (Array.isArray(firstValue)) return `${firstKey}: ${firstValue.join('、')}`;
        if (typeof firstValue === 'string') return `${firstKey}: ${firstValue}`;
      }

      return fallback;
    }, []);

    const buildParams = React.useCallback(() => {
      const vals = searchForm.getFieldsValue();
      if (typeof query.buildParams === 'function') {
        return query.buildParams(vals, context);
      }
      return vals;
    }, [searchForm, query, context]);

    const retrieve = React.useCallback(
      async (explicitParams) => {
        const params = explicitParams || buildParams();
        setQueryParams(params);
        setLoading(true);

        try {
          if (!api.queryUrl) {
            throw new Error('Pattern C missing api.queryUrl');
          }

          const method = (api.method || 'get').toLowerCase();
          const res =
            method === 'post'
              ? await axios.post(api.queryUrl, params)
              : await axios.get(api.queryUrl, { params });

          const nextRows = normalizeRows(res.data);
          setRows(nextRows);

          if (typeof afterRetrieve === 'function') {
            afterRetrieve({ rows: nextRows, setRows, context, setContext });
          }

          return nextRows;
        } catch (error) {
          message.error(`查詢失敗：${getErrorMessage(error, '請檢查查詢條件或聯絡系統管理員')}`);
          throw error;
        } finally {
          setLoading(false);
        }
      },
      [api, buildParams, normalizeRows, afterRetrieve, context, getErrorMessage]
    );

    const handleSearchSubmit = React.useCallback(() => {
      retrieve();
    }, [retrieve]);

    const handleClear = React.useCallback(() => {
      searchForm.resetFields();
      setQueryParams({});
      setRows([]);
      if (typeof onReset === 'function') {
        onReset({ form: searchForm, setRows, context, setContext });
      }
    }, [searchForm, onReset, context]);

    const handleSave = React.useCallback(async () => {
      if (typeof onSave !== 'function') {
        message.info('此作業沒有需要儲存的資料');
        return;
      }

      setSaving(true);
      try {
        await onSave({ rows, setRows, context, setContext, retrieve, form: searchForm });
      } catch (error) {
        message.error(`儲存失敗：${getErrorMessage(error, '請稍後再試或聯絡系統管理員')}`);
      } finally {
        setSaving(false);
      }
    }, [onSave, rows, context, retrieve, searchForm, getErrorMessage]);

    React.useEffect(() => {
      const handleGlobalCommand = (event) => {
        const { targetSheet, action } = event.detail || {};
        if (targetSheet !== sheetId) return;

        if (action === 'retrieve') {
          retrieve();
          return;
        }

        if (action === 'save') {
          handleSave();
          return;
        }

        if (action === 'reset' || action === 'undo') {
          handleClear();
          return;
        }

        if (['add', 'edit', 'delete'].includes(action)) {
          message.info(`${sheetId.toUpperCase()} 不支援此操作`);
        }
      };

      window.addEventListener('mdi-global-command', handleGlobalCommand);
      return () => window.removeEventListener('mdi-global-command', handleGlobalCommand);
    }, [sheetId, retrieve, handleSave, handleClear]);

    const queryPanel = (
      <Form
        form={searchForm}
        layout="vertical"
        size="small"
        onFinish={handleSearchSubmit}
        onValuesChange={() => {
          const params = buildParams();
          setQueryParams(params);
        }}
      >
        {renderQueryForm && renderQueryForm({ form: searchForm, context, setContext })}
        <div className="erp-qrs-query-actions">
          <Space>
            <Button
              size="small"
              type="default"
              onClick={handleClear}
            >
              清除條件
            </Button>
            <Button size="small" type="primary" htmlType="submit" loading={loading}>
              查詢
            </Button>
            {typeof onSave === 'function' && (
              <Button size="small" onClick={handleSave} loading={saving}>
                儲存
              </Button>
            )}
          </Space>
        </div>
      </Form>
    );

    const defaultResult = (
      <Table
        size="small"
        dataSource={rows}
        columns={list.columns || []}
        rowKey={rowKey}
        pagination={{ pageSize, size: 'small' }}
        bordered
        scroll={queryResultHeight ? { y: queryResultHeight, x: 'max-content' } : undefined}
      />
    );

    const resultContent = renderResult
      ? renderResult({ rows, setRows, loading, context, setContext, retrieve, form: searchForm })
      : defaultResult;

    return (
      <ERPSheetPage sheetId={sheetId} title={title} breadcrumb={breadcrumb}>
        <Spin spinning={loading || saving}>
          <ERPQueryListLayout
            queryPanel={queryPanel}
            resultContent={resultContent}
            mainClassName={mainClassName}
            layout={layout}
          />
        </Spin>
      </ERPSheetPage>
    );
  };
}
