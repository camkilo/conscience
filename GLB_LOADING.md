# GLB Loading Implementation Documentation

## Overview

This document describes how GLB (GL Transmission Format Binary) files are loaded in the Conscience 3D game engine.

## Critical Requirements

### ✅ Client-Side Only Execution

**All GLB loading MUST occur in the browser runtime (client-side).**

- ❌ **NEVER** attempt to load GLB files server-side
- ❌ **NEVER** run GLB loading code in SSR (Server-Side Rendering) context
- ✅ All GLB loading code includes `typeof window === 'undefined'` checks
- ✅ Game initialization verifies browser environment before proceeding

### ✅ Binary-Safe Loading Method

**GLB files are loaded using THREE.GLTFLoader which uses binary-safe methods.**

#### How THREE.GLTFLoader Works:

1. **Uses FileLoader internally** with `responseType: 'arraybuffer'`
2. **Fetches as binary data** - NOT as text or JSON
3. **Parses binary GLB format** according to glTF 2.0 specification
4. **ArrayBuffer** → GLB header → JSON chunk → Binary chunk → 3D Scene

#### What We DO:
```javascript
// ✅ CORRECT: THREE.GLTFLoader handles binary loading
this.gltfLoader.load(url, onLoad, onProgress, onError);
```

#### What We DO NOT do:
```javascript
// ❌ WRONG: Never parse GLB as text
const response = await fetch(url);
const text = await response.text(); // WRONG!
JSON.parse(text); // WRONG!

// ❌ WRONG: Never use default fetch without arrayBuffer
const response = await fetch(url);
const blob = await response.blob(); // May work but not recommended
```

### ✅ Byte Length Verification

**We verify byte length > 0 before parsing:**

```javascript
// In progress callback
(progress) => {
  if (progress.loaded === 0) {
    console.warn('Warning: 0 bytes loaded');
  }
  if (progress.loaded > 0) {
    console.log('✓ Binary data received:', progress.loaded, 'bytes');
  }
}
```

### ✅ URL Reachability Check

**We verify URL is reachable BEFORE attempting to load:**

```javascript
// HEAD request to verify URL accessibility
const headResponse = await fetch(url, { method: 'HEAD' });
if (!headResponse.ok) {
  throw new Error(`URL returned ${headResponse.status}`);
}
console.log('✓ URL is reachable');
```

**This allows us to distinguish between:**
- ❌ **Network/URL Error**: URL is not reachable → Show "URL NOT REACHABLE"
- ❌ **Binary Parse Error**: URL is reachable but binary data is invalid → Show "BINARY LOAD FAILED"

### ✅ Explicit Error Messages

**Our error messages are explicit and helpful:**

```javascript
// Network error (URL not reachable)
"❌ URL NOT REACHABLE: https://example.com/model.glb
Network Error: Failed to fetch
This is a NETWORK/URL issue, not a parsing issue."

// Binary parse error (URL reachable, but invalid GLB)
"❌ BINARY LOAD FAILED for Floor
URL: https://example.com/model.glb
Error Type: TypeError
Error Message: Invalid GLB header
This indicates the file was fetched but failed to parse as valid GLB binary data.
The URL is reachable, but the binary content is invalid or corrupted."
```

## Framework Integration

### For Frameworks with SSR (Next.js, Nuxt, SvelteKit, etc.)

If using a framework with Server-Side Rendering:

#### Option 1: Mark as Client-Only
```javascript
// Next.js
import dynamic from 'next/dynamic';
const Game3D = dynamic(() => import('./game3d'), { ssr: false });

// Nuxt 3
<Game3D client-only />

// SvelteKit
{#if browser}
  <Game3D />
{/if}
```

#### Option 2: Route-Level Client-Side
```javascript
// Disable SSR for entire game route
export const ssr = false; // SvelteKit
export const prerender = false; // Next.js
```

## File Structure

```
public/
├── game.html              # Client-only HTML page (marked with SSR warnings)
├── game3d.js              # Main game engine (includes window checks)
├── lib/
│   └── loaders-bundle.js  # GLTFLoader wrapper (binary-safe)
└── assets_manifest.json   # URLs to GLB files
```

## Verification Checklist

- [x] Code runs client-side only (window check)
- [x] GLB loaded as binary (THREE.GLTFLoader uses arraybuffer)
- [x] Byte length verified > 0 before parsing
- [x] URL reachability checked separately from parsing
- [x] Explicit error messages distinguish URL vs parse errors
- [x] SSR detection and warnings in place
- [x] Documentation explains binary-safe loading method

## Example Log Output (Success)

```
=== GAME3D.JS MODULE LOADING ===
✓ Client-side environment confirmed (window exists)
✓ THREE.js available in global scope
✓ GLB loading will use binary-safe THREE.GLTFLoader (fetch as arrayBuffer)
📦 [GLB LOADER] Starting load for: Floor
📦 [GLB LOADER] URL: https://example.com/floor.glb
📦 [GLB LOADER] Client-side execution: ✓ (window exists)
📦 [GLB LOADER] THREE.GLTFLoader will fetch as binary (arrayBuffer) - NOT text/JSON
📦 [GLB LOADER] URL is reachable ✓
📦 [GLB LOADER] Expected file size: 245632 bytes
📦 [GLB LOADER] Floor: 245632 bytes loaded
✓ [GLB LOADER] Binary download complete: 245632 bytes (length > 0 confirmed)
✓ [GLB LOADER] Floor loaded successfully
✓ [GLB LOADER] Binary data parsed correctly (GLB format)
✓ [GLB LOADER] Scene graph extracted from binary GLB
```

## Common Issues and Solutions

### Issue: "SSR detected" error
**Solution**: Ensure the game component/page is marked as client-only in your framework configuration.

### Issue: "URL NOT REACHABLE"
**Solution**: Check network connectivity, CORS headers, and that the URL is correct and publicly accessible.

### Issue: "BINARY LOAD FAILED"
**Solution**: The URL works but the file is corrupted or not a valid GLB. Re-export the model or check file integrity.

## References

- [glTF 2.0 Specification](https://www.khronos.org/registry/glTF/specs/2.0/glTF-2.0.html)
- [THREE.GLTFLoader Documentation](https://threejs.org/docs/#examples/en/loaders/GLTFLoader)
- [GLB Binary Format](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#glb-file-format-specification)
