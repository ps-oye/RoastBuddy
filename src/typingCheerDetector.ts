import * as vscode from 'vscode';

export class TypingCheerDetector implements vscode.Disposable {

    private readonly disposable: vscode.Disposable;

    // Rolling character counter
    private typedCharacters = 0;

    // Time of last key press
    private lastTypedAt = 0;

    // Time of last cheer
    private lastFireAt = 0;

    // ---------------- CONFIG ----------------

    // Cheer every ~10 typed characters
    private readonly threshold = 10;

    // Don't cheer more often than every 12 seconds
    private readonly cooldownMs = 12000;

    // Reset progress after 1 minute of inactivity
    private readonly idleResetMs = 60000;

    // Ignore inserts larger than this (paste)
    private readonly maxChunkLength = 3;

    // ----------------------------------------

    constructor(
        private readonly fireAccept: (type: 'cheer') => void,
        private readonly log: vscode.OutputChannel,
    ) {

        this.disposable = vscode.workspace.onDidChangeTextDocument(
            e => this.handleDocumentChange(e),
        );
    }

    private handleDocumentChange(
        event: vscode.TextDocumentChangeEvent,
    ): void {

        // Only real files
        if (event.document.uri.scheme !== 'file') {
            return;
        }

        // Only active editor
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            return;
        }

        if (editor.document !== event.document) {
            return;
        }

        const now = Date.now();

        // Reset after long inactivity
        if (now - this.lastTypedAt > this.idleResetMs) {
            this.typedCharacters = 0;

            this.log.appendLine(
                '[Typing] Idle timeout. Counter reset.',
            );
        }

        this.lastTypedAt = now;

        let typedThisEvent = 0;

        for (const change of event.contentChanges) {

            // Ignore deletions
            if (change.text.length === 0) {
                continue;
            }

            // Ignore Enter / multiline edits
            if (change.text.includes('\n')) {
                continue;
            }

            // Ignore paste or formatter
            if (change.text.length > this.maxChunkLength) {

                this.log.appendLine(
                    `[Typing] Ignored large insert (${change.text.length} chars).`,
                );

                continue;
            }

            typedThisEvent += change.text.length;
        }

        if (typedThisEvent === 0) {
            return;
        }

        this.typedCharacters += typedThisEvent;

        this.log.appendLine(
            `[Typing] +${typedThisEvent} chars | total=${this.typedCharacters}`,
        );

        if (this.typedCharacters < this.threshold) {
            return;
        }

        // Cooldown
        if (now - this.lastFireAt < this.cooldownMs) {

            this.log.appendLine(
                '[Typing] Threshold reached but cooldown active.',
            );

            return;
        }

        this.lastFireAt = now;

        // Rolling reset
        this.typedCharacters = 0;

        this.log.appendLine(
            '[Typing] 🎉 Cheer fired.',
        );

        this.fireAccept('cheer');
    }

    dispose(): void {
        this.disposable.dispose();
    }
}