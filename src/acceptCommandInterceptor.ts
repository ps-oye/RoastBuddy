import * as vscode from 'vscode';
import {
    acceptCommandMap,
    getAcceptTypeForCommand,
    nonOverridableAcceptCommands,
} from './acceptCommandClassifier';

/**
 * Intercepts Copilot/Chat "Keep" accept commands so Roast Buddy reacts to both
 * keyboard shortcuts and UI button clicks.
 *
 * IMPORTANT DESIGN NOTES:
 *
 * 1. `registerCommand` is wrapped in try-catch because VS Code throws when
 *    the command ID is already registered. Commands registered before our
 *    extension activates (e.g. chatEditing.acceptAllFiles) can't be
 *    intercepted — and that's fine, the proxy keybinding commands handle them.
 *
 * 2. Commands that VS Code registers LAZILY (after our extension activates)
 *    can be intercepted. When we intercept, we fire the reaction, then
 *    temporarily dispose our handler so VS Code's restored handler runs.
 *
 * 2b. Hunk commands (`chatEditor.action.acceptHunk`) are NEVER intercepted —
 *     their toolbar passes a non-serializable workbench widget as an argument.
 *     Overriding them breaks the Keep button. Use HunkAcceptDetector instead.
 *
 * 3. Before executing any fallback chain, ALL candidate interceptors are
 *    disposed and marked as delegating to prevent cascading invocations.
 *
 * 4. Proxy commands (roastBuddy.keepHunk, etc.) should use
 *    `executeOriginalCommands()` instead of calling executeCommand directly,
 *    so interceptors are properly bypassed.
 */
export class AcceptCommandInterceptor implements vscode.Disposable {
    private interceptors = new Map<string, vscode.Disposable>();
    private delegating = new Set<string>();
    private readonly _log: vscode.OutputChannel;

    constructor(
        private readonly fireAccept: (type: 'cheer' | 'roast') => void,
        log: vscode.OutputChannel,
    ) {
        this._log = log;
    }

    // ── Registration ────────────────────────────────────────────────

    registerAll(): void {
        for (const commandId of Object.keys(acceptCommandMap)) {
            this.tryRegisterCommand(commandId);
        }
    }

    /**
     * Try to register an interceptor for a single command.
     * Wrapped in try-catch so we silently skip commands that VS Code
     * (or another extension) already owns.
     */
    private tryRegisterCommand(commandId: string): void {
        if (this.interceptors.has(commandId)) {
            return;
        }

        if (nonOverridableAcceptCommands.has(commandId)) {
            this._log.appendLine(
                `Skipped (workbench-only args): ${commandId} — use HunkAcceptDetector`,
            );
            return;
        }

        const acceptType = getAcceptTypeForCommand(commandId);
        if (!acceptType) {
            return;
        }

        try {
            const disposable = vscode.commands.registerCommand(
                commandId,
                async (...args: unknown[]) => {
                    // Guard: if we're in the middle of delegating this command, do nothing
                    if (this.delegating.has(commandId)) {
                        return;
                    }

                    this._log.appendLine(`Intercepted: ${commandId} → ${acceptType}`);
                    this.fireAccept(acceptType);
                    await this.delegateToOriginal(commandId, args);
                },
            );

            this.interceptors.set(commandId, disposable);
            this._log.appendLine(`Interceptor registered: ${commandId} (→ ${acceptType})`);
        } catch {
            // Command already registered by VS Code or another extension — skip.
            this._log.appendLine(`Skipped (already registered): ${commandId}`);
        }
    }

    // ── Delegation (for intercepted button clicks) ──────────────────

    /**
     * Temporarily remove ALL interceptors for the candidate commands,
     * execute the first one that succeeds, then re-register everything.
     *
     * Disposing ALL candidates at once prevents the cascading-interceptor
     * bug where fallback commands re-enter other interceptors.
     */
    private async delegateToOriginal(
        primaryId: string,
        args: unknown[],
    ): Promise<void> {
        // Build the full candidate list: primary + fallbacks (deduplicated)
        const candidates = this.buildCandidateList(primaryId);

        // Dispose ALL interceptors and mark as delegating
        const toReregister = this.suspendInterceptors(candidates);

        try {
            await this.executeFirst(candidates, args);
        } finally {
            this.resumeInterceptors(candidates, toReregister);
        }
    }

    // ── Public bypass for proxy commands ─────────────────────────────

    /**
     * Execute one of the given command IDs, bypassing any interceptors we own.
     *
     * Call this from proxy commands (roastBuddy.keepHunk, etc.) instead of
     * calling `vscode.commands.executeCommand()` directly, so intercepted
     * commands don't re-enter our handlers.
     */
    async executeOriginalCommands(
        commandIds: string[],
        args: unknown[] = [],
    ): Promise<void> {
        // Suspend interceptors for all candidates
        const toReregister = this.suspendInterceptors(commandIds);

        try {
            await this.executeFirst(commandIds, args);
        } finally {
            this.resumeInterceptors(commandIds, toReregister);
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────

    /**
     * Build a deduplicated list: [primaryId, ...hunk-fallbacks not already listed].
     * This is the same list executeWithFallback used to produce.
     */
    private buildCandidateList(primaryId: string): string[] {
        const seen = new Set<string>([primaryId]);
        const hunkFallbacks = [
            'chatEditor.action.acceptHunk',
            'chatEditor.action.acceptCurrentChange',
            'chatEditor.action.acceptChange',
            'inlineChat.acceptHunk',
            'chatEditor.action.acceptInlineHunk',           
            'inlineChat.acceptInlineChange',               
            'editor.action.acceptHunk',                     
            'chatEditing.acceptHunk',
            'inlineChat.acceptInlineHunk',
            'inlineChat2.keep'
        ];
        const result = [primaryId];
        for (const id of hunkFallbacks) {
            if (!seen.has(id)) {
                seen.add(id);
                result.push(id);
            }
        }
        return result;
    }

    /**
     * Dispose interceptors for the given command IDs and mark them
     * as delegating so any stray calls are no-ops.
     * Returns the list of IDs that were actually intercepted (for re-registration).
     */
    private suspendInterceptors(commandIds: string[]): string[] {
        const toReregister: string[] = [];
        for (const id of commandIds) {
            const interceptor = this.interceptors.get(id);
            if (interceptor) {
                interceptor.dispose();
                this.interceptors.delete(id);
                toReregister.push(id);
            }
            this.delegating.add(id);
        }
        return toReregister;
    }

    /**
     * Clear delegating flags and re-register interceptors.
     */
    private resumeInterceptors(
        commandIds: string[],
        toReregister: string[],
    ): void {
        for (const id of commandIds) {
            this.delegating.delete(id);
        }
        for (const id of toReregister) {
            this.tryRegisterCommand(id);
        }
    }

    /**
     * Execute the first command that succeeds from the list.
     */
    private async executeFirst(
        commandIds: string[],
        args: unknown[],
    ): Promise<void> {
        for (const id of commandIds) {
            try {
                await vscode.commands.executeCommand(id, ...args);
                this._log.appendLine(`Delegated OK: ${id}`);
                return;
            } catch (err) {
                this._log.appendLine(`Command failed: ${id} — ${err}`);
            }
        }
        this._log.appendLine(
            `WARNING: None of the original commands succeeded: ${commandIds.join(', ')}`,
        );
    }

    // ── Dispose ─────────────────────────────────────────────────────

    dispose(): void {
        for (const disposable of this.interceptors.values()) {
            disposable.dispose();
        }
        this.interceptors.clear();
        this.delegating.clear();
    }
}
