import * as vscode from 'vscode';

export class CopilotPreviewDetector implements vscode.Disposable {

    private readonly disposables: vscode.Disposable[] = [];

    private lastSelectionAt = 0;
    private lastTypingAt = 0;

    private pendingReview = false;
    private pendingDocument?: string;

    constructor(
        private readonly log: vscode.OutputChannel,
        private readonly onPreviewStarted: () => void,
        private readonly onPreviewFinished: () => void,
    ) {}

    register() {

        this.disposables.push(

            vscode.window.onDidChangeTextEditorSelection(() => {
                this.lastSelectionAt = Date.now();
            })

        );

        this.disposables.push(

            vscode.workspace.onDidChangeTextDocument(e => {

                if (e.document.uri.scheme !== 'file') {
                    return;
                }

                if (e.contentChanges.length === 0) {
                    return;
                }

                const now = Date.now();

                let score = 0;

                let insertedChars = 0;
                let removedChars = 0;
                let insertedLines = 0;

                for (const c of e.contentChanges) {

                    insertedChars += c.text.length;
                    removedChars += c.rangeLength;
                    insertedLines += c.text.split(/\r?\n/).length - 1;

                    // typing
                    if (c.text.length <= 2 && e.contentChanges.length === 1) {
                        this.lastTypingAt = now;
                        return;
                    }

                    // enter
                    if (c.text === '\n' || c.text === '\r\n') {
                        this.lastTypingAt = now;
                        return;
                    }

                    // delete
                    if (c.text === '') {
                        this.lastTypingAt = now;
                        return;
                    }
                }

                if (removedChars > 20 && insertedChars > 20)
                    score += 5;

                if (insertedChars > 100)
                    score += 3;

                if (insertedLines > 5)
                    score += 3;

                if (now - this.lastTypingAt > 700)
                    score += 2;

                if (now - this.lastSelectionAt > 700)
                    score += 2;

                this.log.appendLine(
                    `[PreviewDetector] score=${score} chars=${insertedChars} removed=${removedChars} lines=${insertedLines} version=${e.document.version}`
                );

                if (!this.pendingReview && score >= 8) {

                    this.pendingReview = true;
                    this.pendingDocument = e.document.uri.toString();

                    this.log.appendLine(
                        '[PreviewDetector] ===== Preview START ====='
                    );

                    this.onPreviewStarted();
                }
            })

        );
    }

    public finishReview() {

        if (!this.pendingReview)
            return;

        this.pendingReview = false;
        this.pendingDocument = undefined;

        this.log.appendLine(
            '[PreviewDetector] ===== Preview FINISHED ====='
        );

        this.onPreviewFinished();
    }

    public hasPendingReview() {
        return this.pendingReview;
    }

    dispose() {
        this.disposables.forEach(d => d.dispose());
    }
}