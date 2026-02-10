# 🐉 AI Dungeon Master

An AI-powered D&D dungeon master that runs campaigns, generates quests, and responds to player actions in real-time.

## Features

- 🤖 **AI-powered storytelling** (OpenAI GPT-4o-mini)
- 🎭 **Character creation** with race, class, and backstory
- 📜 **Dynamic quest generation** — infinite adventures
- 💾 **Save/load campaigns** — resume anytime
- 🎲 **Built-in dice rolling** — d20 with critical hit/fail
- 🎨 **Dark fantasy UI** — immersive experience
- ⚔️ **Natural language actions** — just type what you want to do

## Quick Start

### 1. Get an OpenAI API Key

Go to [platform.openai.com](https://platform.openai.com) and create an API key.

### 2. Install & Run

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Start the server
npm start
```

### 3. Play!

Open `http://localhost:3000` in your browser.

## How to Play

1. **Create a Character**
   - Choose name, race (Human, Elf, Dwarf, etc.)
   - Pick class (Fighter, Wizard, Rogue, etc.)
   - Add a backstory (optional but fun!)

2. **Begin Your Adventure**
   - The AI generates a unique opening scene
   - You're dropped into the world immediately

3. **Take Actions**
   - Type naturally: *"I search the room"*, *"Talk to the bartender"*, *"Cast fireball!"*
   - Use quick buttons for common actions
   - Roll dice when the DM asks

4. **Your Story Evolves**
   - Every choice matters
   - The AI remembers what you've done
   - Quests emerge organically

## Example Gameplay

**You:** *I approach the suspicious figure in the corner*

**DM:** *The hooded figure tenses as you approach. A gloved hand drifts toward a concealed blade. "Keep walking, stranger," comes a rasping voice. "Some shadows bite."*

**You:** *"I'm not looking for trouble. Just information about the missing shipments."*

**DM:** *The figure pauses, then slowly pushes back the hood to reveal...*

## Tech Stack

- **Backend:** Node.js, Express, OpenAI API
- **Database:** LowDB (JSON file)
- **Frontend:** Vanilla JS, CSS3

## Cost

Uses OpenAI GPT-4o-mini (~$0.15 per campaign). Very affordable!

## Tips

- Be descriptive in your actions — the AI responds to details
- Try creative solutions — the AI rewards clever thinking
- Your campaign auto-saves after every action
- Create multiple campaigns with different characters
