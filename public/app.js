const API_URL = '';
let currentCampaignId = null;
let currentCharacter = null;

// DOM Elements
const landingScreen = document.getElementById('landingScreen');
const characterScreen = document.getElementById('characterScreen');
const gameScreen = document.getElementById('gameScreen');
const loading = document.getElementById('loading');

// Navigation
function showLanding() {
    landingScreen.classList.remove('hidden');
    characterScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    loadCampaigns();
}

function showCharacter() {
    landingScreen.classList.add('hidden');
    characterScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
}

function showGame() {
    landingScreen.classList.add('hidden');
    characterScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
}

function showLoading() {
    loading.classList.remove('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

// Create new campaign
document.getElementById('newCampaignBtn').addEventListener('click', () => {
    showCharacter();
});

// Load campaigns list
document.getElementById('loadCampaignBtn').addEventListener('click', async () => {
    const list = document.getElementById('campaignList');
    list.classList.toggle('hidden');
    if (!list.classList.contains('hidden')) {
        await loadCampaigns();
    }
});

async function loadCampaigns() {
    try {
        const res = await fetch(`${API_URL}/api/campaigns`);
        const campaigns = await res.json();
        
        const container = document.getElementById('campaignsContainer');
        if (campaigns.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary)">No campaigns yet. Start a new adventure!</p>';
            return;
        }
        
        container.innerHTML = campaigns.map(c => `
            <div class="campaign-item" onclick="resumeCampaign('${c.id}')">
                <div>
                    <strong>${c.character.name}</strong>
                    <div style="font-size: 0.85rem; color: var(--text-secondary)">
                        ${c.character.race} ${c.character.class} • ${c.messageCount} messages
                    </div>
                </div>
                <span style="color: var(--text-secondary)">${new Date(c.createdAt).toLocaleDateString()}</span>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error loading campaigns:', err);
    }
}

async function resumeCampaign(id) {
    try {
        showLoading();
        const res = await fetch(`${API_URL}/api/campaigns/${id}`);
        const campaign = await res.json();
        
        currentCampaignId = id;
        currentCharacter = campaign.character;
        
        document.getElementById('charInfo').textContent = `${campaign.character.name} • ${campaign.character.race} ${campaign.character.class}`;
        
        // Render messages
        const storyLog = document.getElementById('storyLog');
        storyLog.innerHTML = '';
        campaign.messages.forEach(msg => {
            addMessage(msg.role === 'assistant' ? 'dm' : 'player', msg.content);
        });
        
        hideLoading();
        showGame();
        scrollToBottom();
    } catch (err) {
        console.error('Error resuming campaign:', err);
        hideLoading();
        alert('Failed to load campaign');
    }
}

// Character creation
document.getElementById('characterForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const character = {
        name: document.getElementById('charName').value,
        race: document.getElementById('charRace').value,
        class: document.getElementById('charClass').value,
        backstory: document.getElementById('charBackstory').value
    };
    
    try {
        showLoading();
        const res = await fetch(`${API_URL}/api/campaigns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ character })
        });
        
        const data = await res.json();
        currentCampaignId = data.campaignId;
        currentCharacter = character;
        
        document.getElementById('charInfo').textContent = `${character.name} • ${character.race} ${character.class}`;
        
        // Show opening scene
        const storyLog = document.getElementById('storyLog');
        storyLog.innerHTML = '';
        addMessage('dm', data.openingScene);
        
        hideLoading();
        showGame();
        scrollToBottom();
    } catch (err) {
        console.error('Error creating campaign:', err);
        hideLoading();
        alert('Failed to create campaign. Check your OpenAI API key.');
    }
});

// Add message to story log
function addMessage(type, content) {
    const storyLog = document.getElementById('storyLog');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}`;
    
    const header = type === 'dm' ? '🐉 Dungeon Master' : '⚔️ You';
    msgDiv.innerHTML = `
        <div class="message-header">${header}</div>
        <div>${formatContent(content)}</div>
    `;
    
    storyLog.appendChild(msgDiv);
    scrollToBottom();
}

function formatContent(content) {
    // Convert newlines to breaks
    return content.replace(/\n/g, '<br>');
}

function scrollToBottom() {
    const storyLog = document.getElementById('storyLog');
    storyLog.scrollTop = storyLog.scrollHeight;
}

// Send player action
async function sendAction(action) {
    if (!action.trim() || !currentCampaignId) return;
    
    // Add player message to log
    addMessage('player', action);
    document.getElementById('actionInput').value = '';
    
    showLoading();
    
    try {
        const res = await fetch(`${API_URL}/api/campaigns/${currentCampaignId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
        });
        
        const data = await res.json();
        addMessage('dm', data.response);
        hideLoading();
        scrollToBottom();
    } catch (err) {
        console.error('Error sending action:', err);
        hideLoading();
        alert('Failed to get DM response');
    }
}

// Event listeners
document.getElementById('sendAction').addEventListener('click', () => {
    const action = document.getElementById('actionInput').value;
    sendAction(action);
});

document.getElementById('actionInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendAction(e.target.value);
    }
});

// Quick action buttons
document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        sendAction(action);
    });
});

// Roll dice
document.getElementById('rollDiceBtn').addEventListener('click', async () => {
    try {
        const res = await fetch(`${API_URL}/api/roll/20`);
        const data = await res.json();
        
        const diceResult = document.getElementById('diceResult');
        diceResult.classList.remove('hidden', 'crit', 'fail');
        
        let message = `🎲 Rolled ${data.roll}`;
        if (data.roll === 20) {
            message += ' - CRITICAL SUCCESS!';
            diceResult.classList.add('crit');
        } else if (data.roll === 1) {
            message += ' - CRITICAL FAILURE!';
            diceResult.classList.add('fail');
        }
        
        diceResult.textContent = message;
        
        setTimeout(() => {
            diceResult.classList.add('hidden');
        }, 3000);
    } catch (err) {
        console.error('Error rolling dice:', err);
    }
});

// Back to menu
document.getElementById('backToMenu').addEventListener('click', () => {
    showLanding();
});

// Load campaigns on startup
showLanding();
