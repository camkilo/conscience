/**
 * Cannon Physics Bundle - Exposes Cannon-es to global scope
 * This file loads Cannon-es as an ES module and attaches it to window.CANNON
 */

import * as CANNON from '/cannon-es/cannon-es.js';

// Expose CANNON to global scope
window.CANNON = CANNON;
console.log('✓ CANNON physics engine loaded');
