import React, { useState } from 'react';
import { Modal, Select, Button, Form, message, Space, Spin } from 'antd';
import { FilePdfOutlined, FileExcelOutlined, PrinterOutlined } from '@ant-design/icons';
import axios from 'axios';

export default function ReportModal({
  visible,
  onClose,
  reportConfig,
  activeRecord,
  queryParams,
  isDirty,
  defaultAction = 'preview' // preview, export, print
}) {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  
  if (!reportConfig || !reportConfig.enabled) {
    return null; // or could render an empty modal
  }

  const reports = reportConfig.reports || [];
  
  // if only one report, default select it
  const initialValues = {
    report_key: reports.length === 1 ? reports[0].key : undefined,
    format: reportConfig.defaultFormat || 'pdf'
  };

  const handleExecute = async () => {
    try {
      const values = await form.validateFields();
      const selectedReport = reports.find(r => r.key === values.report_key);
      
      if (!selectedReport) return;

      if (selectedReport.requiresSelection && (!activeRecord || !activeRecord.gkey)) {
        message.warning('此報表需要選取一筆單據資料');
        return;
      }
      
      if (isDirty) {
        // Just warning but not block, could use a confirm dialog in the future
        message.warning('注意：目前有未存檔的變更，報表可能不會反映最新內容');
      }

      setLoading(true);

      const payload = {
        report_key: values.report_key,
        format: values.format,
        mode: selectedReport.mode,
        record_id: activeRecord ? activeRecord.gkey : null,
        query: queryParams || {}
      };

      const res = await axios.post(reportConfig.endpoint || '/api/common/report/', payload, {
        responseType: 'blob' // we expect binary data (pdf or excel)
      });

      const blob = new Blob([res.data], { 
        type: values.format === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
          : 'application/pdf' 
      });
      const url = window.URL.createObjectURL(blob);
      
      if (values.format === 'pdf' && defaultAction === 'preview') {
        window.open(url, '_blank');
      } else {
        // download
        const link = document.createElement('a');
        link.href = url;
        const filename = `${selectedReport.label}_${new Date().getTime()}.${values.format === 'excel' ? 'xlsx' : 'pdf'}`;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
      }
      
      // Cleanup
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      onClose();

    } catch (err) {
      console.error(err);
      if (err.response && err.response.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          const json = JSON.parse(text);
          message.error('報表產生失敗：' + (json.detail || json.message || '未知錯誤'));
        } catch {
          message.error('報表產生失敗');
        }
      } else {
        message.error('報表產生失敗');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={<span><PrinterOutlined /> 報表列印</span>}
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={loading}>
          取消
        </Button>,
        <Button 
          key="execute" 
          type="primary" 
          onClick={handleExecute} 
          loading={loading}
          icon={defaultAction === 'export' ? <FileExcelOutlined /> : <FilePdfOutlined />}
        >
          {defaultAction === 'export' ? '匯出' : '產生報表'}
        </Button>
      ]}
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" initialValues={initialValues}>
          <Form.Item 
            label="選擇報表" 
            name="report_key" 
            rules={[{ required: true, message: '請選擇報表' }]}
          >
            <Select placeholder="請選擇報表類型">
              {reports.map(r => (
                <Select.Option key={r.key} value={r.key}>
                  {r.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item 
            label="輸出格式" 
            name="format" 
            rules={[{ required: true, message: '請選擇格式' }]}
          >
            <Select>
              <Select.Option value="pdf"><FilePdfOutlined /> PDF 文件</Select.Option>
              <Select.Option value="excel"><FileExcelOutlined /> Excel 試算表</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
}
