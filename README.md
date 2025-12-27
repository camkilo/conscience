# Conscience - Predictive World AI Game

The game is alive, and it knows what you want to do before you do it — but it doesn't follow you blindly. It manipulates the world, enemies, and even the story to challenge your moral and strategic decisions in real time.

## 🎮 Game Modes

### 🌟 3D Game Mode (New!)
Experience the game in full 3D with immersive WebGL rendering:
- **Full 3D Environment**: Navigate a living 3D world with real-time rendering
- **WASD + Mouse Controls**: Intuitive first-person-style controls
- **Dynamic Combat**: Use abilities with visual effects and cooldowns
- **Enemy AI**: Enemies that track and pursue you in real-time
- **Immersive HUD**: Health bars, ability cooldowns, score tracking
- **Visual Effects**: Particle systems, motion blur, camera shake

### 📊 Classic Mode
Original 2D interface with decision-based gameplay:
- Profile visualization and tracking
- Text-based encounters and choices
- Moral dilemma system

## 🎯 Features

### Predictive World AI
- **Player Behavior Analysis**: The game observes your playstyle in real-time
- **Adaptive AI**: Learns your patterns and predicts your next moves
- **Dynamic Counter-Strategies**: The game prepares counter-measures based on predictions

### Dynamic World Alteration
- **Environment Manipulation**: The world changes based on your decisions
- **Enemy Adaptation**: Enemies adjust their strategies to counter your playstyle
- **Personalized Encounters**: Every challenge is tailored to your unique approach

### Player as Variable, Not Constant
- **Choice Ripple System**: Your decisions create lasting consequences
- **Moral Decision Engine**: Face dilemmas that affect the story and world state
- **Unique Experiences**: No two players experience the same world

### Real-Time Adaptation
- **Live Profile Tracking**: See how the AI categorizes your playstyle
- **5 Key Metrics**: Aggression, Caution, Morality, Exploration, Strategy
- **Transparent Predictions**: The game shows you what it thinks you'll do next

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start the server
npm start

# Open your browser to http://localhost:3000
# Click "Play 3D Game ⚡" for the immersive 3D experience
# Or click "Begin Your Journey (2D)" for the classic mode
```

### 🎮 3D Game Controls

- **WASD**: Move player
- **Mouse**: Control camera angle
- **1**: Attack ability
- **2**: Defend ability
- **3**: Special ability
- **Space**: Dash
- **ESC**: Pause menu

## 🌐 Deployment

### Deploy to Vercel

1. **Via Vercel CLI**:
```bash
npm install -g vercel
vercel
```

2. **Via Vercel Dashboard**:
   - Connect your GitHub repository to Vercel
   - Vercel will auto-detect the configuration from `vercel.json`
   - Deploy with one click

3. **Configuration**:
   - The `vercel.json` file is already configured
   - No additional environment variables required

### Deploy to Render

1. **Via Render Dashboard**:
   - Create a new Web Service
   - Connect your GitHub repository
   - Render will auto-detect the configuration from `render.yaml`
   - Click "Create Web Service"

2. **Via Render Blueprint**:
   - The `render.yaml` file defines the service configuration
   - Automatically sets up health checks and environment

3. **Configuration**:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Health Check Path: `/health`

## 🏗️ Architecture

### Game Engine (`game-engine.js`)

**PredictiveAI Class**
- Observes player actions
- Builds behavioral profile
- Generates predictions about future actions
- Calculates counter-strategies

**DynamicWorld Class**
- Alters environment based on player profile
- Generates personalized encounters
- Creates moral dilemmas
- Manages world state transitions

**ChoiceRipple Class**
- Tracks player decisions
- Generates consequence chains
- Manages delayed effects

**GameSession Class**
- Manages individual player sessions
- Coordinates AI, world, and ripple systems
- Tracks scores and progress

### Server (`server.js`)

RESTful API endpoints:
- `POST /api/session/start` - Start new game session
- `POST /api/action` - Process player action
- `GET /api/session/:playerId` - Get session state
- `GET /api/profile/:playerId` - Get player profile
- `DELETE /api/session/:playerId` - End session
- `GET /health` - Health check endpoint

### Frontend (`public/index.html`)

Single-page application with:
- Real-time profile visualization
- Action buttons for player choices
- Moral dilemma interface
- World change notifications
- AI prediction display
- Event log

## 🎯 How It Works

1. **Observation Phase**
   - Player takes an action
   - AI records action type and context
   - Profile metrics are updated

2. **Analysis Phase**
   - AI analyzes recent action patterns
   - Predictions are generated
   - Counter-strategies are prepared

3. **Adaptation Phase**
   - World state is altered
   - Next encounter is personalized
   - Environment reflects player tendencies

4. **Challenge Phase**
   - Player faces adapted challenge
   - Moral choices with real consequences
   - Difficulty scales with skill level

## 🔧 API Reference

### Start Session
```javascript
POST /api/session/start
Response: { playerId, sessionState }
```

### Take Action
```javascript
POST /api/action
Body: {
  playerId: string,
  action: {
    type: 'attack' | 'defend' | 'help' | 'betray' | 'explore' | 'plan',
    context: string,
    isMoralChoice?: boolean
  }
}
Response: {
  success: boolean,
  result: {
    worldChanges,
    nextEncounter,
    playerProfile,
    predictions,
    consequences
  },
  sessionState
}
```

## 📊 Player Profile Metrics

- **Aggression** (0-1): Tendency to choose offensive actions
- **Caution** (0-1): Preference for defensive strategies
- **Morality** (0-1): Ethical decision making (high = good, low = dark)
- **Exploration** (0-1): Curiosity and investigation behavior
- **Strategy** (0-1): Planning and tactical thinking

## 🎨 Customization

### Adding New Actions
Edit `game-engine.js` and update the `updateProfile` method in `PredictiveAI` class.

### Adding New Encounters
Modify the `generateEncounter` method in `DynamicWorld` class.

### Adding New Moral Dilemmas
Extend the `choices` array in `generateMoralChoice` method.

## 🛠️ Technology Stack

- **Backend**: Node.js with Express
- **Frontend**: Vanilla JavaScript with modern CSS
- **3D Engine**: Three.js (WebGL)
- **Architecture**: RESTful API with session management
- **Deployment**: Vercel & Render compatible

## 📁 Project Structure

```
/public
  ├── index.html      # Main landing page with mode selection
  ├── game.html       # 3D game page
  └── game3d.js       # Three.js 3D game engine
/
  ├── game-engine.js  # Backend game logic (AI, world, choices)
  ├── server.js       # Express server
  └── package.json    # Dependencies (Express, Three.js)
```

## 📝 License

MIT

## 🤝 Contributing

This is a demonstration project showcasing predictive AI in games. Feel free to fork and experiment!

## 🎮 Play Now

Experience a game that truly knows you. Every decision matters. Every action is observed. The world is alive.
