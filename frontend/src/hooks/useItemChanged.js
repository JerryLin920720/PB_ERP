import { useCallback, useRef } from 'react';
import { getProgramConfig } from '../config/programRegistry';

/**
 * useItemChanged - 處理 PB ItemChanged 欄位連動邏輯
 */
export default function useItemChanged(sheetId) {
  const isApplyingRef = useRef(false);

  const getRules = useCallback((scope, detailKey = null) => {
    const programId = sheetId ? sheetId.split('-')[0] : null;
    if (!programId) return [];
    const config = getProgramConfig(programId);
    if (!config || !config.itemChangedRules) return [];
    
    return config.itemChangedRules.filter(r => 
      r.scope === scope && (scope === 'master' || r.detailKey === detailKey)
    );
  }, [sheetId]);

  // Apply rules for a single row/form-values based on changed fields
  const applyRules = useCallback((changedFields, currentValues, rules, context = {}) => {
    if (isApplyingRef.current) return {};
    isApplyingRef.current = true;
    
    let newValues = { ...currentValues };
    let hasChanges = false;
    let changedKeys = Object.keys(changedFields);

    try {
      // 一旦有欄位變更，我們需要多次掃描 rules，直到沒有新變更 (簡易級聯處理)
      let loops = 0;
      while (changedKeys.length > 0 && loops < 5) {
        const currentBatch = [...changedKeys];
        changedKeys = [];
        loops++;

        for (const rule of rules) {
          if (currentBatch.includes(rule.field)) {
            for (const effect of rule.effects) {
              try {
                if (effect.type === 'clear') {
                  (effect.targets || []).forEach(t => {
                    newValues[t] = null;
                    changedKeys.push(t);
                    hasChanges = true;
                  });
                } else if (effect.type === 'copy') {
                  newValues[effect.target] = newValues[rule.field];
                  changedKeys.push(effect.target);
                  hasChanges = true;
                } else if (effect.type === 'multiply') {
                  const left = Number(newValues[effect.left] || 0);
                  const right = Number(newValues[effect.right] || 0);
                  let result = left * right;
                  if (isNaN(result)) result = 0;
                  // 保留小數點位數，可依需求進階擴充
                  newValues[effect.target] = Math.round(result * 10000) / 10000;
                  changedKeys.push(effect.target);
                  hasChanges = true;
                } else if (effect.type === 'custom' && typeof effect.handler === 'function') {
                  const customUpdates = effect.handler(newValues, context);
                  if (customUpdates && typeof customUpdates === 'object') {
                    Object.keys(customUpdates).forEach(k => {
                      newValues[k] = customUpdates[k];
                      changedKeys.push(k);
                      hasChanges = true;
                    });
                  }
                }
              } catch (err) {
                console.warn(`[ItemChanged] Effect error on field ${rule.field}:`, err);
              }
            }
          }
        }
      }
    } finally {
      isApplyingRef.current = false;
    }

    return hasChanges ? newValues : null;
  }, []);

  return {
    getRules,
    applyRules,
    isApplyingRef
  };
}
