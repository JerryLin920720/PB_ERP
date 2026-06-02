import React, { useState } from 'react';
import { Upload, message, Button, Spin } from 'antd';
import { UploadOutlined, DeleteOutlined, LoadingOutlined } from '@ant-design/icons';
import axios from 'axios';
import ERPImagePreview from './ERPImagePreview';
import '../../../styles/erp-media-components.css';

export default function ERPImageUploadField({ value, onChange, disabled = false }) {
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

      // Upload via shared endpoint
      const response = await axios.post('/api/uploads/images/', formData, { headers });
      if (response.data && response.data.url) {
        onSuccess(response.data);
        onChange(response.data.url);
        message.success('圖片上傳成功！');
      } else {
        throw new Error('未收到圖片連結');
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

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className="erp-image-upload-field">
      {value ? (
        <div className="erp-image-upload-preview-container">
          <ERPImagePreview src={value} width={40} height={40} />
          <div className="erp-image-upload-actions">
            {!disabled && (
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />} 
                onClick={handleClear}
                size="small"
                title="刪除圖片"
                style={{ padding: '0 4px', height: '24px', minWidth: '24px' }}
              />
            )}
          </div>
        </div>
      ) : (
        <Upload
          accept="image/*"
          customRequest={handleCustomRequest}
          showUploadList={false}
          disabled={disabled || uploading}
        >
          <Button 
            icon={uploading ? <Spin indicator={<LoadingOutlined style={{ fontSize: 13 }} spin />} /> : <UploadOutlined />}
            size="small"
            disabled={disabled || uploading}
          >
            {uploading ? '上傳中...' : '上傳圖片'}
          </Button>
        </Upload>
      )}
    </div>
  );
}
