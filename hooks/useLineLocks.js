import { useEffect, useRef } from 'react';

/**
 * Custom hook for rendering line-level locks in Monaco Editor
 * Prevents editing conflicts by showing which lines are being edited by other users
 * Displays a lock icon in the gutter and highlights locked lines
 * editorRef - React ref to Monaco Editor instance
 * monaco - Monaco editor module
 * LockedLines - Map of lineNumber -> {userId, username}
 * currentUserId - Current user's ID (to exclude own locks)
 */
export const useLineLocks = (editorRef, monaco, lockedLines, currentUserId) => {
  const decorationsRef = useRef([]);

  useEffect(() => {
    if (!editorRef.current || !monaco) return;

    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;

    // Create Monaco decorations for locked lines
    // Shows lock icon in gutter margin with username on hover
    // Only shows locks from OTHER users (not current user's own locks)
    const newDecorations = Object.entries(lockedLines)
      .filter(([lineNumber, lockData]) => lockData.userId !== currentUserId)
      .map(([lineNumber, lockData]) => {
        const lineNum = parseInt(lineNumber, 10);

        return {
          range: new monaco.Range(lineNum, 1, lineNum, 1),
          options: {
            isWholeLine: false,
            glyphMarginClassName: 'locked-line-glyph',
            glyphMarginHoverMessage: {
              value: `Locked by **${lockData.username}**`,
            },
            linesDecorationsClassName: 'locked-line-decoration',
          },
        };
      });

    // Apply decorations using deltaDecorations for efficiency
    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      newDecorations
    );
  }, [lockedLines, monaco, editorRef, currentUserId]);

  // Add CSS styles for lock icon
  useEffect(() => {
    const styleId = 'line-lock-styles';

    // Check if styles already exist
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .locked-line-glyph {
        background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="%23FFA500"><path d="M8 1a2 2 0 0 1 2 2v2H6V3a2 2 0 0 1 2-2zm3 4V3a3 3 0 0 0-6 0v2H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1z"/></svg>') no-repeat center center;
        background-size: 14px 14px;
        cursor: not-allowed;
      }

      .locked-line-decoration {
        background-color: rgba(255, 165, 0, 0.1);
        width: 4px !important;
        margin-left: 3px;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  return null;
};

export default useLineLocks;
