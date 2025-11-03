import { useEffect, useRef } from 'react';

export const useRemoteCursors = (editorRef, monaco, remoteCursors) => {
  const decorationsRef = useRef([]);
  const cursorWidgetsRef = useRef(new Map()); // Map of userId -> widget

  useEffect(() => {
    if (!editorRef.current || !monaco) return;

    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;

    console.log('[useRemoteCursors] Rendering remote cursors:', Object.keys(remoteCursors).length, remoteCursors);

    // Get current remote cursor user IDs
    const currentUserIds = new Set(Object.keys(remoteCursors));
    const existingUserIds = new Set(cursorWidgetsRef.current.keys());

    // Remove widgets for users who are no longer present
    for (const userId of existingUserIds) {
      if (!currentUserIds.has(userId)) {
        const widget = cursorWidgetsRef.current.get(userId);
        if (widget) {
          editor.removeContentWidget(widget);
          cursorWidgetsRef.current.delete(userId);
        }
      }
    }

    // Create or update widgets for each remote cursor
    Object.entries(remoteCursors).forEach(([userId, cursorData]) => {
      const { position, color, username, avatar_url } = cursorData;

      // Remove old widget if it exists
      const oldWidget = cursorWidgetsRef.current.get(userId);
      if (oldWidget) {
        editor.removeContentWidget(oldWidget);
      }

      // Create cursor widget
      const widget = {
        getId: () => `remote-cursor-${userId}`,
        getDomNode: () => {
          const domNode = document.createElement('div');
          domNode.className = 'remote-cursor-widget';
          domNode.innerHTML = `
            <div class="remote-cursor-label" style="
              position: absolute;
              bottom: 100%;
              left: 0;
              background-color: ${color};
              color: white;
              padding: 2px 6px;
              border-radius: 3px;
              font-size: 11px;
              font-weight: 600;
              white-space: nowrap;
              margin-bottom: 2px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              z-index: 1000;
            ">
              ${username || 'User'}
            </div>
            <div class="remote-cursor-line" style="
              width: 2px;
              height: 20px;
              background-color: ${color};
              position: relative;
            ">
              <div style="
                position: absolute;
                top: -3px;
                left: -2px;
                width: 6px;
                height: 6px;
                background-color: ${color};
                border-radius: 50%;
              "></div>
            </div>
          `;
          domNode.style.position = 'absolute';
          domNode.style.pointerEvents = 'none';
          domNode.style.zIndex = '1000';
          return domNode;
        },
        getPosition: () => {
          return {
            position: {
              lineNumber: position.lineNumber,
              column: position.column,
            },
            preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
          };
        },
      };

      // Add widget to editor
      editor.addContentWidget(widget);
      cursorWidgetsRef.current.set(userId, widget);
    });

    // Also add decorations for selection highlight (optional)
    const newDecorations = Object.entries(remoteCursors).map(([userId, cursorData]) => {
      const { position, color } = cursorData;

      return {
        range: new monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column
        ),
        options: {
          className: 'remote-cursor-decoration',
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      };
    });

    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      newDecorations
    );
  }, [remoteCursors, monaco, editorRef]);

  // Cleanup only on unmount
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        // Remove all widgets when component unmounts
        for (const widget of cursorWidgetsRef.current.values()) {
          try {
            editorRef.current.removeContentWidget(widget);
          } catch (e) {
            // Widget might already be removed
          }
        }
        cursorWidgetsRef.current.clear();
      }
    };
  }, [editorRef]);

  return null;
};

export default useRemoteCursors;
