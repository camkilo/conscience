# GLB Asset Loading Configuration

## Overview

This directory contains the asset configuration for the 3D game engine. The game supports loading GLB models from both local and remote sources.

## Configuration Files

- `assets_manifest.json` - Default configuration (uses local placeholder assets)
- `assets_manifest.production.json` - Production configuration (uses high-quality models from playconscience.com)

## Using Production Assets

To switch to production assets, follow these steps:

1. **Backup the current manifest:**
   ```bash
   cp public/assets_manifest.json public/assets_manifest.local.json
   ```

2. **Copy the production manifest:**
   ```bash
   cp public/assets_manifest.production.json public/assets_manifest.json
   ```

3. **Verify CORS headers:**
   Ensure that the production server (playconscience.com) has proper CORS headers configured:
   - `Access-Control-Allow-Origin: *` (or specific domain)
   - `Content-Type: model/gltf-binary` for .glb files

4. **Restart the server:**
   ```bash
   npm start
   ```

## Asset Requirements

### Server-Side Requirements

The Express server is configured to:
- Serve GLB files with proper MIME type: `model/gltf-binary`
- Add cache headers for performance: `Cache-Control: public, max-age=31536000`
- Enable CORS for asset loading

### GLB File Requirements

- Files must be valid glTF 2.0 binary format
- Recommended file size: < 10MB for optimal loading
- Should include embedded textures and animations

## Fallback System

The game engine includes a robust fallback system:
- If a GLB model fails to load, the engine creates procedural geometry as a fallback
- Diagnostic overlay shows detailed error messages during initialization
- Loading progress is logged to the browser console

## Troubleshooting

### Models Not Loading

1. **Check browser console for errors:**
   - Network errors indicate CORS or URL issues
   - "GLTFLoader not available" means the loader script didn't load

2. **Verify MIME types:**
   ```bash
   curl -I https://playconscience.com/Meshy_AI_sci_fi_modular_gaming_1228005445_texture.glb
   ```
   Should return: `Content-Type: model/gltf-binary` or `application/octet-stream`

3. **Test CORS:**
   Open browser DevTools > Network tab and check for CORS errors

4. **Validate GLB files:**
   Use online validators like:
   - https://gltf-viewer.donmccurdy.com/
   - https://sandbox.babylonjs.com/

### Ad Blockers

Some ad blockers may block external asset requests. The game includes detection and instructions for users.

## Production URLs

Current production assets from playconscience.com:

- **Floor:** `Meshy_AI_sci_fi_modular_gaming_1228005445_texture.glb`
- **Ramp:** `Meshy_AI_sci_fi_modular_gaming_1228003721_texture.glb`
- **Player:** `Meshy_AI_biped 2/Meshy_AI_Character_output.glb`
- **Enemy:** `Meshy_AI_biped 4/Meshy_AI_Character_output.glb`

Note: URL-encoded spaces (%20) are handled automatically by the browser.
