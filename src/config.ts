import * as vscode from 'vscode';

export type CharacterType = 'robot' | 'girlBot';
export type RoastIntensity = 'mild' | 'medium' | 'savage';
export type MessageLanguage = 'english' | 'hinglish';

export interface RoastBuddyConfig {
    enabled: boolean;
    characterType: CharacterType;
    roastIntensity: RoastIntensity;
    messageLanguage: MessageLanguage;
    useDynamicMessages: boolean;
    cooldownMs: number;
}

/**
 * Typed configuration reader for Roast Buddy settings.
 * Listens for config changes and exposes strongly-typed getters.
 */
export class ConfigManager {
    private _onDidChangeConfig = new vscode.EventEmitter<RoastBuddyConfig>();
    public readonly onDidChangeConfig = this._onDidChangeConfig.event;
    private _disposable: vscode.Disposable;

    constructor() {
        this._disposable = vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('roastBuddy')) {
                this._onDidChangeConfig.fire(this.getConfig());
            }
        });
    }

    getConfig(): RoastBuddyConfig {
        const cfg = vscode.workspace.getConfiguration('roastBuddy');
        return {
            enabled: cfg.get<boolean>('enabled', true),
            characterType: cfg.get<CharacterType>('characterType', 'robot'),
            roastIntensity: cfg.get<RoastIntensity>('roastIntensity', 'medium'),
            messageLanguage: cfg.get<MessageLanguage>('messageLanguage', 'english'),
            useDynamicMessages: cfg.get<boolean>('useDynamicMessages', false),
            cooldownMs: cfg.get<number>('cooldownMs', 10000),
        };
    }

    get enabled(): boolean {
        return this.getConfig().enabled;
    }

    get characterType(): CharacterType {
        return this.getConfig().characterType;
    }

    get roastIntensity(): RoastIntensity {
        return this.getConfig().roastIntensity;
    }

    get messageLanguage(): MessageLanguage {
        return this.getConfig().messageLanguage;
    }

    get useDynamicMessages(): boolean {
        return this.getConfig().useDynamicMessages;
    }

    get cooldownMs(): number {
        return this.getConfig().cooldownMs;
    }

    dispose(): void {
        this._onDidChangeConfig.dispose();
        this._disposable.dispose();
    }
}
