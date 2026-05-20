import React from 'react';
import './FlowMap.css';

export default function FlowMap({ onOpenSheet }) {
  // Group 1: Static dictionaries (4 columns x 5 rows exactly matching screenshot)
  const topButtons = [
    { id: 'ba001', label: '個人片語字庫' },
    { id: 'ba040', label: '銀行資料' },
    { id: 'ba055', label: '季節設定' },
    { id: 'ba045', label: '部門設定' },
    
    { id: 'ba002', label: '國家設定' },
    { id: 'ba065', label: '交易港口' },
    { id: 'ba080', label: '配件設定' },
    { id: 'ba050', label: '職務設定' },
    
    { id: 'ba003', label: '產地設定' },
    { id: 'ba070', label: '交易條件' },
    { id: 'ba085', label: 'Size Run設定' },
    { id: 'ba004', label: '地區設定' },
    
    { id: 'ba090', label: '快遞公司' },
    { id: 'ba075', label: '付款條件' },
    { id: 'ba009', label: '品牌設定' },
    { id: 'ba005', label: '公司資料' },
    
    { id: 'ba092', label: '單位設定' },
    { id: 'ba091', label: '運輸方式' },
    { id: 'ba020', label: '材料供應商類別' },
    { id: 'es101', label: '員工基本資料' }
  ];

  // Group 2: The core physical entities at bottom (4 horizontal large buttons)
  const bottomButtons = [
    { id: 'ba010', label: '客戶資料管理' },
    { id: 'ba015', label: '工廠資料管理' },
    { id: 'ba025', label: '材料商資料管理' },
    { id: 'ba030', label: '供應商資料管理' }
  ];

  return (
    <div className="pb-flowchart-canvas">
      <div className="pb-flowchart-content">
        
        {/* Top Main GroupBox Area */}
        <div className="flowchart-group-box">
          <div className="group-box-grid">
            {topButtons.map((btn, i) => (
              <button 
                key={i} 
                className="pb-win32-btn dictionary-btn"
                onClick={() => onOpenSheet && onOpenSheet(btn.id)}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Connector Lines Area (Using pure CSS borders) */}
        <div className="connector-lines-container">
          <div className="vertical-main-stem"></div>
          <div className="horizontal-branch-line"></div>
          <div className="vertical-four-stems">
            <div className="stem-line"></div>
            <div className="stem-line"></div>
            <div className="stem-line"></div>
            <div className="stem-line"></div>
          </div>
        </div>

        {/* Bottom Core Buttons Area */}
        <div className="flowchart-bottom-row">
          {bottomButtons.map((btn, i) => (
            <button 
              key={i} 
              className="pb-win32-btn core-entity-btn"
              onClick={() => onOpenSheet && onOpenSheet(btn.id)}
            >
              {btn.label}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
