import React from 'react';
import './DpFlowMap.css';

export default function DpFlowMap({ onOpenSheet }) {
  return (
    <div className="pb-dp-flow-container">
      <div className="pb-dp-flow-content">
        
        {/* 🎨 Vector Schematic SVG Layer for PowerBuilder Lines */}
        <svg className="dp-flow-svg-bg" width="1000" height="650">
          {/* Top Auxiliary Dictionaries Connections */}
          {/* Row 1 horizontal trunk */}
          <line x1="110" y1="37" x2="450" y2="37" stroke="#85a3b2" strokeWidth="2.5" />
          {/* Row 1 central down stem */}
          <line x1="280" y1="37" x2="280" y2="73" stroke="#85a3b2" strokeWidth="2.5" />
          {/* Vertical down trunk from Row 1 to Row 2 connector */}
          <line x1="375" y1="73" x2="375" y2="127" stroke="#85a3b2" strokeWidth="2.5" />

          {/* Row 2 horizontal trunk */}
          <line x1="75" y1="127" x2="775" y2="127" stroke="#85a3b2" strokeWidth="2.5" />
          {/* Main vertical stem down to Center Backbone */}
          <line x1="375" y1="127" x2="375" y2="410" stroke="#85a3b2" strokeWidth="2.5" />

          {/* Left Column Tree branches */}
          {/* Vertical collector on the right of Left Column */}
          <line x1="220" y1="250" x2="220" y2="570" stroke="#85a3b2" strokeWidth="2.5" />
          {/* Left buttons spurs to vertical collector */}
          <line x1="170" y1="250" x2="220" y2="250" stroke="#85a3b2" strokeWidth="2.5" />
          <line x1="170" y1="330" x2="220" y2="330" stroke="#85a3b2" strokeWidth="2.5" />
          <line x1="170" y1="410" x2="220" y2="410" stroke="#85a3b2" strokeWidth="2.5" />
          <line x1="170" y1="490" x2="220" y2="490" stroke="#85a3b2" strokeWidth="2.5" />
          <line x1="170" y1="570" x2="220" y2="570" stroke="#85a3b2" strokeWidth="2.5" />
          {/* Horizontal connection from Left collector to main vertical stem */}
          <line x1="220" y1="410" x2="375" y2="410" stroke="#85a3b2" strokeWidth="2.5" />

          {/* Center Column 1 spurs */}
          <line x1="280" y1="255" x2="375" y2="255" stroke="#85a3b2" strokeWidth="2.5" />
          <line x1="280" y1="355" x2="375" y2="355" stroke="#85a3b2" strokeWidth="2.5" />
          <line x1="280" y1="455" x2="375" y2="455" stroke="#85a3b2" strokeWidth="2.5" />
          <line x1="280" y1="555" x2="375" y2="555" stroke="#85a3b2" strokeWidth="2.5" />

          {/* Center Column 2 Tree branches */}
          {/* Vertical collector on the left of Center Column 2 */}
          <line x1="500" y1="255" x2="500" y2="555" stroke="#85a3b2" strokeWidth="2.5" />
          {/* Right spurs from collector to Center Column 2 buttons */}
          <line x1="500" y1="255" x2="530" y2="255" stroke="#85a3b2" strokeWidth="2.5" />
          <line x1="500" y1="355" x2="530" y2="355" stroke="#85a3b2" strokeWidth="2.5" />
          <line x1="500" y1="455" x2="530" y2="455" stroke="#85a3b2" strokeWidth="2.5" />
          <line x1="500" y1="555" x2="530" y2="555" stroke="#85a3b2" strokeWidth="2.5" />
          {/* Horizontal connection from Center 2 collector to main vertical stem */}
          <line x1="375" y1="410" x2="500" y2="410" stroke="#85a3b2" strokeWidth="2.5" />

          {/* Right Column Frame Box connection */}
          <line x1="500" y1="410" x2="760" y2="410" stroke="#85a3b2" strokeWidth="2.5" />
        </svg>

        {/* ------------------ TOP SECTION: AUXILIARY DICTIONARIES ------------------ */}
        
        {/* ROW 1 (Y = 20px) */}
        <button className="pb-classic-btn btn-row1" style={{ left: '50px', top: '20px' }} onClick={() => onOpenSheet('dp003')}>
          鞋種類別設定
        </button>
        <button className="pb-classic-btn btn-row1" style={{ left: '220px', top: '20px' }} onClick={() => onOpenSheet('dp005')}>
          部位類別設定
        </button>
        <button className="pb-classic-btn btn-row1" style={{ left: '390px', top: '20px' }} onClick={() => onOpenSheet('dp006')}>
          部位資料設定
        </button>

        {/* ROW 2 (Y = 110px) */}
        <button className="pb-classic-btn btn-row2" style={{ left: '15px', top: '110px' }} onClick={() => onOpenSheet('dp001')}>
          開發片語字庫
        </button>
        <button className="pb-classic-btn btn-row2" style={{ left: '155px', top: '110px' }} onClick={() => onOpenSheet('dp007')}>
          鞋種部位設定
        </button>
        <button className="pb-classic-btn btn-row2" style={{ left: '295px', top: '110px' }} onClick={() => onOpenSheet('dp002')}>
          樣品類別設定
        </button>
        <button className="pb-classic-btn btn-row2" style={{ left: '435px', top: '110px' }} onClick={() => onOpenSheet('dp004')}>
          鞋種Gender設定
        </button>
        <button className="pb-classic-btn btn-row2" style={{ left: '575px', top: '110px' }} onClick={() => onOpenSheet('dp008')}>
          SockLable設定
        </button>
        <button className="pb-classic-btn btn-row2" style={{ left: '715px', top: '110px' }} onClick={() => onOpenSheet('dp009')}>
          部件加工設定
        </button>

        {/* ------------------ BOTTOM SECTION: 4-COLUMN SCHEMATICS ------------------ */}

        {/* LEFT COLUMN (楦底結構主檔) */}
        <button className="pb-classic-btn btn-col-left" style={{ left: '10px', top: '230px' }} onClick={() => onOpenSheet('dp023')}>
          組別設定
        </button>
        <button className="pb-classic-btn btn-col-left" style={{ left: '10px', top: '310px' }} onClick={() => onOpenSheet('dp010')}>
          楦頭基本資料管理
        </button>
        <button className="pb-classic-btn btn-col-left" style={{ left: '10px', top: '390px' }} onClick={() => onOpenSheet('dp015')}>
          大底基本資料管理
        </button>
        <button className="pb-classic-btn btn-col-left" style={{ left: '10px', top: '470px' }} onClick={() => onOpenSheet('dp020')}>
          鞋跟基本資料管理
        </button>
        <button className="pb-classic-btn btn-col-left" style={{ left: '10px', top: '550px' }} onClick={() => onOpenSheet('dp025')}>
          型體資料管理
        </button>

        {/* CENTER COLUMN 1 (樣品指令管理) */}
        <button className="pb-classic-btn btn-col-mid1" style={{ left: '280px', top: '230px' }} onClick={() => onOpenSheet('dp030')}>
          樣品單資料管理
        </button>
        <button className="pb-classic-btn btn-col-mid1" style={{ left: '280px', top: '330px' }} onClick={() => onOpenSheet('dp040')}>
          樣品寄出資料管理
        </button>
        <button className="pb-classic-btn btn-col-mid1" style={{ left: '280px', top: '430px' }} onClick={() => onOpenSheet('dp055')}>
          樣品成本核算管理
        </button>
        <button className="pb-classic-btn btn-col-mid1" style={{ left: '280px', top: '530px' }} onClick={() => onOpenSheet('dp035')}>
          樣品Lable資料管理
        </button>

        {/* CENTER COLUMN 2 (意見書/審核反饋) */}
        <button className="pb-classic-btn btn-col-mid2" style={{ left: '530px', top: '230px' }} onClick={() => onOpenSheet('dp050')}>
          樣品單狀態審核
        </button>
        <button className="pb-classic-btn btn-col-mid2" style={{ left: '530px', top: '330px' }} onClick={() => onOpenSheet('dp080')}>
          FittingSample意見書
        </button>
        <button className="pb-classic-btn btn-col-mid2" style={{ left: '530px', top: '430px' }} onClick={() => onOpenSheet('dp085')}>
          CFMSample意見書
        </button>
        <button className="pb-classic-btn btn-col-mid2" style={{ left: '530px', top: '530px' }} onClick={() => onOpenSheet('dp100')}>
          開發費用轉嫁管理
        </button>

        {/* RIGHT COLUMN (進度與量產查詢 - IN A DISTINCT GREY FRAME BOX) */}
        <div className="pb-classic-frame" style={{ left: '760px', top: '215px', width: '215px', height: '420px' }}>
          <button className="pb-classic-btn btn-col-right" style={{ left: '17px', top: '25px', width: '180px' }} onClick={() => onOpenSheet('dp032')}>
            Outstanding Sample List
          </button>
          <button className="pb-classic-btn btn-col-right" style={{ left: '17px', top: '90px', width: '180px' }} onClick={() => onOpenSheet('dp095')}>
            樣品進度管理查詢
          </button>
          <button className="pb-classic-btn btn-col-right" style={{ left: '17px', top: '155px', width: '180px' }} onClick={() => onOpenSheet('dp070')}>
            樣品數量統計查詢
          </button>
          <button className="pb-classic-btn btn-col-right" style={{ left: '17px', top: '220px', width: '180px' }} onClick={() => onOpenSheet('dp075')}>
            大底攤銷資料管理
          </button>
          <button className="pb-classic-btn btn-col-right" style={{ left: '17px', top: '285px', width: '180px' }} onClick={() => onOpenSheet('dp060')}>
            大底量產統計查詢
          </button>
          <button className="pb-classic-btn btn-col-right" style={{ left: '17px', top: '350px', width: '180px' }} onClick={() => onOpenSheet('dp065')}>
            型體量產統計查詢
          </button>
        </div>

      </div>
    </div>
  );
}
