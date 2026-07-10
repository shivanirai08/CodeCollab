let flushHandler = null;

export function registerEditorSaveFlush(handler) {
  flushHandler = handler;
}

export function unregisterEditorSaveFlush() {
  flushHandler = null;
}

export async function flushEditorSave() {
  if (!flushHandler) {
    return;
  }

  await flushHandler();
}
