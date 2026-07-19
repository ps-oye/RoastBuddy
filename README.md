# Roast Buddy

> Animated bot characters that roast you for blindly accepting AI code and cheer you when you manually type or edit code.

Roast Buddy is a VS Code extension that makes coding more engaging and humorous by adding animated side-bar characters that react to how you handle AI-generated code suggestions.

## Features

### Two CSS-Only Bot Characters

- **Boy Bot** - Blue headset robot buddy
- **Girl Bot** - Pink bow robot buddy

Both bots are built with HTML and CSS only. Their head, body, arms, legs, bulb, headset, and accessories are separate elements so reactions can animate naturally without swapping images.

### Smart Roasts

When you accept a large block of AI-generated code without reviewing it, your bot:

- Stops walking and shifts into an angry stance
- Points forward in a scolding gesture
- Stomps one leg repeatedly
- Switches the bulb to a strong red glow
- Shows a witty roast in a comic-style speech bubble

### Encouraging Cheers

When you manually type or edit code instead of accepting AI-generated suggestions, your bot:

- Pauses walking and jumps with excitement
- Spreads arms and legs.
- Switches the bulb to a bright green flash
- Shows an encouraging cheer in a comic-style speech bubble

### Dynamic AI Messages (Optional)

Enable dynamic mode to get uniquely generated roasts and cheers powered by your IDE's language model.

> Note: Dynamic mode consumes your Copilot plan tokens. It is disabled by default.

### Roast Intensity Levels

- **Mild** - Gentle teasing, safe for sensitive souls
- **Medium** - Balanced wit, the sweet spot
- **Savage** - No mercy, enter at your own risk

## Installation

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "Roast Buddy"
4. Click Install

Or install from VSIX:

```bash
code --install-extension roast-buddy-0.1.0.vsix
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `roastBuddy.enabled` | `true` | Enable/disable reactions |
| `roastBuddy.characterType` | `robot` | Choose character: `robot`, `girlBot` |
| `roastBuddy.roastIntensity` | `medium` | Roast level: `mild`, `medium`, `savage` |
| `roastBuddy.useDynamicMessages` | `false` | Use AI-generated messages (consumes tokens) |
| `roastBuddy.lineThreshold` | `5` | Lines to trigger "full-page" detection |
| `roastBuddy.cooldownMs` | `10000` | Cooldown between reactions (ms) |

## Commands

- **Roast Buddy: Show Character** - Opens the side-bar character view
- **Roast Buddy: Hide Character** - Returns focus to the active editor
- **Roast Buddy: Toggle Dynamic AI Messages** - Switches between AI-generated and hardcoded messages

## Privacy & Safety

- All humor is witty and lighthearted
- Dynamic mode clearly discloses token consumption before activation
- Works fully offline with curated fallback messages
- Uses original CSS-only character art, no image replacement for reactions

## License

MIT
