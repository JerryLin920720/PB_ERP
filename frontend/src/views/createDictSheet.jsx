import React from 'react';
import Win32DataWindow from '../components/Win32DataWindow';

/**
 * 通用字典作業視窗產生器 (Generic Dictionary Sheet Factory)
 * 
 * 所有單一 Grid 行內編輯的靜態字典都共用此結構，
 * 僅需傳入 config 即可 100% 動態渲染出完整的作業畫面。
 */
export default function createDictSheet({ sheetId, title, icon, breadcrumb, columns, apiUrl }) {
  return function DictSheet() {
    return (
      <div className="modern-sheet-container">
        <div className="sheet-modern-header" style={{
          height: '52px', borderBottom: '1px solid var(--border-color)', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', backgroundColor: '#fafbfc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>{icon}</span>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text-main)', letterSpacing: '0.5px' }}>
              {title} <span style={{ color: 'var(--text-muted)', fontWeight: '400', fontSize: '14px', marginLeft: '6px' }}>[{sheetId}]</span>
            </h2>
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: '500' }}>
            {breadcrumb}
          </div>
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <Win32DataWindow 
            columns={columns}
            apiUrl={apiUrl}
            title={`${sheetId}--${title}`}
            sheetId={sheetId}
          />
        </div>
      </div>
    );
  };
}
