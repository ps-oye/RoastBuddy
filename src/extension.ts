import * as vscode from 'vscode';
import { ConfigManager } from './config';
import { ChangeAnalyzer } from './changeAnalyzer';
import { MessageService } from './messageService';
import { CharacterWebview } from './characterWebview';
import { AcceptCommandInterceptor } from './acceptCommandInterceptor';
import { TypingCheerDetector } from './typingCheerDetector';

/**
 * Roast Buddy — Extension Entry Point
 *
 * Wires up the change analyzer, message service, and character webview.
 * Registers proxy commands for Copilot Keep/Accept keybindings.
 */
export function activate(context: vscode.ExtensionContext) {
    
    // --- Output channel for visible logs ---
    const log = vscode.window.createOutputChannel('Roast Buddy');
    log.appendLine('Extension activating...');
    log.appendLine(`Extension URI: ${context.extensionUri.toString()}`);

    console.log('[RoastBuddy] Extension activating...');
    console.log('[RoastBuddy] Extension URI:', context.extensionUri.toString());

    // const outputcmd = vscode.window.createOutputChannel("Command Inspector");
    // listAllCommands(outputcmd);

    // --- Initialize core services ---
    const config = new ConfigManager();
    const changeAnalyzer = new ChangeAnalyzer(config);
    const messageService = new MessageService(config);
    const characterWebview = new CharacterWebview(context.extensionUri);
    characterWebview.updateCharacter(config.characterType);
    
    console.log('[RoastBuddy] Registering webview view provider...');
    console.log('[RoastBuddy] View type:', CharacterWebview.viewType);
    
    const characterViewProvider = vscode.window.registerWebviewViewProvider(
        CharacterWebview.viewType,
        characterWebview,
        {
            webviewOptions: {
                retainContextWhenHidden: true,
            },
        }
    );
    
    console.log('[RoastBuddy] Webview view provider registered!');

    // --- Register Commands ---
    const showCmd = vscode.commands.registerCommand('roastBuddy.showCharacter', () => {
        characterWebview.show();
        vscode.window.showInformationMessage('🔥 Roast Buddy is here! Accepting AI code without reviewing? Prepare to be roasted.');
    });

    const hideCmd = vscode.commands.registerCommand('roastBuddy.hideCharacter', () => {
        characterWebview.hide();
    });

    const toggleDynamicCmd = vscode.commands.registerCommand('roastBuddy.toggleDynamicMode', async () => {
        const currentValue = config.useDynamicMessages;
        const newValue = !currentValue;

        await vscode.workspace.getConfiguration('roastBuddy').update(
            'useDynamicMessages',
            newValue,
            vscode.ConfigurationTarget.Global
        );

        vscode.window.showInformationMessage(
            newValue
                ? '🤖 Dynamic AI messages enabled! Roasts will now be uniquely generated (uses your plan tokens).'
                : '📋 Switched to hardcoded messages. No plan tokens consumed.'
        );
    });

    // --- Intercept Copilot Keep/Accept commands (keyboard + button clicks) ---
    // Keep (Ctrl+Y)              → Accept single hunk  → CHEER (good: reviewing line-by-line)
    // Keep file (Ctrl+Shift+Y)   → Accept all in file  → ROAST (bad: bulk accept)
    // Keep all (Ctrl+Enter)      → Accept all files    → ROAST (bad: blindly accepting everything)

    // const hunkDetector = new HunkAcceptDetector(
    //     () => changeAnalyzer.fireAccept('cheer'),
    //     config,
    //     log,
    // );
    // hunkDetector.register();

    const typingDetector = new TypingCheerDetector(
        type => changeAnalyzer.fireAccept(type),
        log,
    );

    const acceptInterceptor = new AcceptCommandInterceptor((type) => {
        if (type === 'roast') {
            // File/all accept applies a large edit — don't double-fire cheer.
            //hunkDetector.suppressBriefly();
        }
        changeAnalyzer.fireAccept(type);
    }, log);
    acceptInterceptor.registerAll();

    // ── Proxy keybinding commands ───────────────────────────────────
    // These fire the roast/cheer event, then execute the original VS Code
    // command through the interceptor's bypass path so our handlers
    // don't re-enter.

    const keepHunkCmd = vscode.commands.registerCommand('roastBuddy.keepHunk', async () => {
        log.appendLine('Proxy: keepHunk (Ctrl+Y)');
        console.log('[RoastBuddy] Keep hunk triggered (Ctrl+Y)');

        changeAnalyzer.fireAccept('cheer');

        await acceptInterceptor.executeOriginalCommands([
            'chatEditor.action.acceptHunk',
            'inlineChat.acceptHunk',
            'chatEditor.action.acceptInlineHunk',           
            'inlineChat.acceptInlineChange',               
            'editor.action.acceptHunk',                     
            'chatEditing.acceptHunk',
            'inlineChat.acceptInlineHunk',
            'inlineChat2.keep'
        ]);
    });

    const keepFileCmd = vscode.commands.registerCommand('roastBuddy.keepFile', async () => {
        log.appendLine('Proxy: keepFile (Ctrl+Shift+Y)');
        console.log('[RoastBuddy] Keep file triggered (Ctrl+Shift+Y)');

        changeAnalyzer.fireAccept('roast');

        await acceptInterceptor.executeOriginalCommands([
            'chatEditor.action.accept',
            'chatEditing.acceptFile',
            'inlineChat.acceptChanges',
        ]);
    });

    const keepAllCmd = vscode.commands.registerCommand('roastBuddy.keepAll', async () => {
        log.appendLine('Proxy: keepAll (Ctrl+Enter)');
        console.log('[RoastBuddy] Keep all triggered (Ctrl+Enter)');

        changeAnalyzer.fireAccept('roast');

        await acceptInterceptor.executeOriginalCommands([
            'chatEditing.acceptAllFiles',
            'chatEditing.multidiff.acceptAllFiles',
            'chatEditor.action.acceptAllEdits',
            'chatEditor.action.acceptAll',
        ]);
    });

    // --- Wire up change detection → reaction pipeline ---
    const changeListener = changeAnalyzer.onAcceptDetected(async (event) => {
        if (!config.enabled) {
            return;
        }

        log.appendLine(`Event: ${event.type} (${event.linesAdded} lines in ${event.fileName})`);
        console.log(`[RoastBuddy] Detected: ${event.type} (${event.linesAdded} lines in ${event.fileName})`);

        try {
            // Generate or pick a message
            const message = await messageService.getMessage(event.type, event.linesAdded);

            // Send to webview for animation
            characterWebview.react(
                event.type,
                message,
                config.characterType,
                config.roastIntensity
            );

        } catch (err) {
            console.error('[RoastBuddy] Reaction error:', err);
            log.appendLine(`ERROR: Reaction failed — ${err}`);
        }
    });

    // --- Listen for config changes to update character ---
    const configListener = config.onDidChangeConfig((newConfig) => {
        if (characterWebview.isVisible) {
            characterWebview.updateCharacter(newConfig.characterType);
        }
    });

    // --- Auto-show panel on first activation (if enabled) ---
    if (config.enabled) {
        // Delay auto-show so it doesn't block editor startup
        setTimeout(() => {
            characterWebview.show();
        }, 2000);
    }

    // --- Register all disposables ---
    context.subscriptions.push(
        log,
        showCmd,
        hideCmd,
        toggleDynamicCmd,
        keepHunkCmd,
        keepFileCmd,
        keepAllCmd,
        acceptInterceptor,
        //hunkDetector,
        //outputcmd,
        // inlineObserver,
        typingDetector,
        characterViewProvider,
        changeListener,
        configListener,
        config,
        changeAnalyzer,
        characterWebview
    );

    log.appendLine('Extension activated! 🔥');
    console.log('[RoastBuddy] Extension activated! 🔥');
}

export function deactivate() {
    console.log('[RoastBuddy] Extension deactivated. Goodbye! 👋');
}
