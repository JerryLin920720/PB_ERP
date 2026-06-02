import React, { useState } from 'react';
import { Upload, message, Button, Spin } from 'antd';
import { UploadOutlined, DeleteOutlined, PaperClipOutlined, LoadingOutlined } from '@ant-design/icons';
import axios from 'axios';
import '../../../styles/erp-media-components.css';

export default function ERPFileField({ value, onChange, disabled = false, accept }) {
  const [uploading, setUploading] = useState(false);

  const handleCustomRequest = async ({ file, onSuccess, onError }) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'multipart/form-data',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.post('/api/uploads/images/', formData, { headers });
      if (response.data && response.data.url) {
        onSuccess(response.data);
        onChange(response.data.url);
        message.success('檔案上傳成功！');
      } else {
        throw new Error('未收到檔案連結');
      }
    } catch (err) {
      console.error(err);
      onError(err);
      const errMsg = err.response?.data?.detail || err.message || '上傳失敗';
      message.error(`上傳失敗: ${errMsg}`);
    } finally {
      setUploading(false);
    }
  };

  const getFileName = (url) => {
    if (!url) return '';
    try {
      const parts = url.split('/');
      return parts[parts.length - 1];
    } catch (e) {
      return url;
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className="erp-file-field">
      {value ? (
        <div className="erp-file-preview-container">
          <PaperClipOutlined style={{ marginRight: '6px', color: '#3b82f6' }} />
          <a href={value} target="_blank" rel="noopener noreferrer" className="erp-file-link" title={value}>
            {getFileName(value)}
          </a>
          {!disabled && (
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={handleClear}
              size="small"
              style={{ marginLeft: '8px', padding: '0 4px', height: '20px', minWidth: '20px' }}
            />
          )}
        </div>
      ) : (
        <Upload
          accept={accept}
          customRequest={handleCustomRequest}
          showUploadList={false}
          disabled={disabled || uploading}
        >
          <Button 
            icon={uploading ? <Spin indicator={<LoadingOutlined style={{ fontSize: 13 }} spin />} /> : <UploadOutlined />}
            size="small"
            disabled={disabled || uploading}
          >
            {uploading ? '上傳中...' : '選擇檔案'}
          </Button>
        </Upload>
      )}
    </div>
  );
}
