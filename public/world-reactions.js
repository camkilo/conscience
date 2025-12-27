/**
 * World Reaction System
 * Map elements that react to player intent (platforms, spikes, etc.)
 */

export class WorldReactions {
  constructor(scene, intentTracker) {
    this.scene = scene;
    this.intentTracker = intentTracker;
    
    this.platforms = [];
    this.spikes = [];
    this.environmentalHazards = [];
  }
  
  /**
   * Create judgmental raising platforms
   */
  createJudgmentalPlatform(position) {
    const THREE = window.THREE;
    
    const geometry = new THREE.BoxGeometry(4, 0.5, 4);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x4488ff,
      roughness: 0.6,
      metalness: 0.4,
      emissive: 0x2244aa,
      emissiveIntensity: 0.2
    });
    
    const platform = new THREE.Mesh(geometry, material);
    platform.position.copy(position);
    platform.castShadow = true;
    platform.receiveShadow = true;
    
    platform.userData = {
      type: 'judgmentalPlatform',
      baseY: position.y,
      targetY: position.y,
      currentY: position.y,
      state: 'idle',
      lastEvaluationTime: 0,
      evaluationInterval: 0.5, // Evaluate every 0.5 seconds
      intention: null // Will be 'lift_enemies' or 'create_escape'
    };
    
    this.scene.add(platform);
    this.platforms.push(platform);
    
    return platform;
  }
  
  /**
   * Update platforms based on player intent
   */
  updatePlatforms(player, enemies, delta) {
    const now = Date.now() / 1000;
    const intentScores = this.intentTracker.getIntentScores();
    const movementStats = this.intentTracker.getMovementStats();
    
    this.platforms.forEach(platform => {
      // Evaluate player behavior periodically
      if (now - platform.userData.lastEvaluationTime > platform.userData.evaluationInterval) {
        platform.userData.lastEvaluationTime = now;
        
        const distanceToPlayer = player.position.distanceTo(platform.position);
        
        // Check if player is camping (low movement, staying in area)
        const isCamping = movementStats.movingRatio < 0.3 && distanceToPlayer < 15;
        
        // Check if player is highly mobile
        const isHighlyMobile = movementStats.movingRatio > 0.7;
        
        if (isCamping && intentScores.evasion > 0.6) {
          // Player is camping defensively - punish by lifting enemies toward them
          platform.userData.intention = 'lift_enemies';
          platform.userData.targetY = platform.userData.baseY + 3;
          
          // Find nearest enemy and move platform toward player
          const nearestEnemy = this.findNearestEnemy(platform.position, enemies);
          if (nearestEnemy) {
            const liftDirection = player.position.clone().sub(platform.position).normalize();
            liftDirection.y = 0;
            platform.position.x += liftDirection.x * delta * 2;
            platform.position.z += liftDirection.z * delta * 2;
          }
        } else if (isHighlyMobile && intentScores.aggression > 0.5) {
          // Player is aggressive and mobile - help with escape routes
          platform.userData.intention = 'create_escape';
          platform.userData.targetY = platform.userData.baseY + 2;
          
          // Move platform to create escape route away from enemies
          if (enemies.length > 0) {
            const avgEnemyPos = this.getAverageEnemyPosition(enemies);
            const escapeDirection = platform.position.clone().sub(avgEnemyPos).normalize();
            escapeDirection.y = 0;
            platform.position.x += escapeDirection.x * delta * 1.5;
            platform.position.z += escapeDirection.z * delta * 1.5;
          }
        } else {
          // Neutral behavior - platforms slowly return to base
          platform.userData.intention = null;
          platform.userData.targetY = platform.userData.baseY;
        }
      }
      
      // Smoothly move platform to target height
      const heightDiff = platform.userData.targetY - platform.userData.currentY;
      if (Math.abs(heightDiff) > 0.01) {
        platform.userData.currentY += heightDiff * delta * 2;
        platform.position.y = platform.userData.currentY;
      }
      
      // Update visual feedback based on intention
      if (platform.userData.intention === 'lift_enemies') {
        platform.material.emissive.setHex(0xff2222);
        platform.material.emissiveIntensity = 0.5;
      } else if (platform.userData.intention === 'create_escape') {
        platform.material.emissive.setHex(0x22ff22);
        platform.material.emissiveIntensity = 0.5;
      } else {
        platform.material.emissive.setHex(0x2244aa);
        platform.material.emissiveIntensity = 0.2;
      }
    });
  }
  
  /**
   * Create intelligent spike hazard
   */
  createIntentBasedSpike(position) {
    const THREE = window.THREE;
    
    // Spike geometry (pyramid)
    const geometry = new THREE.ConeGeometry(0.5, 2, 4);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x883333,
      roughness: 0.8,
      metalness: 0.3,
      emissive: 0x330000,
      emissiveIntensity: 0.3
    });
    
    const spike = new THREE.Mesh(geometry, material);
    spike.position.copy(position);
    spike.position.y = -1; // Start retracted
    spike.rotation.y = Math.PI / 4;
    spike.castShadow = true;
    
    spike.userData = {
      type: 'intentSpike',
      baseY: position.y,
      retractedY: -1,
      extendedY: 1,
      currentY: -1,
      state: 'retracted', // retracted, extending, extended, retracting
      lastEvaluationTime: 0,
      evaluationInterval: 0.3,
      damage: 15,
      damageInterval: 0.5,
      lastDamageTime: 0
    };
    
    this.scene.add(spike);
    this.spikes.push(spike);
    
    return spike;
  }
  
  /**
   * Update spikes based on player intent and momentum
   */
  updateSpikes(player, enemies, delta) {
    const now = Date.now() / 1000;
    const intentScores = this.intentTracker.getIntentScores();
    
    this.spikes.forEach(spike => {
      // Evaluate behavior periodically
      if (now - spike.userData.lastEvaluationTime > spike.userData.evaluationInterval) {
        spike.userData.lastEvaluationTime = now;
        
        const distanceToPlayer = player.position.distanceTo(spike.position);
        
        // If player is fleeing (high evasion) and coming near spike - block escape
        if (intentScores.evasion > 0.7 && intentScores.panic > 0.5) {
          if (distanceToPlayer < 8) {
            // Predict player direction and extend if they're heading this way
            const playerDirection = player.userData.velocity.clone().normalize();
            const toSpike = spike.position.clone().sub(player.position).normalize();
            const dot = playerDirection.dot(toSpike);
            
            if (dot > 0.3) { // Player heading toward spike
              spike.userData.state = 'extending';
            }
          }
        }
        
        // If player is aggressive - erupt under enemies
        if (intentScores.aggression > 0.7) {
          const nearestEnemy = this.findNearestEnemy(spike.position, enemies);
          if (nearestEnemy && spike.position.distanceTo(nearestEnemy.position) < 3) {
            spike.userData.state = 'extending';
          }
        }
        
        // Auto-retract after being extended
        if (spike.userData.state === 'extended') {
          setTimeout(() => {
            if (spike.userData.state === 'extended') {
              spike.userData.state = 'retracting';
            }
          }, 2000);
        }
      }
      
      // Animate spike based on state
      const targetY = spike.userData.state.includes('extend') ? spike.userData.extendedY : spike.userData.retractedY;
      const diff = targetY - spike.userData.currentY;
      
      if (Math.abs(diff) > 0.01) {
        spike.userData.currentY += diff * delta * 5;
        spike.position.y = spike.userData.currentY;
        
        // Update state when reach target
        if (Math.abs(diff) < 0.1) {
          if (spike.userData.state === 'extending') {
            spike.userData.state = 'extended';
          } else if (spike.userData.state === 'retracting') {
            spike.userData.state = 'retracted';
          }
        }
      }
      
      // Apply damage to both player and enemies (same logic for both)
      if (spike.userData.state === 'extended' && now - spike.userData.lastDamageTime > spike.userData.damageInterval) {
        // Damage player if in range
        const distToPlayer = player.position.distanceTo(spike.position);
        if (distToPlayer < 1.5) {
          spike.userData.lastDamageTime = now;
          // Return damage info for game to apply
          spike.userData.pendingPlayerDamage = spike.userData.damage;
        }
        
        // Damage enemies in range
        enemies.forEach(enemy => {
          const distToEnemy = enemy.position.distanceTo(spike.position);
          if (distToEnemy < 1.5) {
            spike.userData.lastDamageTime = now;
            // Mark enemy for damage
            enemy.userData.pendingSpikeHit = true;
            enemy.userData.spikeHitDamage = spike.userData.damage;
          }
        });
      }
      
      // Visual feedback
      if (spike.userData.state === 'extended') {
        spike.material.emissive.setHex(0xff0000);
        spike.material.emissiveIntensity = 0.8;
      } else {
        spike.material.emissive.setHex(0x330000);
        spike.material.emissiveIntensity = 0.3;
      }
    });
  }
  
  /**
   * Find nearest enemy to position
   */
  findNearestEnemy(position, enemies) {
    if (enemies.length === 0) return null;
    
    let nearest = null;
    let minDist = Infinity;
    
    enemies.forEach(enemy => {
      const dist = position.distanceTo(enemy.position);
      if (dist < minDist) {
        minDist = dist;
        nearest = enemy;
      }
    });
    
    return nearest;
  }
  
  /**
   * Get average enemy position
   */
  getAverageEnemyPosition(enemies) {
    const THREE = window.THREE;
    const avg = new THREE.Vector3();
    
    enemies.forEach(enemy => {
      avg.add(enemy.position);
    });
    
    if (enemies.length > 0) {
      avg.divideScalar(enemies.length);
    }
    
    return avg;
  }
  
  /**
   * Update all world reactions
   */
  update(player, enemies, delta) {
    this.updatePlatforms(player, enemies, delta);
    this.updateSpikes(player, enemies, delta);
  }
  
  /**
   * Clean up
   */
  dispose() {
    this.platforms.forEach(p => this.scene.remove(p));
    this.spikes.forEach(s => this.scene.remove(s));
    this.platforms = [];
    this.spikes = [];
  }
}

// Export to global scope
if (typeof window !== 'undefined') {
  window.WorldReactions = WorldReactions;
}
