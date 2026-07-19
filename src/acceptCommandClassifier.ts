/**
 * Commands that must NOT be overridden via `registerCommand`.
 *
 * The inline hunk Keep/Undo toolbar passes a non-serializable workbench
 * widget (DiffHunkWidget) as the command argument. Overriding these commands
 * from the extension host prevents the UI button from invoking any handler,
 * so neither the accept nor our cheer logic runs.
 *
 * Hunk keeps are detected via {@link HunkAcceptDetector} instead.
 */
export const nonOverridableAcceptCommands = new Set([
    'chatEditor.action.acceptHunk',
    'chatEditor.action.undoHunk',
]);

export const acceptCommandMap: Record<string, 'cheer' | 'roast'> = {
    // Keep chat edits in this file (Ctrl+Shift+Y) — editor toolbar + chat sidebar
    'chatEditor.action.accept': 'roast',
    'chatEditing.acceptFile': 'roast',
    'inlineChat.acceptChanges': 'roast',
    // Keep all edits (Ctrl+Enter) — chat toolbar + multi-diff title
    'chatEditing.acceptAllFiles': 'roast',
    'chatEditing.multidiff.acceptAllFiles': 'roast',
    'chatEditor.action.acceptAllEdits': 'roast',
    'chatEditor.action.acceptAll': 'roast',
    // Keep single change (Ctrl+Y) — inline hunk (detected via HunkAcceptDetector)
    'chatEditor.action.acceptHunk': 'cheer',
    'inlineChat.acceptHunk': 'cheer',
    'chatEditor.action.acceptInlineHunk': 'cheer',           
    'inlineChat.acceptInlineChange': 'cheer',               
    'editor.action.acceptHunk': 'cheer',                     
    'chatEditing.acceptHunk': 'cheer',
    'inlineChat.acceptInlineHunk': 'cheer',
    'inlineChat2.keep': 'cheer'
};

export function getAcceptTypeForCommand(commandId: string): 'cheer' | 'roast' | undefined {
    return acceptCommandMap[commandId];
}
