import { useEffect, useRef } from 'react';

/**
 * Custom hook for rendering remote user cursors in Monaco Editor
 * Shows real-time cursor positions of other collaborators editing the same file
 * Each cursor displays the user's name with a colored label and cursor line
 * editorRef - React ref to Monaco Editor instance
 * monaco - Monaco editor module
 * remoteCursors - Map of userId -> {position, color, username, avatar_url}
 */
export const useRemoteCursors = (editorRef, monaco, remoteCursors) => {
  const decorationsRef = useRef([]);
  const cursorWidgetsRef = useRef(new Map()); // Map of userId -> widget

  useEffect(() => {
    if (!editorRef.current || !monaco) return;

    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;

    // Get current remote cursor user IDs
    const currentUserIds = new Set(Object.keys(remoteCursors));
    const existingUserIds = new Set(cursorWidgetsRef.current.keys());

    /**
     * Clean up widgets for users who left the file
     * Prevents memory leaks and stale cursor displays
     */
    for (const userId of existingUserIds) {
      if (!currentUserIds.has(userId)) {
        const widget = cursorWidgetsRef.current.get(userId);
        if (widget) {
          editor.removeContentWidget(widget);
          cursorWidgetsRef.current.delete(userId);
        }
      }
    }

    /**
     * Create or update cursor widgets for each remote user
     * Widget includes: colored label with username + vertical cursor line
     */
    Object.entries(remoteCursors).forEach(([userId, cursorData]) => {
      const { position, color, username, avatar_url } = cursorData;

      // Remove old widget if it exists (prevents duplicates)
      const oldWidget = cursorWidgetsRef.current.get(userId);
      if (oldWidget) {
        editor.removeContentWidget(oldWidget);
      }

      // Create custom cursor widget with label and line
      const widget = {
        getId: () => `remote-cursor-${userId}`,
        getDomNode: () => {
          const domNode = document.createElement('div');
          domNode.className = 'remote-cursor-widget';
          domNode.style.position = 'absolute';
          domNode.style.pointerEvents = 'none';
          domNode.style.zIndex = '1000';

          // Create label element with safe text content (prevents XSS)
          const label = document.createElement('div');
          label.className = 'remote-cursor-label';
          label.textContent = username || 'User'; // Safe - uses textContent instead of innerHTML
          label.style.position = 'absolute';
          label.style.bottom = '100%';
          label.style.left = '0';
          label.style.backgroundColor = color;
          label.style.color = 'white';
          label.style.padding = '2px 6px';
          label.style.borderRadius = '3px';
          label.style.fontSize = '11px';
          label.style.fontWeight = '600';
          label.style.whiteSpace = 'nowrap';
          label.style.marginBottom = '2px';
          label.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
          label.style.zIndex = '1000';

          // Create cursor line element
          const cursorLine = document.createElement('div');
          cursorLine.className = 'remote-cursor-line';
          cursorLine.style.width = '2px';
          cursorLine.style.height = '20px';
          cursorLine.style.backgroundColor = color;
          cursorLine.style.position = 'relative';

          // Create cursor dot element
          const cursorDot = document.createElement('div');
          cursorDot.style.position = 'absolute';
          cursorDot.style.top = '-3px';
          cursorDot.style.left = '-2px';
          cursorDot.style.width = '6px';
          cursorDot.style.height = '6px';
          cursorDot.style.backgroundColor = color;
          cursorDot.style.borderRadius = '50%';

          cursorLine.appendChild(cursorDot);
          domNode.appendChild(label);
          domNode.appendChild(cursorLine);

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
