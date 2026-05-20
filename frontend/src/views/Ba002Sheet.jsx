import React from 'react';
import Win32DataWindow from '../components/Win32DataWindow';

export default function Ba002Sheet() {
  const columns = [
    { key: 'serialno', label: '流水號', width: '100px', editable: false, type: 'number' },
    { key: 'ccountry', label: '國家名稱(中)', width: '260px', editable: true, type: 'string' },
    { key: 'ecountry', label: '國家名稱(英)', width: '260px', editable: true, type: 'string' }
  ];

  const apiUrl = 'http://localhost:8001/api/ba002/';

  return (
    <div className="modern-sheet-container">
      {/* Header */}
      <div className="sheet-modern-header" style={{
        height: '52px', borderBottom: '1px solid var(--border-color)', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', backgroundColor: '#fafbfc'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>🌍</span>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text-main)', letterSpacing: '0.5px' }}>
            國家設定檔 <span style={{ color: 'var(--text-muted)', fontWeight: '400', fontSize: '14px', marginLeft: '6px' }}>[ba002]</span>
          </h2>
        </div>
        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: '500' }}>
          基本資料管理 &gt; 國家設定
        </div>
      </div>

      {/* DataWindow Control Engine */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Win32DataWindow 
          columns={columns}
          apiUrl={apiUrl}
          title="ba002--國家設定"
          sheetId="ba002"
        />
      </div>
    </div>
  );
}
