# Vercel Deployment Guide for Conscience Game

This guide provides complete instructions for deploying the Conscience game to Vercel with full 3D model support.

## Overview

The Conscience game is a full-stack Node.js application with:
- **Backend API**: Express server with game logic and session management
- **Static Frontend**: HTML, CSS, JavaScript with Three.js 3D rendering
- **3D Assets**: GLB models for characters and environment
- **Dependencies**: Three.js and Cannon-es served from node_modules

## Vercel Configuration

The application uses a simplified Vercel configuration that routes all requests through the Express server, which handles:
- Static file serving with proper MIME types
- API endpoints for game logic
- 3D model serving with correct Content-Type headers
- CORS configuration for cross-origin requests

### Configuration File (vercel.json)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*\\.glb)",
      "headers": [
        {
          "key": "Content-Type",
          "value": "model/gltf-binary"
        },
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000"
        },
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Cross-Origin-Resource-Policy",
          "value": "cross-origin"
        }
      ]
    }
  ]
}
```

## Automatic Environment Detection

The game automatically detects the environment and loads appropriate assets:

**Development (localhost):**
- Uses `/assets_manifest.json`
- Loads placeholder GLB files from `/assets/*.glb` (small files)
- Fast loading for development

**Production (Vercel):**
- Automatically uses `/assets_manifest.production.json`
- Loads full 3D models from external URLs (if configured)
- Shows detailed biped characters and textured environments

**Fallback System:**
- If external URLs fail, falls back to local placeholder files
- Creates procedural geometry if GLB loading fails
- Ensures game always remains playable

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Sign in to Vercel**
   - Go to https://vercel.com
   - Sign in with your GitHub account

2. **Import Project**
   - Click "Add New..." → "Project"
   - Select your GitHub repository
   - Click "Import"

3. **Configure Project**
   - Vercel will automatically detect the configuration from `vercel.json`
   - **Framework Preset**: Other (will use vercel.json)
   - **Build Command**: (leave empty, uses default)
   - **Output Directory**: (leave empty)
   - **Install Command**: `npm install`

4. **Environment Variables** (Optional)
   - `NODE_ENV`: `production` (optional, auto-set by Vercel)
   - No other environment variables required

5. **Deploy**
   - Click "Deploy"
   - Wait 1-2 minutes for build to complete

6. **Verify Deployment**
   - Once deployed, visit your Vercel URL (e.g., `https://conscience-xyz.vercel.app`)
   - Test health endpoint: `https://conscience-xyz.vercel.app/health`
   - Test the game by clicking "Play 3D Game ⚡"

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Navigate to project directory
cd /path/to/conscience

# Deploy (first time)
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? (Select your account)
# - Link to existing project? No
# - Project name? conscience (or your choice)
# - In which directory is your code located? ./
# - Want to override settings? No

# Deploy to production
vercel --prod
```

### Option 3: Deploy via GitHub Integration

1. **Connect GitHub Repository**
   - In Vercel Dashboard, go to your account settings
   - Navigate to "Git Integrations"
   - Connect your GitHub account
   - Give Vercel access to your repositories

2. **Enable Auto-Deploy**
   - Vercel will automatically deploy on every push to main/master
   - Pull requests get preview deployments
   - Production deployments happen on merge to main

## Asset Loading Configuration

### Using External 3D Models (Production URLs)

If you have 3D models hosted externally (e.g., on a CDN or another server):

1. **Update Production Manifest**
   
   Edit `public/assets_manifest.production.json`:
   ```json
   {
     "environment": {
       "floor": "https://your-cdn.com/floor.glb",
       "ramp": "https://your-cdn.com/ramp.glb"
     },
     "characters": {
       "player": {
         "url": "https://your-cdn.com/player.glb"
       },
       "enemy_basic": {
         "url": "https://your-cdn.com/enemy.glb"
       }
     }
   }
   ```

2. **Ensure External Server Has CORS**
   
   The external server must return these headers:
   ```
   Access-Control-Allow-Origin: *
   Content-Type: model/gltf-binary
   ```

3. **Deploy**
   
   The game will automatically use these URLs when deployed to Vercel.

### Using Local GLB Files

If you want to host GLB files within your Vercel deployment:

1. **Add Real GLB Files**
   
   Replace placeholder files in `public/assets/`:
   ```bash
   # Copy your real GLB models
   cp /path/to/your/player.glb public/assets/player.glb
   cp /path/to/your/enemy.glb public/assets/enemy.glb
   cp /path/to/your/floor.glb public/assets/floor.glb
   cp /path/to/your/ramp.glb public/assets/ramp.glb
   ```

2. **Verify File Sizes**
   ```bash
   ls -lh public/assets/*.glb
   # Should show files larger than 1KB
   ```

3. **Update Default Manifest**
   
   The default `public/assets_manifest.json` already points to local files:
   ```json
   {
     "environment": {
       "floor": "/assets/floor.glb",
       "ramp": "/assets/ramp.glb"
     },
     "characters": {
       "player": {
         "url": "/assets/player.glb"
       },
       "enemy_basic": {
         "url": "/assets/enemy.glb"
       }
     }
   }
   ```

4. **Deploy**
   
   Vercel will include these files in the deployment.

## Testing Your Deployment

### 1. Health Check
```bash
curl https://your-app.vercel.app/health
# Expected: {"status":"healthy","timestamp":1234567890}
```

### 2. Assets Verification
```bash
curl https://your-app.vercel.app/api/assets/verify
# Expected: {"status":"ok","message":"All assets available",...}
```

### 3. GLB File Headers
```bash
curl -I https://your-app.vercel.app/assets/player.glb
# Expected headers:
# Content-Type: model/gltf-binary
# Access-Control-Allow-Origin: *
```

### 4. Game UI
- Visit: `https://your-app.vercel.app`
- Click "Play 3D Game ⚡"
- Check browser console for asset loading messages
- Verify 3D models load correctly

## Troubleshooting

### Issue: GLB Files Return 404

**Symptoms:**
- Console shows 404 errors for `/assets/*.glb`
- Fallback geometry displayed

**Solutions:**
1. Verify files exist in `/public/assets/` directory
2. Check asset verification endpoint: `/api/assets/verify`
3. Ensure files are committed to git (not in .gitignore)
4. Try redeploying: `vercel --prod`

### Issue: Wrong MIME Type

**Symptoms:**
- GLB files download instead of loading
- Three.js cannot parse files

**Solutions:**
1. Verify `vercel.json` has proper headers configuration
2. Check actual headers: `curl -I https://your-app.vercel.app/assets/player.glb`
3. Clear browser cache and reload
4. Verify `server.js` has MIME type configuration

### Issue: CORS Errors

**Symptoms:**
- Console shows "blocked by CORS policy"
- Assets fail to load from external URLs

**Solutions:**
1. Verify external server has CORS headers
2. Check `Access-Control-Allow-Origin: *` is set
3. Use local assets instead of external URLs
4. Test external URL accessibility: `curl -I <external-url>`

### Issue: Models Show as Placeholders

**Symptoms:**
- GLB files load but show simple geometry
- File sizes are very small (< 1KB)

**Solutions:**
1. Replace placeholder files with actual models
2. Check file sizes: `ls -lh public/assets/*.glb`
3. Validate GLB files with online viewer: https://gltf-viewer.donmccurdy.com/
4. Ensure files are valid glTF 2.0 binary format

### Issue: Serverless Function Timeout

**Symptoms:**
- Build succeeds but deployment times out
- 504 Gateway Timeout errors

**Solutions:**
1. Reduce GLB file sizes (< 10MB recommended)
2. Use external CDN for large assets
3. Optimize GLB files with gltf-pipeline
4. Upgrade to Vercel Pro for longer timeouts

### Issue: Build Fails

**Symptoms:**
- Deployment fails during build
- npm install errors

**Solutions:**
1. Check `package.json` dependencies are valid
2. Verify Node version compatibility (>=18.0.0)
3. Review build logs in Vercel dashboard
4. Try clearing build cache (redeploy)
5. Test build locally: `npm install && npm start`

## Performance Optimization

### Caching Strategy

The configuration uses aggressive caching for static assets:
- **GLB Files**: 1-year cache (`max-age=31536000`)
- **Static Files**: Browser-default caching
- **API Responses**: No caching (dynamic content)

### Asset Optimization

For better performance:
1. **Compress GLB files** with Draco compression
2. **Reduce texture sizes** to 1024x1024 or smaller
3. **Use texture compression** (KTX2)
4. **Implement lazy loading** for non-critical assets
5. **Use CDN** for faster global delivery

### Vercel Edge Network

Vercel automatically:
- ✅ Compresses responses with gzip/brotli
- ✅ Serves from edge locations worldwide
- ✅ Provides HTTP/2 support
- ✅ Generates SSL certificates
- ✅ Enables serverless function optimization

## Monitoring and Analytics

### Vercel Dashboard

Monitor your deployment:
- **Deployments**: View history and rollback if needed
- **Analytics**: Track page views and performance
- **Logs**: Real-time function logs
- **Domains**: Configure custom domains

### Custom Logging

The server logs key events to Vercel's logging system:
```
🎮 Conscience Game Server running on port 3000
📊 Predictive World AI: Active
🌍 Dynamic World System: Online
```

View logs:
```bash
vercel logs https://your-app.vercel.app
```

## Security Considerations

### Current Configuration

- ✅ CORS enabled for assets (needed for 3D loading)
- ✅ No sensitive data exposed
- ✅ Health check doesn't leak information
- ⚠️ No rate limiting (add for production)

### Recommendations

1. **Add Rate Limiting**
   
   Consider using Vercel's built-in rate limiting or add middleware:
   ```javascript
   import rateLimit from 'express-rate-limit';
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests
   });
   
   app.use('/api/', limiter);
   ```

2. **Use Environment Variables**
   - Store secrets in Vercel's environment variables
   - Never commit API keys or tokens
   - Access via `process.env.VARIABLE_NAME`

3. **Enable Vercel Firewall** (Pro plan)
   - DDoS protection
   - Bot detection
   - IP blocking

## Cost Considerations

### Vercel Free Tier

- ✅ 100 GB bandwidth/month
- ✅ Unlimited API requests
- ✅ Automatic SSL certificates
- ✅ 100 deployments/day
- ⚠️ 10-second serverless function timeout
- ⚠️ 12 serverless function regions (limited)

### Paid Plans

For production:
- **Pro ($20/month)**: More bandwidth, analytics, password protection
- **Enterprise**: Custom limits, SLA, priority support

## Custom Domain Configuration

### Add Custom Domain

1. **In Vercel Dashboard**
   - Go to your project
   - Navigate to "Settings" → "Domains"
   - Click "Add"
   - Enter your domain name

2. **Configure DNS**
   - Add CNAME record: `www` → `cname.vercel-dns.com`
   - Add A record: `@` → `76.76.21.21`
   - Or use Vercel nameservers (recommended)

3. **Wait for Verification**
   - SSL certificate generated automatically
   - Usually takes 5-10 minutes

## Support and Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Vercel Support**: https://vercel.com/support
- **Express Docs**: https://expressjs.com
- **Three.js Docs**: https://threejs.org/docs
- **glTF Specification**: https://www.khronos.org/gltf

## Summary

Your Conscience game is now configured for Vercel deployment with:

✅ Simplified serverless configuration  
✅ Proper MIME types for GLB files  
✅ CORS headers for cross-origin loading  
✅ Automatic environment detection  
✅ Fallback system for asset loading  
✅ Health check endpoint  
✅ Asset verification endpoint  
✅ Production-ready configuration  

The game will automatically:
- Load placeholder models in development
- Load full models in production (if configured)
- Fall back gracefully if external URLs fail
- Work correctly in all Vercel environments

Deploy with confidence! 🚀
