import { useState, useEffect, useCallback } from 'react';

export default function useSheetState(config) {
  // Support both old string argument (fail-safe) and new object argument
  const tabId = typeof config === 'string' ? config : config?.tabId;
  const programId = typeof config === 'string' ? config : config?.programId;
  const initialState = typeof config === 'string' ? 'idle' : (config?.initialState || 'idle');

  const [state, setInternalState] = useState(initialState);
  const [dirty, setDirty] = useState(false);
  const [dirtyReason, setDirtyReason] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [approved, setInternalApproved] = useState(false);
  const [readonly, setInternalReadonly] = useState(false);
  const [locked, setInternalLocked] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const dispatchState = useCallback((currentState, currentFlags) => {
    if (!tabId || !programId) return; // fail safe
    window.dispatchEvent(new CustomEvent('mdi-sheet-state-change', {
      detail: {
        tabId,
        programId,
        state: currentState,
        ...currentFlags,
        source: 'useSheetState'
      }
    }));
  }, [tabId, programId]);

  // Provide setter methods that automatically dispatch
  const setState = (newState) => { setInternalState(newState); };
  const markDirty = (isDirty = true, reason = null) => {
    setDirty(isDirty);
    if (isDirty) setDirtyReason(reason);
    else setDirtyReason(null);
  };
  const markClean = () => {
    setDirty(false);
    setDirtyReason(null);
    setLastSavedAt(new Date().toISOString());
  };
  const setApproved = (isApproved) => { setInternalApproved(isApproved); };
  const setReadonly = (isReadonly) => { setInternalReadonly(isReadonly); };
  const setLocked = (isLocked) => { setInternalLocked(isLocked); };
  const setSelection = (count) => { setSelectedCount(count); };
  const updateSelectedRecord = (record) => { setSelectedRecord(record); };
  
  const setFlags = (flags) => {
    if (flags.approved !== undefined) setInternalApproved(flags.approved);
    if (flags.readonly !== undefined) setInternalReadonly(flags.readonly);
    if (flags.locked !== undefined) setInternalLocked(flags.locked);
    if (flags.dirty !== undefined) {
      setDirty(flags.dirty);
      if (!flags.dirty) setDirtyReason(null);
    }
    if (flags.dirtyReason !== undefined) setDirtyReason(flags.dirtyReason);
    if (flags.lastSavedAt !== undefined) setLastSavedAt(flags.lastSavedAt);
    if (flags.selectedCount !== undefined) setSelectedCount(flags.selectedCount);
    if (flags.selectedRecord !== undefined) setSelectedRecord(flags.selectedRecord);
  };

  // Effect to auto-dispatch on any change
  useEffect(() => {
    dispatchState(state, { dirty, dirtyReason, lastSavedAt, selectedCount, approved, readonly, locked, selectedRecord });
  }, [state, dirty, dirtyReason, lastSavedAt, selectedCount, approved, readonly, locked, selectedRecord, dispatchState]);

  return {
    state, dirty, dirtyReason, lastSavedAt, selectedCount, approved, readonly, locked,
    setState, markDirty, markClean, setApproved, setReadonly, setLocked, setSelection, setFlags, updateSelectedRecord, selectedRecord
  };
}
