/**
 * Enemy System with Attack States
 * Enemies don't damage on collision - they have telegraphed attacks
 */

class EnemySystem {
  constructor(scene, intentTracker) {
    this.scene = scene;
    this.intentTracker = intentTracker;
    
    // Enemy type definitions
    this.enemyTypes = {
      OBSERVER: {
        name: 'Observer',
        size: 0.5,
        health: 60,
        speed: 2,
        color: 0x8888ff,
        attackFrequency: 0.1, // Rarely attacks (10% chance)
        attackDamage: 5,
        attackWindup: 1.5,
        attackDuration: 0.3,
        attackRange: 4,
        detectionRange: 30,
        predictionContribution: 0.15, // Increases world prediction by 15%
        description: 'Watches and learns. Makes everything smarter.'
      },
      PUNISHER: {
        name: 'Punisher',
        size: 0.7,
        health: 120,
        speed: 3,
        color: 0xff8844,
        attackFrequency: 0.4,
        attackDamage: 12,
        attackWindup: 0.8,
        attackDuration: 0.5,
        attackRange: 3,
        detectionRange: 25,
        patternMemory: 5, // Remembers last 5 player actions
        description: 'Targets repeated behavior. Punishes patterns.'
      },
      DISTORTER: {
        name: 'Distorter',
        size: 0.6,
        health: 80,
        speed: 2.5,
        color: 0xff44ff,
        attackFrequency: 0.3,
        attackDamage: 0, // Doesn't do HP damage
        attackWindup: 1.0,
        attackDuration: 0.4,
        attackRange: 8,
        detectionRange: 28,
        environmentalEffect: true,
        description: 'Warps the world. Never touches you.'
      }
    };
  }
  
  /**
   * Create enemy of specified type
   */
  createEnemy(position, type) {
    const THREE = window.THREE;
    const enemyDef = this.enemyTypes[type];
    
    if (!enemyDef) return null;
    
    // Create enemy mesh
    const geometry = new THREE.SphereGeometry(enemyDef.size, 16, 16);
    const material = new THREE.MeshStandardMaterial({ 
      color: enemyDef.color,
      roughness: 0.7,
      metalness: 0.3,
      emissive: enemyDef.color,
      emissiveIntensity: 0.2
    });
    
    const enemy = new THREE.Mesh(geometry, material);
    enemy.position.copy(position);
    enemy.castShadow = true;
    enemy.receiveShadow = true;
    
    // Add eye indicator
    const eyeGeometry = new THREE.SphereGeometry(enemyDef.size * 0.2, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eye.position.set(0, 0, enemyDef.size * 0.7);
    enemy.add(eye);
    
    // Add attack indicator (initially hidden)
    const attackIndicatorGeometry = new THREE.RingGeometry(
      enemyDef.attackRange * 0.8,
      enemyDef.attackRange,
      32
    );
    const attackIndicatorMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    const attackIndicator = new THREE.Mesh(attackIndicatorGeometry, attackIndicatorMaterial);
    attackIndicator.rotation.x = -Math.PI / 2;
    attackIndicator.position.y = -enemyDef.size;
    enemy.add(attackIndicator);
    
    enemy.userData = {
      type: 'enemy',
      enemyType: type,
      definition: enemyDef,
      health: enemyDef.health,
      maxHealth: enemyDef.health,
      state: 'patrol',
      attackState: 'idle', // idle, windup, attacking, cooldown
      attackWindupStartTime: 0,
      attackStartTime: 0,
      lastAttackTime: 0,
      attackCooldown: 2,
      velocity: new THREE.Vector3(),
      patrolTarget: this.generatePatrolTarget(position),
      observedActions: [], // For Punishers
      lastObservationTime: 0,
      attackIndicator: attackIndicator,
      baseSpeed: enemyDef.speed, // Store base speed for Punisher calculations
      patternDetected: false
    };
    
    this.scene.add(enemy);
    
    return enemy;
  }
  
  /**
   * Update enemy AI and attack states
   */
  updateEnemy(enemy, player, delta, powerUpEffects) {
    if (!enemy || !enemy.userData || enemy.userData.type !== 'enemy') return;
    
    const now = Date.now() / 1000;
    const userData = enemy.userData;
    const def = userData.definition;
    
    const distanceToPlayer = player.position.distanceTo(enemy.position);
    
    // Determine behavior state
    if (distanceToPlayer < def.detectionRange) {
      if (distanceToPlayer < def.attackRange && userData.attackState === 'idle') {
        userData.state = 'engage';
      } else if (distanceToPlayer < def.detectionRange) {
        userData.state = 'chase';
      }
    } else {
      userData.state = 'patrol';
    }
    
    // Handle movement based on state
    this.handleMovement(enemy, player, delta, powerUpEffects);
    
    // Handle attack state machine
    this.handleAttackState(enemy, player, now, delta);
    
    // Type-specific behavior
    if (userData.enemyType === 'OBSERVER') {
      this.handleObserverBehavior(enemy, player, now);
    } else if (userData.enemyType === 'PUNISHER') {
      this.handlePunisherBehavior(enemy, player, now);
    } else if (userData.enemyType === 'DISTORTER') {
      this.handleDistorterBehavior(enemy, player, now);
    }
    
    // Update visual feedback
    this.updateVisuals(enemy, now);
  }
  
  /**
   * Handle enemy movement
   */
  handleMovement(enemy, player, delta, powerUpEffects) {
    const userData = enemy.userData;
    const def = userData.definition;
    const THREE = window.THREE;
    
    // Apply power-up speed modifications
    let speed = def.speed;
    if (powerUpEffects && powerUpEffects.enemySpeedMultiplier) {
      speed *= powerUpEffects.enemySpeedMultiplier;
    }
    
    const direction = new THREE.Vector3();
    
    switch (userData.state) {
      case 'patrol':
        direction.subVectors(userData.patrolTarget, enemy.position);
        direction.y = 0;
        
        if (direction.length() < 2) {
          userData.patrolTarget = this.generatePatrolTarget(enemy.position);
        }
        
        if (direction.length() > 0) {
          direction.normalize();
          enemy.position.add(direction.multiplyScalar(speed * 0.5 * delta));
        }
        break;
        
      case 'chase':
        // Enhanced prediction if Observer is present or power-up bonus
        let predictionMultiplier = 1.5;
        if (powerUpEffects && powerUpEffects.enemyPredictionBonus) {
          predictionMultiplier += powerUpEffects.enemyPredictionBonus * 3;
        }
        
        const playerVel = player.userData.velocity.clone();
        const predictedPos = player.position.clone().add(playerVel.multiplyScalar(predictionMultiplier));
        
        direction.subVectors(predictedPos, enemy.position);
        direction.y = 0;
        
        if (direction.length() > 0) {
          direction.normalize();
          enemy.position.add(direction.multiplyScalar(speed * delta));
        }
        break;
        
      case 'engage':
        // Face player and prepare to attack
        direction.subVectors(player.position, enemy.position);
        direction.y = 0;
        
        if (direction.length() > def.attackRange * 0.8) {
          direction.normalize();
          enemy.position.add(direction.multiplyScalar(speed * 0.3 * delta));
        }
        break;
    }
    
    // Rotate toward movement direction
    if (direction.length() > 0) {
      enemy.rotation.y = Math.atan2(direction.x, direction.z);
    }
    
    // Keep on ground
    enemy.position.y = def.size;
  }
  
  /**
   * Handle attack state machine
   */
  handleAttackState(enemy, player, now, delta) {
    const userData = enemy.userData;
    const def = userData.definition;
    const distanceToPlayer = player.position.distanceTo(enemy.position);
    
    switch (userData.attackState) {
      case 'idle':
        // Check if should start attack
        if (userData.state === 'engage' && 
            distanceToPlayer < def.attackRange &&
            now - userData.lastAttackTime > userData.attackCooldown) {
          
          // Random chance based on attack frequency
          if (Math.random() < def.attackFrequency) {
            userData.attackState = 'windup';
            userData.attackWindupStartTime = now;
          }
        }
        break;
        
      case 'windup':
        // Telegraphing attack - visual warning
        const windupProgress = (now - userData.attackWindupStartTime) / def.attackWindup;
        
        if (windupProgress >= 1) {
          // Start actual attack
          userData.attackState = 'attacking';
          userData.attackStartTime = now;
          
          // Register threat for intent tracker
          if (this.intentTracker) {
            this.intentTracker.registerThreat(enemy.position, userData.enemyType);
          }
        }
        break;
        
      case 'attacking':
        // Deal damage during attack frames
        const attackProgress = (now - userData.attackStartTime) / def.attackDuration;
        
        if (attackProgress < 1) {
          // Check if player is in range and apply damage
          if (distanceToPlayer < def.attackRange) {
            userData.pendingPlayerDamage = def.attackDamage;
          }
        } else {
          // Attack finished, enter cooldown
          userData.attackState = 'cooldown';
          userData.lastAttackTime = now;
        }
        break;
        
      case 'cooldown':
        // Brief recovery before returning to idle
        if (now - userData.lastAttackTime > 0.5) {
          userData.attackState = 'idle';
        }
        break;
    }
  }
  
  /**
   * Observer behavior - increases world prediction
   */
  handleObserverBehavior(enemy, player, now) {
    const userData = enemy.userData;
    
    // Observers watch from medium distance
    const distanceToPlayer = player.position.distanceTo(enemy.position);
    
    if (distanceToPlayer < 15 && distanceToPlayer > 8) {
      // Optimal observation distance
      userData.isObserving = true;
      
      // Contribution to world awareness (handled by game manager)
      userData.observationStrength = 1.0;
    } else {
      userData.isObserving = false;
      userData.observationStrength = 0;
    }
  }
  
  /**
   * Punisher behavior - targets repeated actions
   */
  handlePunisherBehavior(enemy, player, now) {
    const userData = enemy.userData;
    
    // Track player actions
    if (now - userData.lastObservationTime > 0.5) {
      userData.lastObservationTime = now;
      
      if (this.intentTracker) {
        const intentScores = this.intentTracker.getIntentScores();
        
        // Detect if player is repeating behavior
        const dominantIntent = Object.keys(intentScores).reduce((a, b) => 
          intentScores[a] > intentScores[b] ? a : b
        );
        
        userData.observedActions.push(dominantIntent);
        if (userData.observedActions.length > userData.definition.patternMemory) {
          userData.observedActions.shift();
        }
        
        // Check for pattern
        const uniqueActions = new Set(userData.observedActions);
        if (uniqueActions.size <= 2 && userData.observedActions.length >= 4) {
          // Pattern detected! Increase aggression
          userData.patternDetected = true;
          userData.attackCooldown = 1; // Attack more frequently
          // Use base speed to avoid exponential increases
          userData.definition.speed = userData.baseSpeed * 1.3;
        } else {
          userData.patternDetected = false;
          userData.attackCooldown = 2;
          // Reset to base speed
          userData.definition.speed = userData.baseSpeed;
        }
      }
    }
  }
  
  /**
   * Distorter behavior - modifies environment
   */
  handleDistorterBehavior(enemy, player, now) {
    const userData = enemy.userData;
    
    // Distorters don't do direct damage
    userData.definition.attackDamage = 0;
    
    // Instead, they create environmental effects
    if (userData.attackState === 'attacking') {
      // Mark for environmental distortion (handled by world reactions)
      userData.causeDistortion = true;
      userData.distortionCenter = enemy.position.clone();
      userData.distortionRadius = userData.definition.attackRange;
    } else {
      userData.causeDistortion = false;
    }
  }
  
  /**
   * Update visual feedback based on state
   */
  updateVisuals(enemy, now) {
    const userData = enemy.userData;
    const def = userData.definition;
    
    // Update attack indicator opacity during windup
    if (userData.attackState === 'windup') {
      const windupProgress = (now - userData.attackWindupStartTime) / def.attackWindup;
      userData.attackIndicator.material.opacity = windupProgress * 0.7;
      
      // Flash enemy color
      enemy.material.emissiveIntensity = 0.5 + windupProgress * 0.5;
    } else if (userData.attackState === 'attacking') {
      userData.attackIndicator.material.opacity = 0.9;
      enemy.material.emissiveIntensity = 1.0;
    } else {
      userData.attackIndicator.material.opacity = 0;
      enemy.material.emissiveIntensity = 0.2;
    }
    
    // Special visuals for Observer
    if (userData.enemyType === 'OBSERVER' && userData.isObserving) {
      enemy.material.emissive.setHex(0xffffaa);
      enemy.material.emissiveIntensity = 0.6;
    }
    
    // Special visuals for Punisher with pattern detected
    if (userData.enemyType === 'PUNISHER' && userData.patternDetected) {
      enemy.material.emissive.setHex(0xff0000);
      enemy.material.emissiveIntensity = 0.8;
    }
    
    // Special visuals for Distorter
    if (userData.enemyType === 'DISTORTER' && userData.causeDistortion) {
      enemy.material.emissive.setHex(0xff00ff);
      enemy.material.emissiveIntensity = 0.9;
    }
  }
  
  /**
   * Generate random patrol target
   */
  generatePatrolTarget(currentPos) {
    const THREE = window.THREE;
    const angle = Math.random() * Math.PI * 2;
    const distance = 10 + Math.random() * 20;
    
    return new THREE.Vector3(
      currentPos.x + Math.cos(angle) * distance,
      currentPos.y,
      currentPos.z + Math.sin(angle) * distance
    );
  }
  
  /**
   * Get total observation strength from all Observers
   */
  getTotalObservationStrength(enemies) {
    let total = 0;
    enemies.forEach(enemy => {
      if (enemy.userData.enemyType === 'OBSERVER' && enemy.userData.isObserving) {
        total += enemy.userData.observationStrength || 0;
      }
    });
    return total;
  }
}

// Export to global scope
if (typeof window !== 'undefined') {
  window.EnemySystem = EnemySystem;
}
