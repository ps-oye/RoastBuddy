import * as vscode from 'vscode';
import { ConfigManager } from './config';

export type AcceptType = 'roast' | 'cheer';

export interface ChangeEvent {
    type: AcceptType;
    linesAdded: number;
    fileName: string;
}

/**
 * Detects Copilot edit acceptance via intercepted Keep/Accept commands.
 *
 * Keep/Accept detection uses two paths:
 *
 *   - Keep (Ctrl+Y) — inline hunk toolbar: detected by HunkAcceptDetector
 *     (cannot intercept `chatEditor.action.acceptHunk` — workbench widget arg)
 *   - Keep chat edits in file (Ctrl+Shift+Y): intercepted → ROAST
 *   - Keep All edits (Ctrl+Enter): intercepted → ROAST
 *
 * Keyboard Ctrl+Y is handled by the `roastBuddy.keepHunk` proxy command.
 */
export class ChangeAnalyzer {
    private _onAcceptDetected = new vscode.EventEmitter<ChangeEvent>();
    public readonly onAcceptDetected = this._onAcceptDetected.event;

    private _lastReactionTime = 0;
    private _config: ConfigManager;
    private _disposables: vscode.Disposable[] = [];

    constructor(config: ConfigManager) {
        this._config = config;
    }

    /**
     * Called when a Keep/Accept command is intercepted (keyboard or button).
     * Fires a cheer or roast event.
     */
    fireAccept(type: AcceptType): void {
        if (!this._config.enabled) {
            return;
        }

        // Cooldown — don't spam reactions
        const now = Date.now();
        if (now - this._lastReactionTime < this._config.cooldownMs) {
            return;
        }

        this._lastReactionTime = now;

        // Get the active file name
        const activeEditor = vscode.window.activeTextEditor;
        const fileName = activeEditor
            ? activeEditor.document.fileName.split(/[\\/]/).pop() || 'unknown'
            : 'unknown';

        console.log(`[RoastBuddy] Accept detected: ${type} in ${fileName}`);

        this._onAcceptDetected.fire({
            type,
            linesAdded: type === 'roast' ? 10 : 1, // Approximate for message selection
            fileName,
        });
    }

    dispose(): void {
        this._onAcceptDetected.dispose();
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
    }
}
