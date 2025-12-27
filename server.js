import express from 'express';
import { GameSession } from './game-engine.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Store active game sessions
const sessions = new Map();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Root endpoint
app.get('/', (req, res) => {
  res.sendFile('/home/runner/work/conscience/conscience/public/index.html');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: Date.now() });
});

// Start new game session
app.post('/api/session/start', (req, res) => {
  const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const session = new GameSession(playerId);
  sessions.set(playerId, session);

  res.json({
    playerId,
    message: 'Game session started',
    sessionState: session.getSessionState()
  });
});

// Process player action
app.post('/api/action', (req, res) => {
  const { playerId, action } = req.body;

  if (!playerId || !action) {
    return res.status(400).json({ error: 'Missing playerId or action' });
  }

  const session = sessions.get(playerId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  try {
    const result = session.processAction(action);
    res.json({
      success: true,
      result,
      sessionState: session.getSessionState()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process action', details: error.message });
  }
});

// Get session state
app.get('/api/session/:playerId', (req, res) => {
  const { playerId } = req.params;
  const session = sessions.get(playerId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({
    sessionState: session.getSessionState()
  });
});

// Get player profile
app.get('/api/profile/:playerId', (req, res) => {
  const { playerId } = req.params;
  const session = sessions.get(playerId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({
    profile: session.ai.getProfile(),
    predictions: session.ai.getPredictions()
  });
});

// End session
app.delete('/api/session/:playerId', (req, res) => {
  const { playerId } = req.params;
  const session = sessions.get(playerId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const finalState = session.getSessionState();
  sessions.delete(playerId);

  res.json({
    message: 'Session ended',
    finalState
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎮 Conscience Game Server running on port ${PORT}`);
  console.log(`📊 Predictive World AI: Active`);
  console.log(`🌍 Dynamic World System: Online`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});
