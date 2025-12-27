/**
 * This file loads Rapier physics as an ES module and attaches it to window.RAPIER
 */

// Import Rapier from node_modules
import RAPIER from '/@dimforge/rapier3d-compat/rapier.mjs';

// Wait for RAPIER to initialize
RAPIER.init().then(() => {
  // Expose RAPIER to global scope
  window.RAPIER = RAPIER;
  console.log('✓ RAPIER physics engine loaded and initialized');
}).catch(err => {
  console.error('Failed to initialize RAPIER:', err);
});
