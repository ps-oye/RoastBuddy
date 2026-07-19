# Roast Buddy

<p align="center">
  <img src="https://github.com/ps-oye/RoastBuddy/blob/main/media/icon_transparent.png" 
       alt="Roast Buddy Icon" width="150"/>
</p>

Roast Buddy is a VS Code extension that adds humor to your workflow with animated sidebar characters. It roasts you when you accept AI‑generated code (Github Copilot Chat), and cheers you when you write or edit code manually — making every coding session sarcastically delightful.

---

## 🎬 Demo

![Demo](https://github.com/ps-oye/RoastBuddy/blob/main/media/demo.gif)

---

## Installation

From VS Code Marketplace:  
👉 [Install PS Oye Roast Buddy](https://marketplace.visualstudio.com/items?itemName=ps-oye.roast-buddy)

Or via CLI:
```bash
ext install ps-oye.roast-buddy
```

## Features

### Two CSS-Only Bot Characters

<p align="center">
  <img src="https://github.com/ps-oye/RoastBuddy/blob/main/media/boyBot.png" 
       alt="Roast Buddy Icon" width="150"/>
  &nbsp;&nbsp;&nbsp;
  <img src="https://github.com/ps-oye/RoastBuddy/blob/main/media/girlBot.png" 
       alt="Demo" width="400"/>
</p>


### Languages

- **English & Hinglish** - Message language is configurable in settings; dynamic messages respect the chosen language.

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

## 🌟 Why Star This Repo
Every ⭐ helps PS-Oye roast more developers worldwide.
Show your support — it’s free, funny, and fuels creativity.

## 🤝 Contribute
Got a new roast line or animation idea? Fork it and make PS-Oye sassier.
PRs welcome — humor encouraged.

## 🔗 Links
- Marketplace: https://marketplace.visualstudio.com/publishers/ps-oye
- Follow me on Instagram: [@ps_oye](https://www.instagram.com/ps_oye/)

## License

MIT
