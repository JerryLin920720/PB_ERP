import React from 'react';
import Win32DataWindow from '../components/Win32DataWindow';

export default function Ba001Sheet() {
  // 1. 定義 ba001 欄位配置對象
  const columns = [
    { key: 'serialno', label: '流水號', width: '100px', editable: false, type: 'number' },
    { key: 'description', label: '片語說明', width: '420px', editable: true, type: 'string' },
    { key: 'f2type', label: '類別代號', width: '120px', editable: true, type: 'string' }
  ];

  // API 路由，對接 Django 後端 (對接 8001 埠)
  const apiUrl = 'http://localhost:8001/api/ba001/';

  return (
    <div className="modern-sheet-container">
      {/* 現代化頁面標題 (SaaS Style Page Header) - 取代舊式 Windows 窗體列 */}
      <div className="sheet-modern-header" style={{
        height: '52px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        backgroundColor: '#fafbfc'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>📋</span>
          <h2 style={{ 
            margin: 0, 
            fontSize: '16px', 
            fontWeight: '600', 
            color: 'var(--text-main)',
            letterSpacing: '0.5px'
          }}>
            個人片語字庫設定 <span style={{ color: 'var(--text-muted)', fontWeight: '400', fontSize: '14px', marginLeft: '6px' }}>[ba001]</span>
          </h2>
        </div>
        
        {/* 工具標籤或麵包屑 */}
        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: '500' }}>
          基本資料管理 &gt; 個人片語
        </div>
      </div>

      {/* 主體嵌入優質 DataWindow 引擎 */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Win32DataWindow 
          columns={columns}
          apiUrl={apiUrl}
          title="ba001--個人片語字庫設定"
          sheetId="ba001"
        />
      </div>
    </div>
  );
}
