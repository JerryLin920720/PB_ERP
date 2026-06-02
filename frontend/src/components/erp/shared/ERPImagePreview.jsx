import React from 'react';
import { Image } from 'antd';
import { PictureOutlined } from '@ant-design/icons';
import '../../../styles/erp-media-components.css';

export default function ERPImagePreview({ src, width = 40, height = 40, fallback = '' }) {
  if (!src) {
    return (
      <div className="erp-image-placeholder" style={{ width, height }}>
        <PictureOutlined style={{ fontSize: '16px', color: '#ccc' }} />
      </div>
    );
  }

  return (
    <div className="erp-image-preview-wrapper">
      <Image
        src={src}
        width={width}
        height={height}
        style={{ objectFit: 'cover', borderRadius: '4px', display: 'block' }}
        fallback={fallback || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%23ccc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>'}
        placeholder={
          <div className="erp-image-placeholder-loading" style={{ width, height }}>
            ...
          </div>
        }
      />
    </div>
  );
}
