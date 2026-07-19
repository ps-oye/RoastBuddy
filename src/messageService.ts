import * as vscode from 'vscode';
import { ConfigManager, MessageLanguage, RoastIntensity } from './config';
import { AcceptType } from './changeAnalyzer';
import { getRandomRoast, getRandomCheer } from './hardcodedMessages';

/**
 * Generates roast/cheer messages either dynamically via the
 * VS Code Language Model API or from hardcoded message banks.
 */
export class MessageService {
    private _config: ConfigManager;
    private _hasShownConsent = false;

    constructor(config: ConfigManager) {
        this._config = config;
    }

    /**
     * Get a message for the given accept type and line count.
     */
    async getMessage(type: AcceptType, linesAdded: number): Promise<string> {
        if (this._config.useDynamicMessages) {
            try {
                const dynamicMsg = await this._getDynamicMessage(type, linesAdded);
                if (dynamicMsg) {
                    return dynamicMsg;
                }
            } catch (err) {
                console.warn('[RoastBuddy] Dynamic message generation failed, using fallback:', err);
            }
        }

        return this._getFallbackMessage(type, linesAdded);
    }

    /**
     * Generate a message using the VS Code Language Model API (Copilot LM).
     */
    private async _getDynamicMessage(type: AcceptType, linesAdded: number): Promise<string | null> {
        // Show consent notification on first use
        if (!this._hasShownConsent) {
            const choice = await vscode.window.showInformationMessage(
                '🔥 Roast Buddy: Dynamic AI messages are enabled. This uses your Copilot plan tokens to generate unique roasts and cheers. Continue?',
                'Yes, roast me!',
                'Disable Dynamic Mode'
            );

            if (choice === 'Disable Dynamic Mode') {
                await vscode.workspace.getConfiguration('roastBuddy').update(
                    'useDynamicMessages',
                    false,
                    vscode.ConfigurationTarget.Global
                );
                return null;
            }

            this._hasShownConsent = true;
        }

        // Select an available chat model
        const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
        if (models.length === 0) {
            console.warn('[RoastBuddy] No language models available');
            return null;
        }

        const model = models[0];
        const intensity = this._config.roastIntensity;
        const messageLanguage = this._config.messageLanguage;
        const prompt = this._buildPrompt(type, linesAdded, intensity, messageLanguage);

        const messages = [
            vscode.LanguageModelChatMessage.User(prompt),
        ];

        const tokenSource = new vscode.CancellationTokenSource();

        // Set a timeout to cancel if the model takes too long
        const timeout = setTimeout(() => tokenSource.cancel(), 8000);

        try {
            const response = await model.sendRequest(messages, {}, tokenSource.token);

            let result = '';
            for await (const chunk of response.text) {
                result += chunk;
            }

            clearTimeout(timeout);

            // Clean up the response — strip quotes, trim whitespace
            result = result.replace(/^["']|["']$/g, '').trim();

            return result || null;
        } catch (err) {
            clearTimeout(timeout);
            if (err instanceof vscode.LanguageModelError) {
                console.warn(`[RoastBuddy] LM Error: ${err.message} (code: ${err.code})`);
            }
            return null;
        } finally {
            tokenSource.dispose();
        }
    }

    /**
     * Build the prompt for the language model based on the accept type.
     */
    private _buildPrompt(type: AcceptType, linesAdded: number, intensity: RoastIntensity, messageLanguage: MessageLanguage): string {
        const languageGuide = messageLanguage === 'hinglish' ? 'Hinglish' : 'English';

        if (type === 'roast') {
            const intensityGuide = {
                mild: 'gentle and playful, like a friend teasing',
                medium: 'witty and sarcastic, with a comedic edge',
                savage: 'brutally honest and savage, but still funny, never offensive or discriminatory',
            };

            return [
                `You are a sarcastic coding buddy character in a VS Code extension called "Roast Buddy".`,
                `A developer just blindly accepted ${linesAdded} lines of AI-generated code without reviewing it.`,
                `Generate a single short roast message (1-2 sentences max) that is ${intensityGuide[intensity]} and written in ${languageGuide}.`,
                `The tone should be humorous and lighthearted, NEVER offensive, discriminatory, or mean-spirited.`,
                `Include an emoji if appropriate. Do NOT use quotes around your response.`,
                `Respond with ONLY the roast message, nothing else.`,
            ].join(' ');
        } else {
            return [
                `You are an encouraging coding buddy character in a VS Code extension called "Roast Buddy".`,
                `A developer just carefully reviewed and accepted ${linesAdded} line(s) of AI-generated code one at a time.`,
                `Generate a single short cheer/praise message (1-2 sentences max) that celebrates their careful approach and is written in ${languageGuide}.`,
                `The tone should be warm, encouraging, and fun. Include an emoji if appropriate.`,
                `Do NOT use quotes around your response. Respond with ONLY the cheer message, nothing else.`,
            ].join(' ');
        }
    }

    /**
     * Get a message from the hardcoded message banks.
     */
    private _getFallbackMessage(type: AcceptType, linesAdded: number): string {
        if (type === 'roast') {
            return getRandomRoast(this._config.roastIntensity, linesAdded, this._config.messageLanguage);
        }
        return getRandomCheer(this._config.messageLanguage);
    }
}
