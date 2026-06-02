import React, { useState, useEffect, useRef } from 'react';
import '../../../styles/erp-split-grid-layout.css';

export default function ERPSplitGridLayout({ leftPanel, rightPanel, defaultSplit = 50, minWidth = 200 }) {
  const containerRef = useRef(null);
  const [splitWidth, setSplitWidth] = useState(defaultSplit); // percentage
  const [isDragging, setIsDragging] = useState(false);

  const startResize = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidthPx = e.clientX - containerRect.left;
      let newWidthPct = (newWidthPx / containerRect.width) * 100;

      // boundaries check
      const minPct = (minWidth / containerRect.width) * 100;
      const maxPct = 100 - minPct;

      if (newWidthPct < minPct) newWidthPct = minPct;
      if (newWidthPct > maxPct) newWidthPct = maxPct;

      setSplitWidth(newWidthPct);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, minWidth]);

  return (
    <div className="erp-split-layout-container" ref={containerRef}>
      <div 
        className="erp-split-left-panel" 
        style={{ width: `${splitWidth}%` }}
      >
        {leftPanel}
      </div>
      <div 
        className={`erp-split-resizer ${isDragging ? 'is-dragging' : ''}`}
        onMouseDown={startResize}
      />
      <div className="erp-split-right-panel">
        {rightPanel}
      </div>
    </div>
  );
}
