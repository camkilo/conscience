/**
 * This file loads Rapier physics as an ES module and attaches it to window.RAPIER
 */

import('@dimforge/rapier3d-compat').then(RAPIER => {
  // Initialize Rapier
  RAPIER.init().then(() => {
    // Expose RAPIER to global scope
    window.RAPIER = RAPIER;
    console.log('✓ RAPIER physics engine loaded');
  }).catch(err => {
    console.error('Failed to initialize RAPIER:', err);
  });
}).catch(err => {
  console.error('Failed to load RAPIER module:', err);
});
