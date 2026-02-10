# 🐉 AI Dungeon Master

An AI-powered D&D dungeon master that runs campaigns, generates quests, and responds to player actions in real-time.

## Features

- 🤖 AI-powered storytelling (OpenAI GPT-4)
- 🎭 Character creation with persistent stats
- 📜 Dynamic quest generation
- 💾 Save/load campaigns
- 🎲 Built-in dice rolling
- 🗺️ Persistent world memory

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```env
OPENAI_API_KEY=your_openai_api_key
PORT=3000
```

3. Start server:
```bash
npm start
```

4. Open `http://localhost:3000`

## How to Play

1. Create a character
2. The AI generates your starting scenario
3. Type actions naturally ("I search the room", "I talk to the guard")
4. The AI responds with story, dialogue, and outcomes
5. Your campaign saves automatically
