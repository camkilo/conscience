/**
 * 3D Vertical Map Generator
 * Creates interconnected behavior zones across multiple height layers
 */

class VerticalMapGenerator {
  constructor(scene, assetsManifest, gltfLoader) {
    this.scene = scene;
    this.assetsManifest = assetsManifest;
    this.gltfLoader = gltfLoader;
    this.zones = [];
    this.structures = [];
    this.loadedModels = {}; // Cache for loaded GLB models
  }
  
  /**
   * Generate complete vertical map with behavior zones using GLB assets
   */
  async generateMap() {
    const THREE = window.THREE;
    
    // Clear existing structures
    this.clearMap();
    
    // Ensure we have the GLB models loaded (passed from Game3D)
    if (!this.loadedModels.platform || !this.loadedModels.ramp || !this.loadedModels.wall) {
      console.warn('⚠️ Map generation skipped - GLB models not provided');
      return this.zones;
    }
    
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
    
    // Create zones using GLB models
    zoneDefinitions.forEach(zoneDef => {
      this.createBehaviorZone(zoneDef);
    });
    
    // Connect zones with ramps from GLB models
    this.connectZones(zoneDefinitions);
    
    return this.zones;
  }
  
  /**
   * Set loaded GLB models for map generation
   */
  setLoadedModels(models) {
    this.loadedModels = models;
  }
  
  /**
   * Create a behavior zone using GLB platform models
   */
  createBehaviorZone(zoneDef) {
    const THREE = window.THREE;
    
    // Create main platform using GLB model
    if (this.loadedModels.platform) {
      const platform = this.loadedModels.platform.clone();
      platform.position.set(zoneDef.centerX, zoneDef.heightLevel, zoneDef.centerZ);
      
      // Scale platform to match zone size
      const baseSize = 5; // Assume base model is about 5 units
      const scale = zoneDef.size / baseSize;
      platform.scale.set(scale, 1, scale);
      
      platform.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          // Tint the material to match zone color
          if (node.material) {
            const originalMaterial = node.material.clone();
            originalMaterial.emissive = new THREE.Color(zoneDef.color);
            originalMaterial.emissiveIntensity = 0.1;
            node.material = originalMaterial;
          }
        }
      });
      
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
      
      // Add zone-specific structures using GLB models
      this.addZoneStructures(zoneDef, platform);
    } else {
      console.warn(`⚠️ Cannot create zone ${zoneDef.name} - platform GLB model not loaded`);
    }
  }
  
  /**
   * Add structures specific to zone behavior using GLB models
   */
  addZoneStructures(zoneDef, platform) {
    const THREE = window.THREE;
    
    switch (zoneDef.behavior) {
      case 'rewards_aggression':
        // Add cover blocks using wall GLB models
        if (this.loadedModels.wall) {
          for (let i = 0; i < 5; i++) {
            const cover = this.loadedModels.wall.clone();
            cover.position.set(
              zoneDef.centerX + (Math.random() - 0.5) * zoneDef.size * 0.7,
              zoneDef.heightLevel + 1.5,
              zoneDef.centerZ + (Math.random() - 0.5) * zoneDef.size * 0.7
            );
            cover.scale.set(0.5, 0.5, 0.5); // Smaller for cover
            cover.traverse((node) => {
              if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
              }
            });
            this.scene.add(cover);
            this.structures.push(cover);
          }
        }
        break;
        
      case 'requires_precision':
        // Add narrow platforms using platform GLB models
        if (this.loadedModels.platform) {
          for (let i = 0; i < 4; i++) {
            const narrow = this.loadedModels.platform.clone();
            narrow.position.set(
              zoneDef.centerX + (i - 2) * 4,
              zoneDef.heightLevel + 2 + Math.random() * 2,
              zoneDef.centerZ
            );
            narrow.scale.set(0.6, 0.1, 0.2); // Narrow and thin
            narrow.traverse((node) => {
              if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
              }
            });
            this.scene.add(narrow);
            this.structures.push(narrow);
          }
        }
        break;
        
      case 'tests_evasion':
        // Add maze walls using wall GLB models
        if (this.loadedModels.wall) {
          const wallPositions = [
            [0, 5], [5, 0], [-5, 0], [0, -5],
            [5, 5], [-5, 5], [5, -5], [-5, -5]
          ];
          wallPositions.forEach(([dx, dz]) => {
            const wall = this.loadedModels.wall.clone();
            wall.position.set(
              zoneDef.centerX + dx,
              zoneDef.heightLevel + 2,
              zoneDef.centerZ + dz
            );
            wall.scale.set(0.4, 1, 1.6);
            wall.traverse((node) => {
              if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
              }
            });
            this.scene.add(wall);
            this.structures.push(wall);
          });
        }
        break;
        
      case 'tempts_greed':
        // Add pillars using wall GLB models (rotated to be vertical)
        if (this.loadedModels.wall) {
          for (let i = 0; i < 3; i++) {
            const pillar = this.loadedModels.wall.clone();
            pillar.position.set(
              zoneDef.centerX + (Math.random() - 0.5) * zoneDef.size * 0.6,
              zoneDef.heightLevel + 2.5,
              zoneDef.centerZ + (Math.random() - 0.5) * zoneDef.size * 0.6
            );
            pillar.scale.set(0.3, 1.5, 0.3);
            pillar.traverse((node) => {
              if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
                // Add glowing emissive for power-up pillars
                if (node.material) {
                  const material = node.material.clone();
                  material.emissive = new THREE.Color(0xffaa00);
                  material.emissiveIntensity = 0.3;
                  node.material = material;
                }
              }
            });
            pillar.userData = { type: 'powerUpSpawn' };
            this.scene.add(pillar);
            this.structures.push(pillar);
          }
        }
        break;
        
      case 'induces_panic':
        // Add unstable platforms using platform GLB models
        if (this.loadedModels.platform) {
          for (let i = 0; i < 6; i++) {
            const unstable = this.loadedModels.platform.clone();
            unstable.position.set(
              zoneDef.centerX + (Math.random() - 0.5) * zoneDef.size * 0.8,
              zoneDef.heightLevel + 1,
              zoneDef.centerZ + (Math.random() - 0.5) * zoneDef.size * 0.8
            );
            unstable.scale.set(0.6, 0.06, 0.6);
            unstable.traverse((node) => {
              if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
                // Make transparent to show instability
                if (node.material) {
                  const material = node.material.clone();
                  material.transparent = true;
                  material.opacity = 0.8;
                  node.material = material;
                }
              }
            });
            unstable.userData = { 
              type: 'collapsiblePlatform',
              timeUntilCollapse: 2,
              collapsed: false
            };
            this.scene.add(unstable);
            this.structures.push(unstable);
          }
        }
        break;
    }
  }
  
  /**
   * Connect zones with ramps and bridges using GLB models
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
   * Create ramp between zones using GLB ramp model
   */
  createRamp(zoneA, zoneB) {
    const THREE = window.THREE;
    
    if (!this.loadedModels.ramp) {
      console.warn('⚠️ Cannot create ramp - ramp GLB model not loaded');
      return;
    }
    
    const startPos = new THREE.Vector3(zoneA.centerX, zoneA.heightLevel, zoneA.centerZ);
    const endPos = new THREE.Vector3(zoneB.centerX, zoneB.heightLevel, zoneB.centerZ);
    
    const midPoint = startPos.clone().add(endPos).multiplyScalar(0.5);
    const distance = startPos.distanceTo(endPos);
    const angle = Math.atan2(endPos.z - startPos.z, endPos.x - startPos.x);
    
    const ramp = this.loadedModels.ramp.clone();
    ramp.position.copy(midPoint);
    ramp.rotation.y = angle;
    ramp.rotation.z = Math.atan2(endPos.y - startPos.y, distance * 0.5);
    
    // Scale ramp to fit distance
    const baseLength = 5; // Assume base ramp is about 5 units
    ramp.scale.set(distance / baseLength, 1, 0.8);
    
    ramp.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    
    this.scene.add(ramp);
    this.structures.push(ramp);
  }
  
  /**
   * Create bridge between zones using GLB platform model
   */
  createBridge(zoneA, zoneB) {
    const THREE = window.THREE;
    
    if (!this.loadedModels.platform) {
      console.warn('⚠️ Cannot create bridge - platform GLB model not loaded');
      return;
    }
    
    const startPos = new THREE.Vector3(zoneA.centerX, zoneA.heightLevel + 0.5, zoneA.centerZ);
    const endPos = new THREE.Vector3(zoneB.centerX, zoneB.heightLevel + 0.5, zoneB.centerZ);
    
    const midPoint = startPos.clone().add(endPos).multiplyScalar(0.5);
    const distance = startPos.distanceTo(endPos);
    const angle = Math.atan2(endPos.z - startPos.z, endPos.x - startPos.x);
    
    const bridge = this.loadedModels.platform.clone();
    bridge.position.copy(midPoint);
    bridge.rotation.y = angle;
    
    // Scale bridge to fit distance
    const baseLength = 5; // Assume base platform is about 5 units
    bridge.scale.set(distance / baseLength, 0.1, 0.6);
    
    bridge.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    
    this.scene.add(bridge);
    this.structures.push(bridge);
  }
  
  /**
   * Create elevator platform
   */
  createElevator(position, maxHeight) {
    const THREE = window.THREE;
    
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
    if (!player || !player.position) return; // Safety check for player
    
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
   * Clear existing map
   */
  clearMap() {
    this.zones.forEach(zone => this.scene.remove(zone));
    this.structures.forEach(structure => this.scene.remove(structure));
    this.zones = [];
    this.structures = [];
  }
}

// Export to global scope
if (typeof window !== 'undefined') {
  window.VerticalMapGenerator = VerticalMapGenerator;
}
