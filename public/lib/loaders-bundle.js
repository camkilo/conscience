/**
 * Loaders Bundle - Exposes GLTFLoader to global THREE object
 * This file loads the GLTFLoader as an ES module and attaches it to the global THREE
 * 
 * IMPORTANT: THREE.GLTFLoader uses binary-safe loading methods:
 * - Internally uses FileLoader with responseType 'arraybuffer'
 * - Does NOT parse GLB as text or JSON
 * - Fetches GLB files as binary data (ArrayBuffer)
 * - Properly handles binary GLB format parsing
 * 
 * This module MUST run client-side only (in browser).
 */

import { GLTFLoader } from '/three-jsm/loaders/GLTFLoader.js';

// Verify client-side execution
if (typeof window === 'undefined') {
  throw new Error('❌ loaders-bundle.js requires browser environment. Cannot run server-side.');
}

// Expose GLTFLoader to global THREE object
if (window.THREE) {
  window.THREE.GLTFLoader = GLTFLoader;
  console.log('✓ GLTFLoader attached to THREE (uses binary-safe arrayBuffer loading)');
} else {
  console.error('THREE not found in global scope');
}
