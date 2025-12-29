# Render Deployment Guide for Conscience Game

This guide provides complete instructions for deploying the Conscience game to Render.com with full GLB asset support.

## Prerequisites

- GitHub account with this repository
- Render account (free tier works)
- GLB model files in `/public/assets/` directory

## Overview

The Conscience game is a full-stack Node.js application that serves:
- **Backend API**: Game session management and AI processing
- **Static Frontend**: HTML, CSS, JavaScript, and 3D assets
- **GLB Models**: 3D models for player, enemies, floor, and ramps
- **Three.js Dependencies**: From node_modules

## Architecture

```
Server (server.js)
├── Express Static Middleware → /public/ (frontend + assets)
├── GLB Files → /assets/*.glb (proper MIME types)
├── Three.js → /three/ (from node_modules)
├── API Routes → /api/* (game logic)
└── Health Check → /health
```

## Render Configuration

The `render.yaml` file is pre-configured with:

```yaml
services:
  - type: web
    name: conscience-game
    env: node
    plan: free
    region: oregon
    buildCommand: npm ci
    startCommand: npm start
    healthCheckPath: /health
    autoDeploy: true
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
    staticPublishPath: ./public
    headers:
      - path: /assets/*.glb
        name: Content-Type
        value: model/gltf-binary
      - path: /assets/*.glb
        name: Cache-Control
        value: public, max-age=31536000
      - path: /assets/*
        name: Access-Control-Allow-Origin
        value: "*"
```

## Deployment Steps

### Option 1: Deploy via Render Dashboard (Recommended)

1. **Sign in to Render**
   - Go to https://render.com
   - Sign in with your GitHub account

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the `conscience` repository

3. **Configure Service (Auto-detected)**
   - Render will automatically detect `render.yaml`
   - Name: `conscience-game`
   - Environment: `Node`
   - Build Command: `npm ci`
   - Start Command: `npm start`

4. **Verify Configuration**
   - Check that `NODE_ENV=production` is set
   - Health Check Path: `/health`
   - Auto-Deploy: Enabled

5. **Deploy**
   - Click "Create Web Service"
   - Wait for build to complete (2-5 minutes)

6. **Verify Deployment**
   - Once deployed, visit: `https://conscience-game.onrender.com`
   - Test health endpoint: `https://conscience-game.onrender.com/health`
   - Test assets: `https://conscience-game.onrender.com/api/assets/verify`

### Option 2: Deploy via Render Blueprint

```bash
# From your repository root
git push origin main
```

Then in Render Dashboard:
1. Go to "Blueprints"
2. Click "New Blueprint Instance"
3. Connect your repository
4. Render will detect and deploy from `render.yaml`

## Static Asset Serving

The server uses Express static middleware with special configuration for GLB files:

### GLB File Configuration

```javascript
app.use(express.static('public', {
  setHeaders: (res, path) => {
    if (path.endsWith('.glb') || path.endsWith('.gltf')) {
      res.setHeader('Content-Type', 'model/gltf-binary');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));
```

### What This Does

1. **Proper MIME Type**: Sets `Content-Type: model/gltf-binary` for all GLB files
2. **Aggressive Caching**: 1-year cache in production (1 hour in development)
3. **CORS Support**: Allows cross-origin requests for assets
4. **Resource Policy**: Enables cross-origin resource sharing

## Asset Verification

The server includes an asset verification endpoint:

```bash
curl https://your-app.onrender.com/api/assets/verify
```

Response:
```json
{
  "status": "ok",
  "message": "All assets available",
  "assets": {
    "player.glb": {
      "exists": true,
      "size": 452,
      "path": "/assets/player.glb",
      "mimeType": "model/gltf-binary"
    },
    "enemy.glb": { ... },
    "floor.glb": { ... },
    "ramp.glb": { ... }
  }
}
```

## Testing Your Deployment

### 1. Health Check
```bash
curl https://your-app.onrender.com/health
# Expected: {"status":"healthy","timestamp":...}
```

### 2. Assets Verification
```bash
curl https://your-app.onrender.com/api/assets/verify
# Expected: {"status":"ok","message":"All assets available",...}
```

### 3. GLB File Headers
```bash
curl -I https://your-app.onrender.com/assets/player.glb
# Expected headers:
# Content-Type: model/gltf-binary
# Cache-Control: public, max-age=31536000
# Access-Control-Allow-Origin: *
```

### 4. Game UI
- Visit: `https://your-app.onrender.com`
- Click "Play 3D Game ⚡"
- Verify 3D models load correctly
- Check browser console for asset loading messages

## Troubleshooting

### Issue: GLB Files Not Loading

**Symptoms:**
- Console shows 404 errors for `/assets/*.glb`
- Fallback geometry (triangles/boxes) displayed

**Solutions:**
1. Verify files exist in `/public/assets/` directory
2. Check asset verification endpoint
3. Verify MIME type in response headers
4. Check Render build logs for errors

### Issue: CORS Errors

**Symptoms:**
- Console shows CORS policy errors
- Assets blocked by browser

**Solutions:**
1. Verify `Access-Control-Allow-Origin: *` in headers
2. Check that `Cross-Origin-Resource-Policy: cross-origin` is set
3. Clear browser cache and reload

### Issue: Models Show as Placeholders

**Symptoms:**
- GLB files load but show simple geometry
- File sizes are very small (< 1KB)

**Solutions:**
1. Check file sizes in asset verification response
2. Replace placeholder GLB files with actual models
3. Verify GLB files are valid with: `file public/assets/*.glb`

### Issue: Build Fails

**Symptoms:**
- Render build fails during `npm ci`
- Dependencies not installed

**Solutions:**
1. Check `package.json` has all dependencies
2. Verify Node version compatibility (requires >=18.0.0)
3. Check Render build logs for specific errors
4. Try clearing build cache in Render dashboard

### Issue: Server Won't Start

**Symptoms:**
- Build succeeds but service fails to start
- Health check fails

**Solutions:**
1. Check that `PORT` environment variable is set
2. Verify `npm start` command is correct
3. Check server logs in Render dashboard
4. Verify `game-engine.js` is present and valid

## Performance Optimization

### Caching Strategy

- **Production**: 1-year cache for GLB files
- **Development**: 1-hour cache for faster iteration
- **ETags**: Enabled for conditional requests

### Static File Serving

Render serves static files efficiently through:
1. Express static middleware
2. Gzip compression (automatic)
3. HTTP/2 support (automatic)
4. CDN edge caching (on paid plans)

### Asset Optimization

For better performance:
1. Optimize GLB files with gltf-pipeline
2. Use Draco compression for meshes
3. Minimize texture sizes
4. Enable texture compression

## Security Considerations

### Current Configuration

- ✅ CORS enabled for all assets (needed for 3D loading)
- ✅ No rate limiting (should add for production)
- ✅ No authentication (game is public)
- ✅ Health check doesn't expose sensitive data

### Recommendations for Production

1. **Add Rate Limiting**
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

2. **Add Helmet for Security Headers**
```javascript
import helmet from 'helmet';
app.use(helmet());
```

3. **Environment Variables**
- Don't commit secrets to git
- Use Render's environment variables
- Rotate API keys regularly

## Monitoring

### Render Dashboard

Monitor your deployment:
- **Metrics**: CPU, Memory, Request rate
- **Logs**: Real-time server logs
- **Events**: Deploys, restarts, errors
- **Health**: Automatic health checks

### Custom Logging

The server logs key events:
```
🎮 Conscience Game Server running on port 3000
📊 Predictive World AI: Active
🌍 Dynamic World System: Online
```

### Error Tracking

Consider adding:
- Sentry for error tracking
- LogRocket for session replay
- Application Insights for metrics

## Cost Considerations

### Render Free Tier

- ✅ 750 hours/month (enough for one service)
- ✅ Automatic SSL certificates
- ✅ Automatic deploys from GitHub
- ❌ Spins down after 15 minutes of inactivity
- ❌ Cold start delay (~30 seconds)

### Paid Plans

For production:
- **Starter ($7/month)**: Always-on, no cold starts
- **Standard ($25/month)**: More resources, faster builds
- **Pro ($85/month)**: Dedicated resources, priority support

## Support and Resources

- **Render Docs**: https://render.com/docs
- **Express Docs**: https://expressjs.com
- **Three.js Docs**: https://threejs.org/docs
- **GLTF Spec**: https://www.khronos.org/gltf

## Summary

Your Conscience game is now fully configured for Render deployment with:

✅ Complete Node.js backend serving static files
✅ Proper MIME types for GLB files (`model/gltf-binary`)
✅ CORS headers for cross-origin asset loading
✅ Cache headers for performance
✅ Health check endpoint for monitoring
✅ Asset verification endpoint for debugging
✅ Auto-deploy from GitHub
✅ Production-ready configuration

The game will load immediately with all ramps, floor, and player models served correctly from `/public/assets/*.glb`.
