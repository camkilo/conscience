/**
 * Power-Up System with Consequences
 * Every power-up has immediate benefits and long-term costs
 */

class PowerUpSystem {
  constructor(scene, intentTracker) {
    this.scene = scene;
    this.intentTracker = intentTracker;
    
    this.activePowerUps = [];
    this.powerUpHistory = [];
    
    // Power-up definitions
    this.powerUpTypes = {
      TIME_SLOW: {
        name: 'TIME SLOW',
        duration: 8,
        immediateEffect: {
          enemySpeedMultiplier: 0.6, // Slows enemies by 40%
        },
        psychologicalCost: {
          enemyPredictionBonus: 0.25, // +25% prediction accuracy
          reactionWindowReduction: 0.3, // -30% future reaction windows
          durationAfterExpiry: 15 // Cost lasts 15 seconds after expiry
        },
        uiText: 'The world gives you time. It remembers.',
        color: 0x4488ff
      },
      DAMAGE_BOOST: {
        name: 'DAMAGE BOOST',
        duration: 5,
        immediateEffect: {
          damageMultiplier: 1.5, // +50% damage
        },
        psychologicalCost: {
          enemyResistanceToPattern: 0.4, // Enemies resist repeated patterns
          durationAfterExpiry: 10
        },
        uiText: 'Power has consequences. They adapt.',
        color: 0xff4444
      },
      SPEED_SURGE: {
        name: 'SPEED SURGE',
        duration: 6,
        immediateEffect: {
          speedMultiplier: 1.6, // +60% movement speed
        },
        psychologicalCost: {
          worldAwarenessIncrease: 0.35, // World tracks you better
          hazardResponseSpeed: 1.5, // Hazards respond 50% faster
          durationAfterExpiry: 12
        },
        uiText: 'You move faster. So does judgment.',
        color: 0x44ff44
      }
    };
  }
  
  /**
   * Create power-up pickup in world
   */
  createPowerUpPickup(position, type) {
    const THREE = window.THREE;
    const powerUpDef = this.powerUpTypes[type];
    
    if (!powerUpDef) return null;
    
    // Create rotating crystal shape
    const geometry = new THREE.OctahedronGeometry(0.6);
    const material = new THREE.MeshStandardMaterial({ 
      color: powerUpDef.color,
      roughness: 0.2,
      metalness: 0.8,
      emissive: powerUpDef.color,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.9
    });
    
    const pickup = new THREE.Mesh(geometry, material);
    pickup.position.copy(position);
    pickup.castShadow = true;
    
    // Add glowing aura
    const auraGeometry = new THREE.SphereGeometry(1, 16, 16);
    const auraMaterial = new THREE.MeshBasicMaterial({
      color: powerUpDef.color,
      transparent: true,
      opacity: 0.2,
      wireframe: true
    });
    const aura = new THREE.Mesh(auraGeometry, auraMaterial);
    pickup.add(aura);
    
    pickup.userData = {
      type: 'powerUp',
      powerUpType: type,
      rotationSpeed: 2,
      bobSpeed: 2,
      bobHeight: 0.3,
      collected: false,
      spawnTime: Date.now() / 1000
    };
    
    this.scene.add(pickup);
    
    return pickup;
  }
  
  /**
   * Activate power-up when collected
   */
  activatePowerUp(type, onNotification) {
    const powerUpDef = this.powerUpTypes[type];
    if (!powerUpDef) return null;
    
    const now = Date.now() / 1000;
    
    const activation = {
      type: type,
      definition: powerUpDef,
      activationTime: now,
      expiryTime: now + powerUpDef.duration,
      costStartTime: null, // Will be set when power-up expires
      costEndTime: null,
      active: true
    };
    
    this.activePowerUps.push(activation);
    this.powerUpHistory.push(activation);
    
    // Show notification with consequence warning
    if (onNotification) {
      onNotification(`${powerUpDef.name} Activated!`, 'powerup');
      setTimeout(() => {
        onNotification(powerUpDef.uiText, 'warning');
      }, 500);
    }
    
    return activation;
  }
  
  /**
   * Update power-ups and apply effects
   */
  update(delta, enemies) {
    const now = Date.now() / 1000;
    
    // Update active power-ups
    for (let i = this.activePowerUps.length - 1; i >= 0; i--) {
      const powerUp = this.activePowerUps[i];
      
      // Check if expired
      if (now >= powerUp.expiryTime && powerUp.active) {
        powerUp.active = false;
        powerUp.costStartTime = now;
        powerUp.costEndTime = now + powerUp.definition.psychologicalCost.durationAfterExpiry;
        
        // Notify about consequence phase
        console.log(`${powerUp.type} expired. Consequences begin.`);
      }
      
      // Check if cost period is over
      if (powerUp.costStartTime && now >= powerUp.costEndTime) {
        this.activePowerUps.splice(i, 1);
      }
    }
  }
  
  /**
   * Get current active effects
   */
  getActiveEffects() {
    const effects = {
      enemySpeedMultiplier: 1.0,
      damageMultiplier: 1.0,
      speedMultiplier: 1.0,
      enemyPredictionBonus: 0,
      reactionWindowReduction: 0,
      enemyResistanceToPattern: 0,
      worldAwarenessIncrease: 0,
      hazardResponseSpeed: 1.0
    };
    
    const now = Date.now() / 1000;
    
    this.activePowerUps.forEach(powerUp => {
      if (powerUp.active) {
        // Apply immediate benefits
        const immediate = powerUp.definition.immediateEffect;
        if (immediate.enemySpeedMultiplier) {
          effects.enemySpeedMultiplier *= immediate.enemySpeedMultiplier;
        }
        if (immediate.damageMultiplier) {
          effects.damageMultiplier *= immediate.damageMultiplier;
        }
        if (immediate.speedMultiplier) {
          effects.speedMultiplier *= immediate.speedMultiplier;
        }
      } else if (powerUp.costStartTime && powerUp.costEndTime && now < powerUp.costEndTime) {
        // Apply psychological costs
        const cost = powerUp.definition.psychologicalCost;
        if (cost.enemyPredictionBonus) {
          effects.enemyPredictionBonus += cost.enemyPredictionBonus;
        }
        if (cost.reactionWindowReduction) {
          effects.reactionWindowReduction += cost.reactionWindowReduction;
        }
        if (cost.enemyResistanceToPattern) {
          effects.enemyResistanceToPattern += cost.enemyResistanceToPattern;
        }
        if (cost.worldAwarenessIncrease) {
          effects.worldAwarenessIncrease += cost.worldAwarenessIncrease;
        }
        if (cost.hazardResponseSpeed) {
          effects.hazardResponseSpeed *= cost.hazardResponseSpeed;
        }
      }
    });
    
    return effects;
  }
  
  /**
   * Check if specific power-up is active
   */
  isPowerUpActive(type) {
    const now = Date.now() / 1000;
    return this.activePowerUps.some(p => p.type === type && p.active);
  }
  
  /**
   * Check if in cost period of specific power-up
   */
  isInCostPeriod(type) {
    const now = Date.now() / 1000;
    return this.activePowerUps.some(p => 
      p.type === type && 
      !p.active && 
      p.costStartTime && 
      now < p.costEndTime
    );
  }
  
  /**
   * Get remaining time for active power-up
   */
  getRemainingTime(type) {
    const now = Date.now() / 1000;
    const powerUp = this.activePowerUps.find(p => p.type === type && p.active);
    
    if (!powerUp) return 0;
    return Math.max(0, powerUp.expiryTime - now);
  }
  
  /**
   * Apply enemy speed modification based on active power-ups
   */
  modifyEnemySpeed(baseSpeed) {
    const effects = this.getActiveEffects();
    return baseSpeed * effects.enemySpeedMultiplier;
  }
  
  /**
   * Apply damage modification based on active power-ups
   */
  modifyDamage(baseDamage) {
    const effects = this.getActiveEffects();
    return baseDamage * effects.damageMultiplier;
  }
  
  /**
   * Apply player speed modification
   */
  modifyPlayerSpeed(baseSpeed) {
    const effects = this.getActiveEffects();
    return baseSpeed * effects.speedMultiplier;
  }
  
  /**
   * Check if enemy should resist this attack based on pattern
   */
  shouldResistAttack(attackPattern) {
    const effects = this.getActiveEffects();
    
    // If there's resistance and this is a repeated pattern, apply resistance
    if (effects.enemyResistanceToPattern > 0) {
      // Simple pattern detection: if same attack type used recently
      const recentAttacks = this.powerUpHistory.filter(p => 
        p.type === attackPattern && 
        Date.now() / 1000 - p.activationTime < 5
      );
      
      if (recentAttacks.length > 1) {
        // Return resistance value (0-1, where 1 = full resistance)
        return Math.min(effects.enemyResistanceToPattern, 0.8);
      }
    }
    
    return 0;
  }
  
  /**
   * Get enhanced enemy prediction accuracy
   */
  getEnemyPredictionBonus() {
    const effects = this.getActiveEffects();
    return effects.enemyPredictionBonus;
  }
  
  /**
   * Get hazard response speed multiplier
   */
  getHazardResponseSpeed() {
    const effects = this.getActiveEffects();
    return effects.hazardResponseSpeed;
  }
  
  /**
   * Get UI display data for active power-ups
   */
  getUIData() {
    const now = Date.now() / 1000;
    const uiData = [];
    
    this.activePowerUps.forEach(powerUp => {
      if (powerUp.active) {
        uiData.push({
          name: powerUp.definition.name,
          remaining: powerUp.expiryTime - now,
          total: powerUp.definition.duration,
          color: powerUp.definition.color,
          phase: 'active'
        });
      } else if (powerUp.costStartTime && now < powerUp.costEndTime) {
        uiData.push({
          name: `${powerUp.definition.name} (Cost)`,
          remaining: powerUp.costEndTime - now,
          total: powerUp.definition.psychologicalCost.durationAfterExpiry,
          color: 0x666666,
          phase: 'cost'
        });
      }
    });
    
    return uiData;
  }
  
  /**
   * Animate power-up pickup in world
   */
  animatePowerUpPickup(pickup, delta) {
    if (!pickup || !pickup.userData || pickup.userData.type !== 'powerUp') return;
    
    const time = Date.now() / 1000 - pickup.userData.spawnTime;
    
    // Rotate
    pickup.rotation.y += delta * pickup.userData.rotationSpeed;
    pickup.rotation.x += delta * pickup.userData.rotationSpeed * 0.5;
    
    // Bob up and down
    pickup.position.y += Math.sin(time * pickup.userData.bobSpeed) * pickup.userData.bobHeight * delta;
    
    // Pulse aura
    if (pickup.children[0]) {
      const aura = pickup.children[0];
      aura.scale.setScalar(1 + Math.sin(time * 3) * 0.2);
      aura.material.opacity = 0.1 + Math.sin(time * 4) * 0.1;
    }
  }
}

// Export to global scope
if (typeof window !== 'undefined') {
  window.PowerUpSystem = PowerUpSystem;
}
