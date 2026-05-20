import React from 'react';
import Win32DataWindow from '../components/Win32DataWindow';

export default function Ba004Sheet() {
  const columns = [
    { key: 'serialno', label: '流水號', width: '80px', editable: false, type: 'number' },
    { key: 'areacode', label: '區域代號', width: '120px', editable: true, type: 'string' },
    { key: 'carea', label: '區域名稱(中)', width: '220px', editable: true, type: 'string' },
    { key: 'earea', label: '區域名稱(英)', width: '220px', editable: true, type: 'string' }
  ];

  const apiUrl = 'http://localhost:8001/api/ba004/';

  return (
    <div className="modern-sheet-container">
      {/* Header */}
      <div className="sheet-modern-header" style={{
        height: '52px', borderBottom: '1px solid var(--border-color)', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', backgroundColor: '#fafbfc'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>🗺️</span>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text-main)', letterSpacing: '0.5px' }}>
            區域設定檔 <span style={{ color: 'var(--text-muted)', fontWeight: '400', fontSize: '14px', marginLeft: '6px' }}>[ba004]</span>
          </h2>
        </div>
        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: '500' }}>
          基本資料管理 &gt; 區域設定
        </div>
      </div>

      {/* DataWindow Control Engine */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Win32DataWindow 
          columns={columns}
          apiUrl={apiUrl}
          title="ba004--區域設定"
          sheetId="ba004"
        />
      </div>
    </div>
  );
}
