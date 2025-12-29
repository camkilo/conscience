import express from 'express';
import { GameSession } from './game-engine.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Store active game sessions
const sessions = new Map();

// Middleware
app.use(express.json());

// Configure MIME types and cache headers for static assets
app.use(express.static('public', {
  setHeaders: (res, path) => {
    // Set proper MIME type for GLB files
    if (path.endsWith('.glb') || path.endsWith('.gltf')) {
      res.setHeader('Content-Type', 'model/gltf-binary');
      // Use shorter cache in development, longer in production
      const cacheMaxAge = process.env.NODE_ENV === 'production' ? 31536000 : 3600;
      res.setHeader('Cache-Control', `public, max-age=${cacheMaxAge}`);
    }
    // Set CORS headers for all assets
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  },
  // Enable ETag for better performance
  etag: true,
  index: false
}));

// Serve Three.js dependencies
app.use('/three', express.static('node_modules/three/build', {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));
app.use('/three-jsm', express.static('node_modules/three/examples/jsm', {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));
app.use('/cannon-es', express.static('node_modules/cannon-es/dist', {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Root endpoint
// Note: In production, add rate limiting middleware (e.g., express-rate-limit)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: Date.now() });
});

// Assets verification endpoint - checks if GLB files are available
app.get('/api/assets/verify', (req, res) => {
  const assetsDir = path.join(__dirname, 'public', 'assets');
  const requiredAssets = ['player.glb', 'enemy.glb', 'floor.glb', 'ramp.glb'];
  
  const assetStatus = {};
  let allAvailable = true;
  
  requiredAssets.forEach(asset => {
    const assetPath = path.join(assetsDir, asset);
    const exists = fs.existsSync(assetPath);
    const stats = exists ? fs.statSync(assetPath) : null;
    
    assetStatus[asset] = {
      exists,
      size: stats ? stats.size : 0,
      path: `/assets/${asset}`,
      mimeType: 'model/gltf-binary'
    };
    
    if (!exists) {
      allAvailable = false;
    }
  });
  
  res.json({
    status: allAvailable ? 'ok' : 'partial',
    message: allAvailable ? 'All assets available' : 'Some assets missing',
    assets: assetStatus,
    timestamp: Date.now()
  });
});

// Start new game session
app.post('/api/session/start', (req, res) => {
  const playerId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
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
