export const DEFAULT_STATE_MATRIX = {
  idle: { retrieve: true, insert: true, edit: false, delete: false, save: false, cancel: false, print: false, preview: false, export: false, approve: false, unapprove: false, xcopy: false },
  browse: { retrieve: true, insert: true, edit: true, delete: true, save: false, cancel: false, print: true, preview: true, export: true, approve: true, unapprove: true, xcopy: true },
  insert: { retrieve: false, insert: false, edit: false, delete: false, save: true, cancel: true, print: false, preview: false, export: false, approve: false, unapprove: false, xcopy: false },
  edit: { retrieve: false, insert: false, edit: false, delete: true, save: true, cancel: true, print: false, preview: false, export: false, approve: false, unapprove: false, xcopy: false },
  saving: { retrieve: false, insert: false, edit: false, delete: false, save: false, cancel: false, print: false, preview: false, export: false, approve: false, unapprove: false, xcopy: false },
  error: { retrieve: true, insert: false, edit: false, delete: false, save: false, cancel: false, print: false, preview: false, export: false, approve: false, unapprove: false, xcopy: false },
};

export function getStateActionConfig(state, flags = {}, pattern = 'A') {
  const { dirty = false, selectedCount = 0, approved = false, readonly = false, locked = false } = flags;
  const baseState = DEFAULT_STATE_MATRIX[state] ? state : 'browse';
  const config = { ...DEFAULT_STATE_MATRIX[baseState] };

  // saving rule overrides everything
  if (baseState === 'saving') {
    return config;
  }

  // dirty rule
  if (dirty) {
    if (!readonly && !locked && !approved) {
      config.save = true;
    }
    config.cancel = true;
    config.approve = false;
    config.unapprove = false;
    config.retrieve = false;
    config.insert = false;
    if (baseState !== 'insert') config.edit = false;
  } else {
    config.save = false;
    if (baseState === 'browse') {
      config.cancel = false;
    }
  }

  // selectedCount base rule
  if (selectedCount === 0) {
    config.edit = false;
    config.delete = false;
    config.xcopy = false;
    config.approve = false;
    config.unapprove = false;
  }

  // approved rule
  if (approved) {
    config.approve = false;
    config.unapprove = true;
    config.edit = false;
    config.delete = false;
    config.save = false;
    
    // insert conservatively: only if browse
    if (baseState !== 'browse') {
      config.insert = false;
    }
  } else {
    config.unapprove = false;
  }

  // dirty overrides approve again
  if (dirty) {
    config.approve = false;
    config.unapprove = false;
  }

  // selectedCount overrides
  if (selectedCount === 0) {
    config.approve = false;
    config.unapprove = false;
  }

  // readonly / locked rule
  if (readonly || locked) {
    config.insert = false;
    config.edit = false;
    config.delete = false;
    config.save = false;
    config.approve = false;
    config.unapprove = false;
    if (!dirty) {
      config.cancel = false;
    }
  }

  return config;
}
