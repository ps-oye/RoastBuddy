import * as vscode from 'vscode';
import { ConfigManager } from './config';

export class HunkAcceptDetector implements vscode.Disposable {
    private disposable?: vscode.Disposable;
    private suppressUntil = 0;
    private lastFireAt = 0;
    private readonly cooldownMs = 1200;

    // Expanded list of known hunk accept commands
    private readonly keepCommands = new Set([
        'chatEditor.action.acceptHunk',
        'inlineChat.acceptHunk',
        'chatEditor.action.acceptInlineHunk',           
        'inlineChat.acceptInlineChange',               
        'editor.action.acceptHunk',                     
        'chatEditing.acceptHunk',
        'inlineChat.acceptInlineHunk',
        'inlineChat2.keep'
    ]);

    constructor(
        private readonly fireAccept: () => void,
        private readonly config: ConfigManager,
        private readonly log: vscode.OutputChannel,
    ) {}

    suppressBriefly(ms = 2500): void {
        this.suppressUntil = Date.now() + ms;
    }

    register(): void {
        // Try the undocumented API first (newer way)
        const commandsApi = (vscode.commands as any);
        if (typeof commandsApi.onDidExecuteCommand === 'function') {
            this.disposable = commandsApi.onDidExecuteCommand((event: any) => {
                const cmd = event?.command;
                if (!cmd) return;

                this.log.appendLine(`[onDidExecuteCommand] Fired: ${cmd}`);

                if (this.keepCommands.has(cmd)) {
                    const now = Date.now();
                    if (now < this.suppressUntil || now - this.lastFireAt < this.cooldownMs) {
                        return;
                    }
                    this.lastFireAt = now;
                    this.log.appendLine(`[HunkAccept] SUCCESS: ${cmd}`);
                    this.fireAccept();
                }
            });

            this.log.appendLine('HunkAcceptDetector: Registered via onDidExecuteCommand');
        } 
        else {
            this.log.appendLine('WARNING: onDidExecuteCommand not available. Hunk detection disabled.');
            // Optional: fallback warning
            vscode.window.showWarningMessage('Roast Buddy: Inline hunk detection not available in this VS Code version.');
        }
    }
    dispose(): void {
        this.disposable?.dispose();
    }
}