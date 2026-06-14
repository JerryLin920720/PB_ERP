import React from 'react';
import useAuth from '../../../auth/useAuth';

/**
 * 共用權限攔截元件
 * 根據 sheetId (或 programId) 與 fieldName 判斷該欄位是否需要 hide 或 readonly。
 */
export default function GuardedField({ sheetId, programId, fieldName, children }) {
  const { user, fieldPermissions } = useAuth();
  
  // 相容不同的變數名稱，優先使用 fieldPermissions，若無則從 user.field_permissions 取
  const perms = fieldPermissions || user?.field_permissions || {};
  
  const targetId = (programId || sheetId || '').toLowerCase();
  
  // Normalize sheetId to w_ form
  const normalizedId = targetId.startsWith('w_') ? targetId : `w_${targetId}`;
  
  // Fallback check both targetId and normalizedId
  const programPerms = perms[normalizedId] || perms[targetId] || [];
  const fieldPerm = programPerms.find(p => p.field_name === fieldName);

  if (fieldPerm?.action === 'hide') {
    return null;
  }
  
  if (fieldPerm?.action === 'readonly') {
    return React.cloneElement(children, {
      style: { ...(children.props.style || {}), pointerEvents: 'none', opacity: 0.7 }
    });
  }
  
  return children;
}
