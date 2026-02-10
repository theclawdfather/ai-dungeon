const express = require('express');
const path = require('path');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// AI Provider setup
const AI_PROVIDER = process.env.AI_PROVIDER || 'mock'; // 'openai', 'groq', 'kimi', or 'mock'

let openai = null;
if (AI_PROVIDER === 'openai' && process.env.OPENAI_API_KEY) {
  const OpenAI = require('openai');
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} else if (AI_PROVIDER === 'groq' && process.env.GROQ_API_KEY) {
  const OpenAI = require('openai');
  openai = new OpenAI({ 
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1'
  });
} else if (AI_PROVIDER === 'kimi' && process.env.KIMI_API_KEY) {
  const OpenAI = require('openai');
  openai = new OpenAI({ 
    apiKey: process.env.KIMI_API_KEY,
    baseURL: 'https://api.moonshot.cn/v1'
  });
}

// LowDB setup
const adapter = new JSONFile('campaigns.json');
const defaultData = { campaigns: [] };
const db = new Low(adapter, defaultData);

app.use(express.json());
app.use(express.static('public'));

// Initialize database
async function initDb() {
  await db.read();
  db.data = db.data || { campaigns: [] };
  await db.write();
}

// Generate AI response (or mock response)
async function generateDMResponse(messages, campaignContext) {
  const systemPrompt = `You are an expert Dungeon Master running a D&D 5e campaign. 

CAMPAIGN CONTEXT:
${campaignContext}

RULES:
1. Never break character - you ARE the DM
2. Describe scenes vividly but concisely (2-3 paragraphs max)
3. When players take actions, describe outcomes creatively
4. For combat: ask for dice rolls, describe hits/misses cinematically
5. Track HP, inventory, and quest progress implicitly
6. Introduce NPCs with personality and motivation
7. Offer 2-3 clear choices when appropriate
8. End responses with "What do you do?" or similar prompt

Keep responses engaging and move the story forward.`;

  // Mock mode - no API needed
  if (AI_PROVIDER === 'mock' || !openai) {
    return generateMockResponse(messages, campaignContext);
  }

  // Groq and Kimi use different model names
  let model;
  if (AI_PROVIDER === 'groq') {
    model = 'llama3-8b-8192';
  } else if (AI_PROVIDER === 'kimi') {
    model = 'moonshot-v1-8k'; // or moonshot-v1-32k, moonshot-v1-128k
  } else {
    model = 'gpt-4o-mini';
  }

  const response = await openai.chat.completions.create({
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ],
    temperature: 0.8,
    max_tokens: 1000
  });

  return response.choices[0].message.content;
}

// Mock responses for demo mode (no API needed)
function generateMockResponse(messages, context) {
  const playerMessages = messages.filter(m => m.role === 'user');
  const lastMessageRaw = playerMessages[playerMessages.length - 1]?.content || '';
  const lastMessage = lastMessageRaw.toLowerCase();
  
  // Extract character info from context
  const charMatch = context.match(/Character: (.+?), a level 1 (.+?) (.+?)\./);
  const charName = charMatch ? charMatch[1] : 'Adventurer';
  const charRace = charMatch ? charMatch[2] : 'Human';
  const charClass = charMatch ? charMatch[3] : 'Fighter';
  
  // Opening scene
  if (lastMessage.includes('begin') || playerMessages.length === 1) {
    return `The tavern door creaks as ${charName} steps inside, the warmth of the hearth washing over you. The Rusty Tankard is alive with evening activity—merchants argue over prices in the corner, a bard strums a melancholy tune, and the smell of roasting meat fills the air.

A burly bartender with a scarred eye spots you and nods. "Fresh blood, eh? We don't get many ${charRace} ${charClass}s in these parts." He slides a mug across the counter. "Word is there's trouble down at the old well. Something's been taking the villagers at night. The mayor's offering 50 gold to anyone brave enough to investigate."

In the shadows near the door, a hooded figure watches you intently, their face hidden beneath a dark cloak.

What do you do?`;
  }
  
  // More dynamic responses based on user input
  const action = lastMessageRaw.toLowerCase();
  
  // Check for specific actions and respond accordingly
  if (action.includes('drink') || action.includes('ale') || action.includes('beer') || action.includes('wine')) {
    return `You raise the mug and take a long drink. The ale is surprisingly good—dark, rich, with hints of honey and something you can't quite place.

"Good stuff, right?" the bartender grins. "Brewed it myself. Secret family recipe." He leans closer, lowering his voice. "Speaking of secrets... you didn't hear this from me, but there's been talk of strange symbols appearing on doors around town. People are scared."

A nearby patron glances nervously in your direction, then quickly looks away.

What do you do?`;
  }
  
  if (action.includes('well') || action.includes('investigate')) {
    return `You make your way to the old well at the edge of town. The sun is setting, casting long shadows across the deserted square. The well hasn't been used in years—the wood is rotted, the rope frayed.

As you approach, you notice scratch marks on the stone rim. Deep gouges, like something with claws was trying to climb out. The air smells of sulfur and decay.

From below, you hear a faint scraping sound. Something is down there.

What do you do? (Climb down, throw something in, listen more carefully, or return to town?)`;
  }
  
  if (action.includes('leave') || action.includes('exit') || action.includes('go')) {
    return `You step out into the cool night air. The streets are quieter now, most villagers having retreated to their homes. Torchlight flickers in windows, and somewhere a dog barks at unseen shadows.

As you walk, you notice posters on the notice board:

• "REWARD: Missing dog, answers to 'Biscuit'"
• "HELP WANTED: Rat problem in the cellar"
• "WARNING: Curfew in effect after dark"

A town guard eyes you suspiciously from across the street, hand resting on his sword hilt.

What do you do?`;
  }
  
  if (action.includes('sleep') || action.includes('rest') || action.includes('inn') || action.includes('room')) {
    return `You secure a room for the night—5 silver pieces for a small chamber above the tavern. The bed is lumpy, the blanket thin, but it's better than sleeping in the wild.

In the middle of the night, you're awakened by a scream. High-pitched, terrified, cutting through the silence. It came from somewhere outside.

You leap to your feet, heart pounding. Through the window, you see torchlight dancing in the streets below.

What do you do? (Investigate, barricade the door, or hide?)`;
  }
  
  if (action.includes('question') || action.includes('ask') || action.includes('interrogate')) {
    return `"What do you know about these disappearances?" you ask pointedly.

The bartender glances around nervously before answering. "Three people this week. All taken at night. No signs of forced entry, no struggle. Just... gone." He wipes the counter absently. "The mayor thinks it's bandits, but I know bandits. Bandits leave messes. This is something else."

He pulls a folded piece of parchment from his apron. "Found this near the mill. Don't know what it means, but it gives me chills."

The parchment shows a crude drawing of an eye surrounded by strange runes.

What do you do?`;
  }
  
  if (action.includes('steal') || action.includes('pickpocket') || action.includes('sneak')) {
    return `You attempt to move unseen through the crowd. Your fingers brush against a merchant's coin purse—heavy with gold.

**Roll for Sleight of Hand!**

The merchant turns suddenly, eyes narrowing. "Hey! What do you think you're doing?" His hand goes to his belt where a club hangs. Two nearby guards look in your direction.

This could get ugly fast.

What do you do? (Talk your way out, run, fight, or surrender?)`;
  }
  
  if (action.includes('magic') || action.includes('spell') || action.includes('cast')) {
    return `You weave the arcane gestures and speak the words of power. Energy crackles at your fingertips as the spell takes form.

The room falls silent. Patrons stare in awe and fear. Magic is rare in these parts, and those who wield it command respect... or suspicion.

The bartender bows his head slightly. "A wizard walks among us." He pushes another drink toward you, this one on the house. "Perhaps you are the one the prophecies spoke of."

A hooded figure in the corner stands abruptly and hurries toward the door, glancing back at you with obvious fear.

What do you do?`;
  }
  
  // Generic contextual response that references what they actually said
  if (action.includes('tavern') || action.includes('bar')) {
    return `You make your way to the bar. The bartender—a grizzled dwarf with a magnificent beard—gives you a nod. "What'll it be, ${charClass.toLowerCase()}?"

The tavern buzzes with conversation. You overhear snippets:
- "...saw lights in the old crypt again..."
- "...my cousin swears he saw a dragon..."
- "...the mayor's hiding something..."

A scuffle breaks out near the dice table. Someone's cheating, or someone's accused of it.

What do you do?`;
  }
  
  if (action.includes('talk') || action.includes('speak') || action.includes('approach')) {
    return `You approach the mysterious figure. They tense as you near, hand moving to their weapon.

"I mean no harm," you say, raising your hands slightly.

The figure studies you for a long moment, then relaxes—a fraction. "You're the newcomer. The one asking questions." A woman's voice, rough from disuse. "Be careful what questions you ask in this town. Some answers are dangerous."

She slides a folded note across the table. "If you're serious about helping, be at the old windmill at midnight. Come alone."

Before you can respond, she stands and disappears into the crowd.

What do you do?`;
  }
  
  if (action.includes('fight') || action.includes('attack') || action.includes('hit') || action.includes('punch')) {
    return `Violence erupts! You lash out with practiced precision.

**Combat Begins!**

Your strike connects with a satisfying crunch. The target staggers back, eyes wide with surprise and pain. Around you, the tavern erupts into chaos—patrons screaming, chairs overturning, drinks spilling.

The town guard bursts through the door, weapons drawn. "HOLD!"

You have seconds before they reach you.

What do you do? (Surrender, flee, or stand your ground?)`;
  }
  
  if (action.includes('search') || action.includes('look') || action.includes('examine') || action.includes('inspect')) {
    return `You carefully examine your surroundings. Details emerge from the shadows:

• Scratches on the floorboards—recent, deep
• A half-burned letter in the fireplace, still legible: "...the ritual must be completed by the blood moon..."
• A hidden compartment under the loose floorboard containing a silver dagger engraved with strange runes
• Fresh muddy boot prints leading toward the back door

Someone was here recently, and they were in a hurry.

What do you do?`;
  }
  
  if (action.includes('run') || action.includes('flee') || action.includes('escape')) {
    return `You turn and run, boots pounding against cobblestones. Behind you, shouts and the sounds of pursuit.

You duck through narrow alleys, leaping over barrels and dodging laundry lines. The town is a maze, but adrenaline sharpens your senses.

You burst through a doorway into—an empty warehouse. Dust motes dance in shafts of moonlight. You're alone. For now.

Through a cracked window, you see torchlight bobbing in the streets. They're still searching.

What do you do? (Hide, keep running, or prepare an ambush?)`;
  }
  
  if (action.includes('help') || action.includes('save') || action.includes('rescue')) {
    return `Your heart swells with righteous determination. These people need help, and you're the one to give it.

An old woman approaches, tears streaming down her face. "Please, ${charClass.toLowerCase()}, you have to help me! My granddaughter was taken last night. She's only eight years old. The guards won't listen—they say she's just another runaway. But I know better. I saw the shadows that took her."

She grips your arm with surprising strength. "I'll give you everything I have. Just bring her back."

What do you do?`;
  }
  
  // Truly generic response that still acknowledges their action
  const genericResponses = [
    `"${lastMessageRaw}," you declare. The world seems to pause, considering your words.

The tavern falls quiet. All eyes turn to you. Somewhere, a glass drops and shatters.

Then, slowly, conversation resumes—but now they're watching. Waiting to see what you'll do next.

What do you do?`,

    `You ${lastMessageRaw.includes(' ') ? lastMessageRaw.split(' ')[0] : lastMessageRaw} with determination. The path ahead is uncertain, but ${charName} did not become a ${charClass} by playing it safe.

A cool breeze drifts through the open door, carrying the scent of rain and distant pine. Adventure calls.

What do you do?`,

    `Your action—"${lastMessageRaw}"—echoes in the silence. For a moment, nothing happens. Then:

The floorboards creak. A door slams somewhere upstairs. The candle on your table flickers and dies, plunging you into shadow.

When your eyes adjust, you notice something you hadn't before: a symbol carved into the table, glowing faintly with inner light.

What do you do?`
  ];
  
  // Pick response based on message count to add variety
  return genericResponses[playerMessages.length % genericResponses.length];
}

Around you, the adventure continues to unfold. Every choice shapes your destiny.

What do you do?`;
}

// Create new campaign
app.post('/api/campaigns', async (req, res) => {
  try {
    const { character } = req.body;
    const campaignId = uuidv4();
    
    const campaign = {
      id: campaignId,
      character,
      createdAt: new Date().toISOString(),
      messages: [],
      currentLocation: 'Tavern',
      activeQuest: null
    };
    
    // Generate opening scene
    const context = `New campaign starting. Character: ${character.name}, a level 1 ${character.race} ${character.class}. Backstory: ${character.backstory || 'Mysterious wanderer seeking adventure.'}`;
    
    console.log('Generating opening scene for:', character.name);
    
    const openingScene = await generateDMResponse(
      [{ role: 'user', content: 'Begin the adventure. Introduce the starting scenario.' }],
      context
    );
    
    campaign.messages.push({
      role: 'assistant',
      content: openingScene,
      timestamp: new Date().toISOString()
    });
    
    db.data.campaigns.push(campaign);
    await db.write();
    
    res.json({ campaignId, openingScene });
  } catch (err) {
    console.error('Error creating campaign:', err.message);
    console.error(err.stack);
    res.status(500).json({ error: 'Failed to create campaign', details: err.message });
  }
});

// Get campaign
app.get('/api/campaigns/:id', async (req, res) => {
  try {
    await db.read();
    const campaign = db.data.campaigns.find(c => c.id === req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Send player action
app.post('/api/campaigns/:id/action', async (req, res) => {
  try {
    const { action } = req.body;
    await db.read();
    
    const campaign = db.data.campaigns.find(c => c.id === req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    
    // Add player message
    campaign.messages.push({
      role: 'user',
      content: action,
      timestamp: new Date().toISOString()
    });
    
    // Build context for AI
    const context = `Character: ${campaign.character.name}, ${campaign.character.race} ${campaign.character.class}. 
Current location: ${campaign.currentLocation}
Total messages: ${campaign.messages.length}`;
    
    // Get AI response
    const messages = campaign.messages.slice(-10); // Last 10 for context
    const response = await generateDMResponse(messages, context);
    
    // Add AI response
    campaign.messages.push({
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString()
    });
    
    await db.write();
    res.json({ response, campaign });
  } catch (err) {
    console.error('Error processing action:', err);
    res.status(500).json({ error: 'Failed to process action' });
  }
});

// Roll dice
app.get('/api/roll/:sides', (req, res) => {
  const sides = parseInt(req.params.sides) || 20;
  const roll = Math.floor(Math.random() * sides) + 1;
  res.json({ roll, sides });
});

// List all campaigns
app.get('/api/campaigns', async (req, res) => {
  await db.read();
  res.json(db.data.campaigns.map(c => ({
    id: c.id,
    character: c.character,
    createdAt: c.createdAt,
    messageCount: c.messages.length
  })));
});

// Start server
initDb().then(() => {
  app.listen(port, () => {
    console.log(`🐉 AI Dungeon Master running on http://localhost:${port}`);
  });
});
