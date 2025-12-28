# Asset Loading Strategy

## Overview

This document describes the production-safe asset loading strategy implemented for the Conscience 3D game engine.

## Problem Statement

The game was failing with `net::ERR_BLOCKED_BY_CLIENT` when loading external GLB assets from third-party CDNs. This error is commonly caused by:

- **Ad-blockers**: Browser extensions that block external content
- **CORS policies**: Cross-origin resource sharing restrictions
- **Security policies**: Browser or network-level blocking
- **Firewalls**: Corporate or network filters

## Solution: Same-Origin + Graceful Fallback

### 1. Same-Origin Asset Loading (Primary Strategy)

**Why Same-Origin?**
- Browsers trust requests to the same origin as the game
- No CORS preflight requests required
- Not blocked by ad-blockers or security policies
- Better performance (no DNS lookup, connection reuse)

**Implementation:**
```json
{
  "environment": {
    "floor": "/assets/floor.glb",
    "ramp": "/assets/ramp.glb"
  },
  "characters": {
    "player": { "url": "/assets/player.glb" },
    "enemy_basic": { "url": "/assets/enemy.glb" }
  }
}
```

All assets are served from `/assets/` directory on the same origin as the game.

### 2. Graceful Fallback System (Backup Strategy)

**When Assets Fail:**
Instead of crashing with a red error screen, the game:

1. **Detects** the failure type (network, blocked, parse error)
2. **Logs** a clear warning message to console
3. **Creates** a placeholder mesh as fallback
4. **Continues** initialization and gameplay

**Placeholder Meshes:**

| Asset Type | Fallback Geometry | Color | Purpose |
|------------|-------------------|-------|---------|
| Floor | Box (100×0.5×100) | Dark gray | Large walkable surface |
| Character | Capsule (r=0.3, h=1) | Green | Player representation |
| Enemy | Capsule (r=0.3, h=1) | Red | Enemy representation |
| Wall | Box (10×5×0.5) | Gray | Vertical barriers |
| Ramp | Box (5×0.5×10) | Medium gray | Elevation changes |
| Platform | Box (5×0.5×5) | Gray | Elevated surfaces |

**Example Console Output:**
```
⚠️ EXTERNAL ASSET BLOCKED: Floor
URL: https://external-cdn.com/floor.glb
Reason: Failed to fetch

The request was blocked by browser (ad-blocker, CORS, or security policy).
Falling back to local placeholder mesh.

🔧 [FALLBACK] Creating placeholder mesh for: Floor
✓ [FALLBACK] Placeholder mesh created for Floor
```

### 3. Error Detection

**Three Error Types:**

1. **Network Error**: URL not reachable (DNS, connection failure)
2. **Blocked Error**: Request blocked by browser/extension (ERR_BLOCKED_BY_CLIENT)
3. **Parse Error**: URL reachable but binary data invalid

**Detection Logic:**
```javascript
isBlockedByClient(error) {
  const errorString = error.toString().toLowerCase();
  return errorString.includes('blocked') || 
         errorString.includes('cors') ||
         errorString.includes('failed to fetch') ||
         error.name === 'TypeError' && errorString.includes('fetch');
}
```

### 4. Loading Process

**Flow:**

```
1. Attempt to load from same-origin URL (/assets/floor.glb)
   ↓
2. HEAD request to verify URL reachable (5s timeout)
   ↓
3a. Success → Load GLB with THREE.GLTFLoader
   ↓
4a. Success → Use loaded model
   
3b. Failed (blocked/network) → Detect error type
   ↓
4b. Log warning (not error)
   ↓
5b. Create placeholder mesh
   ↓
6b. Continue initialization
```

**Code Example:**
```javascript
// Load with fallback support
const floorGltf = await this.loadGLBModel(
  '/assets/floor.glb',  // Same-origin URL
  'Floor',               // Asset name
  'floor'                // Fallback type
);

// floorGltf.isPlaceholder tells us if fallback was used
if (floorGltf.isPlaceholder) {
  console.warn('Using placeholder floor');
} else {
  console.log('Loaded real floor asset');
}

// Game continues either way!
```

## Benefits

### Production Safety
- ✅ **Same-origin** = Trusted by browsers
- ✅ **No external dependencies** = No CDN outages
- ✅ **No CORS issues** = No preflight requests

### User Experience
- ✅ **Game always boots** = Never stuck on error screen
- ✅ **Clear diagnostics** = Developers can debug issues
- ✅ **Playable** = Placeholder meshes provide basic functionality

### Development
- ✅ **Asset-first** = Real assets used when available
- ✅ **Fallback** = Development continues if assets unavailable
- ✅ **Testable** = Can test with/without assets

## Testing Scenarios

### Scenario 1: All Assets Available (Normal)
```
✓ Floor loaded successfully (456 bytes)
✓ Player loaded successfully (452 bytes)
✓ Enemy loaded successfully (452 bytes)
Result: Full game with real models
```

### Scenario 2: Assets Blocked (Ad-blocker)
```
⚠️ External asset blocked: Floor - using fallback
🔧 Creating placeholder mesh for Floor
Result: Game boots with placeholder meshes
```

### Scenario 3: Network Offline
```
⚠️ Network error: Floor - using fallback
🔧 Creating placeholder mesh for Floor
Result: Game boots with placeholder meshes
```

### Scenario 4: Invalid Asset File
```
⚠️ Parse error: Floor - binary invalid
🔧 Creating placeholder mesh for Floor
Result: Game boots with placeholder meshes
```

## Implementation Details

### File Structure
```
public/
├── assets/               # Same-origin asset directory
│   ├── floor.glb        # Environment assets
│   ├── ramp.glb
│   ├── player.glb       # Character assets
│   └── enemy.glb
├── assets_manifest.json # Asset URLs (all same-origin)
└── game3d.js           # Game engine with fallback system
```

### Key Methods

**loadGLBModel(url, modelName, fallbackType)**
- `url`: Asset URL (preferably same-origin)
- `modelName`: Human-readable name for logging
- `fallbackType`: Type of placeholder to create if loading fails
- Returns: GLTF object (real or placeholder)

**isBlockedByClient(error)**
- Detects if error is due to browser blocking
- Returns: boolean

**createPlaceholderMesh(modelName, type)**
- Creates fallback geometry based on type
- Returns: GLTF-like object with `isPlaceholder: true`

## Best Practices

### DO:
✅ Use same-origin paths (`/assets/model.glb`)
✅ Provide fallbackType for all asset loads
✅ Log warnings (not errors) for asset failures
✅ Test game with assets disabled

### DON'T:
❌ Use external CDN URLs as primary source
❌ Crash on asset load failures
❌ Show confusing error messages to users
❌ Rely on assets for basic functionality

## Migration Guide

### From External CDN to Same-Origin

**Before:**
```json
{
  "floor": "https://cdn.example.com/assets/floor.glb"
}
```

**After:**
```json
{
  "floor": "/assets/floor.glb"
}
```

**Steps:**
1. Copy assets to `public/assets/` directory
2. Update `assets_manifest.json` with local paths
3. Test loading with browser dev tools
4. Verify fallback system works (disable network in dev tools)

## Troubleshooting

### Issue: Assets not loading
**Check:**
- Are files in `public/assets/` directory?
- Is path in manifest correct (`/assets/filename.glb`)?
- Check browser console for error messages

### Issue: Using placeholder when assets exist
**Check:**
- Server is running and serving `/assets/` correctly
- File permissions allow reading
- GLB files are valid (not corrupted)

### Issue: Game still crashes on asset failure
**Check:**
- `fallbackType` parameter provided to `loadGLBModel()`?
- Error is being caught and logged?
- Placeholder mesh creation not throwing errors?

## Future Enhancements

### Potential Improvements:
- Progressive loading (low-res → high-res)
- Asset preloading with progress bar
- Lazy loading for non-critical assets
- Asset compression/optimization
- Texture quality selection based on device

## References

- [GLB_LOADING.md](./GLB_LOADING.md) - Binary loading methodology
- [Three.js GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader)
- [MDN: Same-Origin Policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)
