import * as vscode from 'vscode';
import { AcceptType } from './changeAnalyzer';
import { CharacterType, RoastIntensity } from './config';

interface PendingMessage {
    command: 'react' | 'updateCharacter';
    type?: AcceptType;
    message?: string;
    character: CharacterType;
    intensity?: RoastIntensity;
}

/**
 * Manages the Roast Buddy side-bar webview that displays the animated SVG robot.
 */
export class CharacterWebview implements vscode.WebviewViewProvider, vscode.Disposable {
    public static readonly viewType = 'roastBuddy.characterView';

    private _view: vscode.WebviewView | undefined;
    private _extensionUri: vscode.Uri;
    private _pendingMessages: PendingMessage[] = [];
    private _disposables: vscode.Disposable[] = [];

    constructor(extensionUri: vscode.Uri) {
        this._extensionUri = extensionUri;
    }

    resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'media'),
            ],
        };

        webviewView.webview.html = this._getHtmlContent(webviewView.webview);
        
        // Handle view destruction
        const onDisposeListener = webviewView.onDidDispose(() => {
            this._view = undefined;
        });
        this._disposables.push(onDisposeListener);
        
        // Handle messages from webview
        const messageListener = webviewView.webview.onDidReceiveMessage(() => {
            // Message handler for future use
        });
        this._disposables.push(messageListener);
        
        this._flushPendingMessages();
    }

    /**
     * Show the character view in the Explorer side bar.
     */
    show(): void {
        vscode.commands.executeCommand(`${CharacterWebview.viewType}.focus`);
    }

    /**
     * VS Code side-bar views cannot be programmatically closed, so hide clears focus.
     */
    hide(): void {
        vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
    }

    get isVisible(): boolean {
        return this._view?.visible === true;
    }

    react(type: AcceptType, message: string, character: CharacterType, intensity: RoastIntensity): void {
        const payload: PendingMessage = {
            command: 'react',
            type,
            message,
            character,
            intensity,
        };

        // this.show();
        this._postOrQueue(payload);
    }

    updateCharacter(character: CharacterType): void {
        this._postOrQueue({
            command: 'updateCharacter',
            character,
        });
    }

    private _postOrQueue(payload: PendingMessage): void {
        if (!this._view) {
            this._pendingMessages.push(payload);
            return;
        }

        this._view.webview.postMessage(payload);
    }

    private _flushPendingMessages(): void {
        if (!this._view) {
            return;
        }

        for (const payload of this._pendingMessages) {
            this._view.webview.postMessage(payload);
        }
        this._pendingMessages = [];
    }

    private _getHtmlContent(webview: vscode.Webview): string {
        const mediaPath = vscode.Uri.joinPath(this._extensionUri, 'media');
        const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'webview.css'));
        const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'webview.js'));
        const nonce = this._getNonce();

        return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy"
          content="default-src 'none';
                   style-src ${webview.cspSource} 'unsafe-inline';
                   script-src 'nonce-${nonce}';
                   font-src ${webview.cspSource};">
    <link rel="stylesheet" href="${cssUri}">
    <title>Roast Buddy</title>
</head>
<body>
    <div id="roast-buddy-container">
        <canvas id="particles-canvas"></canvas>

        <div id="character-stage">
            <div id="speech-bubble" class="hidden">
                <div id="bubble-text"></div>
            </div>
            <div id="robot-walker" class="walking">
                <svg id="robot-svg" viewBox="0 0 1024 1024" role="img" aria-label="Roast Buddy robot">
                    <defs>
                        <linearGradient id="visorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stop-color="#5e7ef7"/>
                            <stop offset="45%" stop-color="#7b8df4"/>
                            <stop offset="100%" stop-color="#667cf1"/>
                        </linearGradient>
                        <linearGradient id="earGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#7c90ff"/>
                            <stop offset="100%" stop-color="#566be8"/>
                        </linearGradient>
                        <g id="simpleHand">
                            <rect x="-18" y="-114" width="44" height="30" rx="11" class="fill-white outline"></rect>
                            <rect x="-28" y="-104" width="14" height="12" rx="6" class="fill-white outline"></rect>
                        </g>
                        <g id="simpleFoot">
                            <rect x="-50" y="-16" width="100" height="28" rx="14" class="fill-blue outline"></rect>
                            <ellipse cx="0" cy="-6" rx="14" ry="7" fill="#fff" opacity=".55"></ellipse>
                        </g>
                    </defs>

                    <!-- ANTENNA -->
                    <g id="antenna" class="rig">
                        <circle id="bulb-glow" cx="512" cy="84" r="28" fill="url(#earGrad)" class="outline"></circle>
                        <circle cx="524" cy="72" r="8" fill="#fff" opacity=".45"></circle>
                        <rect x="504" y="26" width="16" height="48" rx="8" class="fill-blue-dark outline"></rect>
                        <rect x="460" y="38" width="16" height="44" rx="8" class="fill-blue outline" transform="rotate(-40 468 60)"></rect>
                        <rect x="548" y="38" width="16" height="44" rx="8" class="fill-blue outline" transform="rotate(40 556 60)"></rect>
                    </g>

                    <!-- HEAD -->
                    <g id="head" class="rig">
                        <path d="M 354 118
                                 Q 512 74 670 118
                                 Q 711 130 725 171
                                 L 725 277
                                 Q 725 354 667 383
                                 Q 617 407 512 407
                                 Q 407 407 357 383
                                 Q 299 354 299 277
                                 L 299 171
                                 Q 313 130 354 118 Z"
                              class="fill-white outline"></path>

                        <!-- Ears -->
                        <rect x="284" y="219" width="56" height="122" rx="26" fill="url(#earGrad)" class="outline"></rect>
                        <rect x="296" y="233" width="32" height="94" rx="16" class="fill-blue-dark outline" stroke-width="6"></rect>
                        <rect x="684" y="219" width="56" height="122" rx="26" fill="url(#earGrad)" class="outline"></rect>
                        <rect x="696" y="233" width="32" height="94" rx="16" class="fill-blue-dark outline" stroke-width="6"></rect>

                        <!-- Visor -->
                        <path d="M 347 248
                                 Q 347 220 375 220
                                 L 649 220
                                 Q 677 220 677 248
                                 L 677 298
                                 Q 677 326 649 326
                                 L 375 326
                                 Q 347 326 347 298 Z"
                              class="fill-blue outline"></path>
                        <path d="M 357 239
                                 Q 357 228 368 228
                                 L 652 228
                                 Q 663 228 663 239
                                 L 663 292
                                 Q 663 303 652 303
                                 L 368 303
                                 Q 357 303 357 292 Z"
                              fill="rgba(255,255,255,.08)" stroke="none"></path>

                        <!-- Normal Brows -->
                        <path class="brow brow-normal brow-left" d="M 387 208 L 436 217" fill="none" stroke="#0c1326" stroke-width="10" stroke-linecap="round"></path>
                        <path class="brow brow-normal brow-right" d="M 588 217 L 637 208" fill="none" stroke="#0c1326" stroke-width="10" stroke-linecap="round"></path>

                        <!-- Angry Brows (hidden by default) -->
                        <path class="brow brow-angry brow-left" d="M 400 225 L 440 205" fill="none" stroke="#0c1326" stroke-width="12" stroke-linecap="round"></path>
                        <path class="brow brow-angry brow-right" d="M 584 205 L 624 225" fill="none" stroke="#0c1326" stroke-width="12" stroke-linecap="round"></path>

                        <!-- Happy Brows (hidden by default) -->
                        <path class="brow brow-happy brow-left" d="M 395 218 L 440 210" fill="none" stroke="#0c1326" stroke-width="10" stroke-linecap="round"></path>
                        <path class="brow brow-happy brow-right" d="M 584 210 L 629 218" fill="none" stroke="#0c1326" stroke-width="10" stroke-linecap="round"></path>

                        <!-- Eyes -->
                        <circle cx="433" cy="281" r="34" fill="#0c1326"></circle>
                        <circle cx="591" cy="281" r="34" fill="#0c1326"></circle>
                        <circle class="eye-shine" cx="442" cy="275" r="10" fill="#fff"></circle>
                        <circle cx="449" cy="286" r="5" fill="#fff"></circle>
                        <circle class="eye-shine" cx="600" cy="275" r="10" fill="#fff"></circle>
                        <circle cx="607" cy="286" r="5" fill="#fff"></circle>

                        <!-- Normal Mouth (smile) -->
                        <path class="mouth mouth-normal" d="M 489 344 Q 512 356 536 344" fill="none" stroke="#0c1326" stroke-width="7" stroke-linecap="round"></path>

                        <!-- Happy Mouth (wide open) -->
                        <path class="mouth mouth-happy" d="M 480 340 Q 512 370 544 340" fill="none" stroke="#0c1326" stroke-width="8" stroke-linecap="round"></path>
                        <ellipse class="mouth mouth-happy" cx="512" cy="352" rx="22" ry="12" fill="#0c1326"></ellipse>

                        <!-- Angry Mouth (grimace) -->
                        <path class="mouth mouth-angry" d="M 486 354 Q 512 342 538 354" fill="none" stroke="#0c1326" stroke-width="8" stroke-linecap="round"></path>
                    </g>

                    <!-- NECK -->
                    <rect x="494" y="404" width="36" height="18" rx="8" class="fill-blue outline" stroke-width="6"></rect>

                    <!-- TORSO -->
                    <g id="torso" class="rig">
                        <path d="M 388 425
                                 Q 388 407 406 407
                                 L 618 407
                                 Q 636 407 636 425
                                 L 636 580
                                 Q 636 605 611 605
                                 L 413 605
                                 Q 388 605 388 580 Z"
                              class="fill-white outline"></path>
                        <path d="M 624 416
                                 Q 630 420 630 430
                                 L 630 575
                                 Q 630 592 614 596
                                 L 614 425
                                 Q 614 415 624 416 Z"
                              class="soft"></path>
                        <text x="512" y="529" text-anchor="middle"
                              font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                              font-size="88" font-weight="800"
                              fill="#5e7ef7">&lt;/&gt;</text>
                    </g>

                    <!-- PELVIS -->
                    <g id="pelvis" class="rig">
                        <path d="M 438 622
                                 L 586 622
                                 L 611 675
                                 L 512 720
                                 L 413 675 Z"
                              class="fill-white outline"></path>
                        <path d="M 438 622
                                 L 466 622
                                 L 430 675
                                 L 413 675 Z"
                              class="soft"></path>
                        <circle cx="404" cy="710" r="22" class="fill-blue outline"></circle>
                        <circle cx="620" cy="710" r="22" class="fill-blue outline"></circle>
                    </g>

                    <!-- LEFT ARM -->
                    <g id="leftArm" class="rig">
                        <circle cx="366" cy="464" r="18" class="fill-blue outline"></circle>
                        <rect x="322" y="472" width="54" height="110" rx="27"
                              class="fill-white outline"
                              transform="rotate(12 359 527)"></rect>
                        <circle cx="334" cy="570" r="14" class="fill-blue outline"></circle>
                        <g class="piece" transform="translate(304 688)">
                            <use href="#simpleHand"></use>
                        </g>
                    </g>

                    <!-- RIGHT ARM -->
                    <g id="rightArm" class="rig">
                        <circle cx="658" cy="464" r="18" class="fill-blue outline"></circle>
                        <rect x="648" y="472" width="54" height="110" rx="27"
                              class="fill-white outline"
                              transform="rotate(-12 665 527)"></rect>
                        <circle cx="690" cy="570" r="14" class="fill-blue outline"></circle>
                        <g class="piece" transform="translate(720 688) scale(-1 1)">
                            <use href="#simpleHand"></use>
                        </g>
                    </g>

                    <!-- LEFT LEG -->
                    <g id="leftLeg" class="rig">
                        <circle cx="404" cy="710" r="22" class="fill-blue outline"></circle>
                        <rect x="368" y="728" width="54" height="112" rx="27"
                              class="fill-white outline"
                              transform="rotate(4 405 784)"></rect>
                        <g class="piece" transform="translate(350 860)">
                            <use href="#simpleFoot"></use>
                        </g>
                    </g>

                    <!-- RIGHT LEG -->
                    <g id="rightLeg" class="rig">
                        <circle cx="620" cy="710" r="22" class="fill-blue outline"></circle>
                        <rect x="604" y="728" width="54" height="112" rx="27"
                              class="fill-white outline"
                              transform="rotate(-4 621 784)"></rect>
                        <g class="piece" transform="translate(674 860) scale(-1 1)">
                            <use href="#simpleFoot"></use>
                        </g>
                    </g>

                    <!-- SKATEBOARD -->
                    <g id="skateboard">
                        <!-- deck underside -->
                        <path d="M270 900 C285 930 330 940 390 938 L634 938 C694 940 739 930 754 900 C739 888 698 888 670 890 L354 890 C326 888 285 888 270 900 Z"
                              class="fill-white outline"></path>
                        <!-- deck top (uses --blue which flips to pink for girl-bot via CSS vars) -->
                        <path d="M294 892 C309 903 338 907 372 907 L652 907 C686 907 715 903 730 892 C714 882 687 882 656 884 L368 884 C337 882 310 882 294 892 Z"
                              class="fill-blue"></path>
                        <!-- highlight -->
                        <path d="M320 888 L680 888 C666 893 646 895 620 895 L380 895 C354 895 334 893 320 888 Z"
                              fill="rgba(255,255,255,.30)" stroke="none"></path>
                        <!-- trucks -->
                        <g class="outline" fill="none" stroke-width="6">
                            <path d="M405 907 L392 928"/>
                            <path d="M619 907 L632 928"/>
                        </g>
                        <!-- wheels -->
                        <g>
                            <circle cx="385" cy="946" r="19" class="fill-blue outline"/>
                            <circle cx="639" cy="946" r="19" class="fill-blue outline"/>
                            <circle cx="385" cy="946" r="8" class="fill-white outline" stroke-width="5"/>
                            <circle cx="639" cy="946" r="8" class="fill-white outline" stroke-width="5"/>
                        </g>
                    </g>

                    <!-- Ground Shadow -->
                    <ellipse id="ground-shadow" cx="512" cy="962" rx="190" ry="10" fill="rgba(0,0,0,.06)"></ellipse>

                    <!-- Stomp Impact Effects (hidden by default) -->
                    <g id="stomp-fx" class="stomp-effects">
                        <line x1="320" y1="870" x2="290" y2="890" stroke="#5e7ef7" stroke-width="5" stroke-linecap="round" opacity="0"/>
                        <line x1="350" y1="880" x2="330" y2="910" stroke="#5e7ef7" stroke-width="4" stroke-linecap="round" opacity="0"/>
                        <line x1="380" y1="870" x2="370" y2="900" stroke="#5e7ef7" stroke-width="3" stroke-linecap="round" opacity="0"/>
                    </g>
                </svg>
            </div>
        </div>
    </div>

    <script nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;
    }

    private _getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    dispose(): void {
        this._view = undefined;
        this._pendingMessages = [];
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
    }
}
