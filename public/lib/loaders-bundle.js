/**
 * Loaders Bundle - Exposes GLTFLoader to global THREE object
 * This file loads the GLTFLoader as an ES module and attaches it to the global THREE
 */

import { GLTFLoader } from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';

// Expose GLTFLoader to global THREE object
if (window.THREE) {
  window.THREE.GLTFLoader = GLTFLoader;
  console.log('✓ GLTFLoader attached to THREE');
} else {
  console.error('THREE not found in global scope');
}
