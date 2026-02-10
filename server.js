const express = require('express');
const path = require('path');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// AI Provider setup
const AI_PROVIDER = process.env.AI_PROVIDER || 'mock'; // 'openai', 'groq', or 'mock'

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

  // Groq uses different model names
  const model = AI_PROVIDER === 'groq' ? 'llama3-8b-8192' : 'gpt-4o-mini';

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
  const lastMessage = playerMessages[playerMessages.length - 1]?.content.toLowerCase() || '';
  
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
  
  // Generic responses based on keywords
  if (lastMessage.includes('tavern') || lastMessage.includes('bar')) {
    return `The tavern buzzes with low conversation. You approach the bar and catch snippets of gossip—something about missing livestock, strange lights in the forest, and a merchant offering suspiciously good prices for "rare antiquities."

The bartender leans in close. "You look like you can handle yourself. If you're looking for work, old Thomas hasn't returned from the mill since yesterday. His daughter's offering her grandmother's ring as reward."

A scuffle breaks out near the dice table as someone accuses another of cheating.

What do you do?`;
  }
  
  if (lastMessage.includes('talk') || lastMessage.includes('speak')) {
    return `You approach the figure. They startle briefly, then relax when they see you mean no harm. Pushing back their hood reveals an elven woman with haunted eyes.

"You're the adventurer everyone's talking about," she whispers urgently. "Listen carefully—I don't have much time. The cult of the Dark Star meets tonight at the abandoned chapel on the hill. They're planning something terrible. Something that will affect the entire region."

She presses a silver amulet into your hand. "Take this. It will protect you from their sight. But beware—their leader can see through lies."

Before you can respond, she melts into the crowd and disappears.

What do you do?`;
  }
  
  if (lastMessage.includes('fight') || lastMessage.includes('attack')) {
    return `You ready your weapon as the creature lunges! Roll initiative!

**Combat Begins!**

The goblin snarls, drawing a rusted blade. It's smaller than you but moves with desperate speed. Behind it, you hear more footsteps—reinforcements coming.

**Enemy:** Goblin Scout (HP: 7, AC: 15)
**Status:** The goblin looks nervous but determined.

The goblin charges at you with a wild screech!

What do you do? (Attack, cast a spell, try to reason with it, or flee?)`;
  }
  
  if (lastMessage.includes('search') || lastMessage.includes('look')) {
    return `You carefully examine your surroundings. The room is dust-covered but shows signs of recent activity—footprints in the dirt, a burned-down candle still warm to the touch.

**You find:**
• A leather satchel containing 12 silver pieces and a mysterious key
• A crumpled note: "Meet at the old oak when the moon is high. The artifact is nearly ours."
• Tracks leading toward the back door, heading east

As you search, you hear a distant howl—wolf, or something worse?

What do you do?`;
  }
  
  // Default response
  return `The world responds to your actions. The path ahead is unclear, but fortune favors the bold.

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
