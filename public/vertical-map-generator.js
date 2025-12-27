/**
 * 3D Vertical Map Generator
 * Creates interconnected behavior zones across multiple height layers
 * Auto-generates Rapier physics colliders for all walkable surfaces
 */

class VerticalMapGenerator {
  constructor(scene) {
    this.scene = scene;
    this.zones = [];
    this.structures = [];
    this.colliders = []; // Track all physics colliders
  }
  
  /**
   * Generate complete vertical map with behavior zones and physics colliders
   * @param {RAPIER.World} physicsWorld - Rapier physics world for collider creation
   */
  generateMap(physicsWorld) {
    const THREE = window.THREE;
    const RAPIER = window.RAPIER;
    
    // Store physics world reference
    this.physicsWorld = physicsWorld;
    
    // Clear existing structures
    this.clearMap();
    
    // Define behavior zones (each tests a specific player instinct)
    const zoneDefinitions = [
      {
        name: 'Aggression Test',
        centerX: -30,
        centerZ: -30,
        heightLevel: 0,
        size: 20,
        behavior: 'rewards_aggression',
        color: 0xff4444,
        description: 'Close quarters, many enemies, rewards offensive play'
      },
      {
        name: 'Precision Chamber',
        centerX: 30,
        centerZ: -30,
        heightLevel: 5,
        size: 15,
        behavior: 'requires_precision',
        color: 0x4444ff,
        description: 'Narrow platforms, falling hazards, punishes mistakes'
      },
      {
        name: 'Evasion Maze',
        centerX: -30,
        centerZ: 30,
        heightLevel: 10,
        size: 25,
        behavior: 'tests_evasion',
        color: 0x44ff44,
        description: 'Winding paths, pursuing enemies, rewards mobility'
      },
      {
        name: 'Greed Trap',
        centerX: 30,
        centerZ: 30,
        heightLevel: 3,
        size: 18,
        behavior: 'tempts_greed',
        color: 0xffaa00,
        description: 'Visible rewards, hidden dangers, tests risk assessment'
      },
      {
        name: 'Panic Room',
        centerX: 0,
        centerZ: 0,
        heightLevel: 15,
        size: 12,
        behavior: 'induces_panic',
        color: 0xff00ff,
        description: 'Collapsing platforms, time pressure, tests composure'
      }
    ];
    
    // Create zones with auto-generated colliders
    zoneDefinitions.forEach(zoneDef => {
      this.createBehaviorZone(zoneDef);
    });
    
    // Connect zones with ramps and bridges (with colliders)
    this.connectZones(zoneDefinitions);
    
    // Add elevators with colliders
    this.createElevator(new THREE.Vector3(-10, 0, 0), 15);
    this.createElevator(new THREE.Vector3(10, 0, 0), 12);
    
    // Add collapsible platforms in high-stress zones
    this.createCollapsiblePlatforms();
    
    return this.zones;
  }
  
  /**
   * Create a behavior zone with physics collider
   */
  createBehaviorZone(zoneDef) {
    const THREE = window.THREE;
    const RAPIER = window.RAPIER;
    
    // Main platform
    const platformGeometry = new THREE.BoxGeometry(zoneDef.size, 1, zoneDef.size);
    const platformMaterial = new THREE.MeshStandardMaterial({ 
      color: zoneDef.color,
      roughness: 0.7,
      metalness: 0.3,
      emissive: zoneDef.color,
      emissiveIntensity: 0.1
    });
    
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.set(zoneDef.centerX, zoneDef.heightLevel, zoneDef.centerZ);
    platform.castShadow = true;
    platform.receiveShadow = true;
    
    platform.userData = {
      type: 'behaviorZone',
      zoneName: zoneDef.name,
      behavior: zoneDef.behavior,
      bounds: {
        minX: zoneDef.centerX - zoneDef.size / 2,
        maxX: zoneDef.centerX + zoneDef.size / 2,
        minZ: zoneDef.centerZ - zoneDef.size / 2,
        maxZ: zoneDef.centerZ + zoneDef.size / 2,
        y: zoneDef.heightLevel
      }
    };
    
    this.scene.add(platform);
    this.zones.push(platform);
    
    // Create physics collider for platform
    if (this.physicsWorld && RAPIER) {
      this.createBoxCollider(
        zoneDef.centerX,
        zoneDef.heightLevel,
        zoneDef.centerZ,
        zoneDef.size / 2,
        0.5,
        zoneDef.size / 2
      );
    }
    
    // Add zone-specific structures
    this.addZoneStructures(zoneDef, platform);
    
    // Add zone marker (floating text would be ideal, but we'll use a pillar)
    const markerGeometry = new THREE.CylinderGeometry(0.5, 0.5, 3, 8);
    const markerMaterial = new THREE.MeshBasicMaterial({ 
      color: zoneDef.color,
      transparent: true,
      opacity: 0.6
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.set(zoneDef.centerX, zoneDef.heightLevel + 3, zoneDef.centerZ);
    this.scene.add(marker);
    this.structures.push(marker);
  }
  
  /**
   * Create a box collider for a static object (fixed rigid body)
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} z - Z position
   * @param {number} halfExtentX - Half width (X)
   * @param {number} halfExtentY - Half height (Y)
   * @param {number} halfExtentZ - Half depth (Z)
   * @param {Object|null} rotation - Optional rotation as quaternion {x, y, z, w}
   * @returns {Object|undefined} Object with body and collider, or undefined if physics unavailable
   */
  createBoxCollider(x, y, z, halfExtentX, halfExtentY, halfExtentZ, rotation = null) {
    const RAPIER = window.RAPIER;
    if (!this.physicsWorld || !RAPIER) return;
    
    // Create rigid body descriptor (static, mass = 0)
    const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(x, y, z);
    
    if (rotation) {
      rigidBodyDesc.setRotation(rotation);
    }
    
    const rigidBody = this.physicsWorld.createRigidBody(rigidBodyDesc);
    
    // Create box collider
    const colliderDesc = RAPIER.ColliderDesc.cuboid(halfExtentX, halfExtentY, halfExtentZ)
      .setFriction(0.4)
      .setRestitution(0.1);
    
    const collider = this.physicsWorld.createCollider(colliderDesc, rigidBody);
    this.colliders.push({ body: rigidBody, collider });
    
    return { body: rigidBody, collider };
  }
  
  /**
   * Add structures specific to zone behavior with physics colliders
   */
  addZoneStructures(zoneDef, platform) {
    const THREE = window.THREE;
    
    switch (zoneDef.behavior) {
      case 'rewards_aggression':
        // Add cover blocks for tactical combat (with colliders)
        for (let i = 0; i < 5; i++) {
          const coverGeometry = new THREE.BoxGeometry(2, 2, 2);
          const coverMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
          const cover = new THREE.Mesh(coverGeometry, coverMaterial);
          const x = zoneDef.centerX + (Math.random() - 0.5) * zoneDef.size * 0.7;
          const y = zoneDef.heightLevel + 1.5;
          const z = zoneDef.centerZ + (Math.random() - 0.5) * zoneDef.size * 0.7;
          cover.position.set(x, y, z);
          cover.castShadow = true;
          cover.receiveShadow = true;
          this.scene.add(cover);
          this.structures.push(cover);
          
          // Add collider
          this.createBoxCollider(x, y, z, 1, 1, 1);
        }
        break;
        
      case 'requires_precision':
        // Add narrow platforms that require precise jumping (with colliders)
        for (let i = 0; i < 4; i++) {
          const narrowGeometry = new THREE.BoxGeometry(3, 0.5, 1);
          const narrowMaterial = new THREE.MeshStandardMaterial({ color: zoneDef.color });
          const narrow = new THREE.Mesh(narrowGeometry, narrowMaterial);
          const x = zoneDef.centerX + (i - 2) * 4;
          const y = zoneDef.heightLevel + 2 + Math.random() * 2;
          const z = zoneDef.centerZ;
          narrow.position.set(x, y, z);
          narrow.castShadow = true;
          narrow.receiveShadow = true;
          this.scene.add(narrow);
          this.structures.push(narrow);
          
          // Add collider for walkable narrow platform
          this.createBoxCollider(x, y, z, 1.5, 0.25, 0.5);
        }
        break;
        
      case 'tests_evasion':
        // Add maze walls (with colliders)
        const wallPositions = [
          [0, 5], [5, 0], [-5, 0], [0, -5],
          [5, 5], [-5, 5], [5, -5], [-5, -5]
        ];
        wallPositions.forEach(([dx, dz]) => {
          const wallGeometry = new THREE.BoxGeometry(2, 4, 8);
          const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x336633 });
          const wall = new THREE.Mesh(wallGeometry, wallMaterial);
          const x = zoneDef.centerX + dx;
          const y = zoneDef.heightLevel + 2;
          const z = zoneDef.centerZ + dz;
          wall.position.set(x, y, z);
          wall.castShadow = true;
          wall.receiveShadow = true;
          this.scene.add(wall);
          this.structures.push(wall);
          
          // Add collider for walls
          this.createBoxCollider(x, y, z, 1, 2, 4);
        });
        break;
        
      case 'tempts_greed':
        // Add pillars with glowing tops (power-up spawns) (with colliders)
        for (let i = 0; i < 3; i++) {
          const pillarGeometry = new THREE.CylinderGeometry(0.8, 0.8, 5, 8);
          const pillarMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x886644,
            emissive: 0xffaa00,
            emissiveIntensity: 0.3
          });
          const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
          const x = zoneDef.centerX + (Math.random() - 0.5) * zoneDef.size * 0.6;
          const y = zoneDef.heightLevel + 2.5;
          const z = zoneDef.centerZ + (Math.random() - 0.5) * zoneDef.size * 0.6;
          pillar.position.set(x, y, z);
          pillar.castShadow = true;
          pillar.receiveShadow = true;
          pillar.userData = { type: 'powerUpSpawn' };
          this.scene.add(pillar);
          this.structures.push(pillar);
          
          // Add cylinder collider for pillar
          this.createCylinderCollider(x, y, z, 0.8, 2.5);
        }
        break;
        
      case 'induces_panic':
        // Add unstable platforms (will be made collapsible) (with colliders)
        for (let i = 0; i < 6; i++) {
          const unstableGeometry = new THREE.BoxGeometry(3, 0.3, 3);
          const unstableMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x664444,
            transparent: true,
            opacity: 0.8
          });
          const unstable = new THREE.Mesh(unstableGeometry, unstableMaterial);
          const x = zoneDef.centerX + (Math.random() - 0.5) * zoneDef.size * 0.8;
          const y = zoneDef.heightLevel + 1;
          const z = zoneDef.centerZ + (Math.random() - 0.5) * zoneDef.size * 0.8;
          unstable.position.set(x, y, z);
          unstable.castShadow = true;
          unstable.receiveShadow = true;
          unstable.userData = { 
            type: 'collapsible',
            triggerDelay: 1.0, // Collapses after 1 second of player standing on it
            lastTriggerTime: 0
          };
          this.scene.add(unstable);
          this.structures.push(unstable);
          
          // Add collider for unstable platform
          this.createBoxCollider(x, y, z, 1.5, 0.15, 1.5);
        }
        break;
    }
  }
  
  /**
   * Create a cylinder collider for a static object (fixed rigid body)
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} z - Z position
   * @param {number} radius - Cylinder radius
   * @param {number} halfHeight - Half height of cylinder
   * @returns {Object|undefined} Object with body and collider, or undefined if physics unavailable
   */
  createCylinderCollider(x, y, z, radius, halfHeight) {
    const RAPIER = window.RAPIER;
    if (!this.physicsWorld || !RAPIER) return;
    
    // Create rigid body descriptor (static, mass = 0)
    const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(x, y, z);
    
    const rigidBody = this.physicsWorld.createRigidBody(rigidBodyDesc);
    
    // Create cylinder collider
    const colliderDesc = RAPIER.ColliderDesc.cylinder(halfHeight, radius)
      .setFriction(0.4)
      .setRestitution(0.1);
    
    const collider = this.physicsWorld.createCollider(colliderDesc, rigidBody);
    this.colliders.push({ body: rigidBody, collider });
    
    return { body: rigidBody, collider };
  }
  
  /**
   * Connect zones with ramps and bridges
   */
  connectZones(zoneDefs) {
    const THREE = window.THREE;
    
    // Connect adjacent zones
    for (let i = 0; i < zoneDefs.length - 1; i++) {
      const zoneA = zoneDefs[i];
      const zoneB = zoneDefs[i + 1];
      
      const heightDiff = Math.abs(zoneB.heightLevel - zoneA.heightLevel);
      const distance = Math.sqrt(
        Math.pow(zoneB.centerX - zoneA.centerX, 2) +
        Math.pow(zoneB.centerZ - zoneA.centerZ, 2)
      );
      
      if (heightDiff > 3) {
        // Use ramp for significant height differences
        this.createRamp(zoneA, zoneB);
      } else {
        // Use bridge for similar heights
        this.createBridge(zoneA, zoneB);
      }
    }
  }
  
  /**
   * Create ramp between zones with physics collider
   */
  createRamp(zoneA, zoneB) {
    const THREE = window.THREE;
    const RAPIER = window.RAPIER;
    
    const startPos = new THREE.Vector3(zoneA.centerX, zoneA.heightLevel, zoneA.centerZ);
    const endPos = new THREE.Vector3(zoneB.centerX, zoneB.heightLevel, zoneB.centerZ);
    
    const midPoint = startPos.clone().add(endPos).multiplyScalar(0.5);
    const distance = startPos.distanceTo(endPos);
    const angle = Math.atan2(endPos.z - startPos.z, endPos.x - startPos.x);
    const tiltAngle = Math.atan2(endPos.y - startPos.y, distance);
    
    const rampGeometry = new THREE.BoxGeometry(distance, 0.5, 4);
    const rampMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x665544,
      roughness: 0.8
    });
    
    const ramp = new THREE.Mesh(rampGeometry, rampMaterial);
    ramp.position.copy(midPoint);
    ramp.rotation.y = angle;
    ramp.rotation.z = tiltAngle;
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    
    this.scene.add(ramp);
    this.structures.push(ramp);
    
    // Create physics collider for ramp
    if (this.physicsWorld && RAPIER) {
      // Create rotated box collider
      const quat = new THREE.Quaternion();
      quat.setFromEuler(new THREE.Euler(0, angle, tiltAngle));
      
      this.createBoxCollider(
        midPoint.x,
        midPoint.y,
        midPoint.z,
        distance / 2,
        0.25,
        2,
        { x: quat.x, y: quat.y, z: quat.z, w: quat.w }
      );
    }
  }
  
  /**
   * Create bridge between zones with physics collider
   */
  createBridge(zoneA, zoneB) {
    const THREE = window.THREE;
    const RAPIER = window.RAPIER;
    
    const startPos = new THREE.Vector3(zoneA.centerX, zoneA.heightLevel + 0.5, zoneA.centerZ);
    const endPos = new THREE.Vector3(zoneB.centerX, zoneB.heightLevel + 0.5, zoneB.centerZ);
    
    const midPoint = startPos.clone().add(endPos).multiplyScalar(0.5);
    const distance = startPos.distanceTo(endPos);
    const angle = Math.atan2(endPos.z - startPos.z, endPos.x - startPos.x);
    
    const bridgeGeometry = new THREE.BoxGeometry(distance, 0.3, 3);
    const bridgeMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x553322,
      roughness: 0.9
    });
    
    const bridge = new THREE.Mesh(bridgeGeometry, bridgeMaterial);
    bridge.position.copy(midPoint);
    bridge.rotation.y = angle;
    bridge.castShadow = true;
    bridge.receiveShadow = true;
    
    this.scene.add(bridge);
    this.structures.push(bridge);
    
    // Create physics collider for bridge
    if (this.physicsWorld && RAPIER) {
      const quat = new THREE.Quaternion();
      quat.setFromEuler(new THREE.Euler(0, angle, 0));
      
      this.createBoxCollider(
        midPoint.x,
        midPoint.y,
        midPoint.z,
        distance / 2,
        0.15,
        1.5,
        { x: quat.x, y: quat.y, z: quat.z, w: quat.w }
      );
    }
  }
  
  /**
   * Create elevator platform with physics collider
   */
  createElevator(position, maxHeight) {
    const THREE = window.THREE;
    const RAPIER = window.RAPIER;
    
    const elevatorGeometry = new THREE.CylinderGeometry(2, 2, 0.5, 16);
    const elevatorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x6666aa,
      roughness: 0.5,
      metalness: 0.5,
      emissive: 0x4444aa,
      emissiveIntensity: 0.3
    });
    
    const elevator = new THREE.Mesh(elevatorGeometry, elevatorMaterial);
    elevator.position.copy(position);
    elevator.castShadow = true;
    elevator.receiveShadow = true;
    
    elevator.userData = {
      type: 'elevator',
      baseY: position.y,
      maxY: maxHeight,
      currentY: position.y,
      direction: 1, // 1 = up, -1 = down
      speed: 2,
      activated: false
    };
    
    this.scene.add(elevator);
    this.structures.push(elevator);
    
    // Create physics collider for elevator
    if (this.physicsWorld && RAPIER) {
      this.createCylinderCollider(position.x, position.y, position.z, 2, 0.25);
    }
    
    return elevator;
  }
  
  /**
   * Create collapsible platforms in panic zones
   */
  createCollapsiblePlatforms() {
    // Already created in zone structures with 'collapsible' type
    // This method could add more if needed
  }
  
  /**
   * Update dynamic map elements
   */
  updateDynamicElements(player, delta) {
    this.structures.forEach(structure => {
      if (!structure.userData) return;
      
      // Update elevators
      if (structure.userData.type === 'elevator') {
        this.updateElevator(structure, player, delta);
      }
      
      // Update collapsible platforms
      if (structure.userData.type === 'collapsible') {
        this.updateCollapsible(structure, player, delta);
      }
    });
  }
  
  /**
   * Update elevator movement
   */
  updateElevator(elevator, player, delta) {
    const userData = elevator.userData;
    
    // Check if player is on elevator
    const distToPlayer = Math.sqrt(
      Math.pow(player.position.x - elevator.position.x, 2) +
      Math.pow(player.position.z - elevator.position.z, 2)
    );
    
    if (distToPlayer < 2 && Math.abs(player.position.y - elevator.position.y) < 2) {
      userData.activated = true;
    }
    
    if (userData.activated) {
      // Move elevator
      userData.currentY += userData.direction * userData.speed * delta;
      
      // Reverse direction at limits
      if (userData.currentY >= userData.maxY) {
        userData.direction = -1;
        userData.currentY = userData.maxY;
      } else if (userData.currentY <= userData.baseY) {
        userData.direction = 1;
        userData.currentY = userData.baseY;
      }
      
      elevator.position.y = userData.currentY;
    }
  }
  
  /**
   * Update collapsible platform
   */
  updateCollapsible(platform, player, delta) {
    const userData = platform.userData;
    const now = Date.now() / 1000;
    
    // Check if player is on platform
    const distToPlayer = Math.sqrt(
      Math.pow(player.position.x - platform.position.x, 2) +
      Math.pow(player.position.z - platform.position.z, 2)
    );
    
    if (distToPlayer < 2 && Math.abs(player.position.y - platform.position.y) < 1) {
      if (userData.lastTriggerTime === 0) {
        userData.lastTriggerTime = now;
      }
      
      // Check if time to collapse
      if (now - userData.lastTriggerTime > userData.triggerDelay) {
        // Collapse animation
        platform.material.opacity -= delta * 0.5;
        platform.position.y -= delta * 2;
        
        if (platform.material.opacity <= 0) {
          this.scene.remove(platform);
        }
      } else {
        // Visual warning before collapse
        const warningIntensity = (now - userData.lastTriggerTime) / userData.triggerDelay;
        platform.material.emissive.setRGB(warningIntensity, 0, 0);
      }
    } else {
      // Reset trigger if player leaves
      userData.lastTriggerTime = 0;
    }
  }
  
  /**
   * Get zone player is currently in
   */
  getPlayerZone(playerPosition) {
    for (const zone of this.zones) {
      const bounds = zone.userData.bounds;
      if (
        playerPosition.x >= bounds.minX &&
        playerPosition.x <= bounds.maxX &&
        playerPosition.z >= bounds.minZ &&
        playerPosition.z <= bounds.maxZ &&
        Math.abs(playerPosition.y - bounds.y) < 3
      ) {
        return zone.userData;
      }
    }
    return null;
  }
  
  /**
   * Clear existing map and physics colliders
   */
  clearMap() {
    this.zones.forEach(zone => this.scene.remove(zone));
    this.structures.forEach(structure => this.scene.remove(structure));
    
    // Remove physics colliders
    if (this.physicsWorld && this.colliders.length > 0) {
      this.colliders.forEach(({ body }) => {
        if (body && this.physicsWorld) {
          this.physicsWorld.removeRigidBody(body);
        }
      });
    }
    
    this.zones = [];
    this.structures = [];
    this.colliders = [];
  }
}

// Export to global scope
if (typeof window !== 'undefined') {
  window.VerticalMapGenerator = VerticalMapGenerator;
}
