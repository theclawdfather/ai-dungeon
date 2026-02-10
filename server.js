const express = require('express');
const OpenAI = require('openai');
const path = require('path');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// OpenAI setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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

// Generate AI response
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

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ],
    temperature: 0.8,
    max_tokens: 1000
  });

  return response.choices[0].message.content;
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
