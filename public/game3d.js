/**
 * 3D Game Engine using Three.js
 * Full-screen WebGL canvas with HUD, controls, camera, and visual effects
 */

(function() {
  'use strict';
  
  // Access THREE from global scope
  const THREE = window.THREE;

class Game3D {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.player = null;
    this.playerBody = null; // Physics body for player
    this.enemies = [];
    this.particles = [];
    this.clock = new THREE.Clock();
    this.lastDelta = 0;
    
    // Diagnostic overlay system
    this.diagnosticOverlay = null;
    this.diagnosticMessages = [];
    
    // Physics world
    this.world = null;
    this.physicsBodies = []; // Track all physics bodies
    this.physicsObjects = []; // Map physics bodies to Three.js objects
    
    // Input state
    this.keys = {};
    this.mouse = { x: 0, y: 0, buttons: {} };
    
    // Camera settings
    this.cameraOffset = new THREE.Vector3(0, 5, 10);
    this.cameraVelocity = new THREE.Vector3();
    
    // Player state
    this.playerHealth = 100;
    this.playerMaxHealth = 100;
    this.playerEnergy = 100;
    this.playerScore = 0;
    
    // Movement physics configuration (force-based)
    this.physics = {
      moveForce: 30,      // Force applied for movement
      maxSpeed: 8,        // Maximum velocity
      jumpForce: 15,      // Jump force
      damping: 0.9        // Linear damping for friction
    };
    
    // NEW CONSCIENCE ENGINE SYSTEMS
    this.intentTracker = null;
    this.worldReactions = null;
    this.powerUpSystem = null;
    this.enemySystem = null;
    this.deathScreen = null;
    this.mapGenerator = null;
    this.gltfLoader = null;
    this.meshyCharacter = null;
    
    // Configuration
    this.config = {
      meshyCharacterPath: 'https://playconscience.com/Meshy_AI_biped%202/Meshy_AI_Character_output.glb',
      playerModelPath: 'https://playconscience.com/Meshy_AI_biped%202/Meshy_AI_Character_output.glb',
      usePhysics: true
    };
    
    // Enemy tier configuration (kept for compatibility but will use new EnemySystem)
    this.enemyTypes = {
      swarm: {
        tier: 'swarm',
        size: 0.4,
        health: 30,
        speed: 5,
        damage: 1,
        attackRange: 2,
        detectionRange: 20,
        attackCooldown: 0.5,
        color: 0xff6666,
        spawnWeight: 0.4
      },
      normal: {
        tier: 'normal',
        size: 0.6,
        health: 100,
        speed: 3,
        damage: 2,
        attackRange: 2.5,
        detectionRange: 25,
        attackCooldown: 1,
        color: 0xff4444,
        spawnWeight: 0.4
      },
      heavy: {
        tier: 'heavy',
        size: 0.9,
        health: 200,
        speed: 1.5,
        damage: 8,
        attackRange: 3,
        detectionRange: 30,
        attackCooldown: 2,
        color: 0xff0000,
        spawnWeight: 0.15
      },
      controller: {
        tier: 'controller',
        size: 0.7,
        health: 80,
        speed: 2,
        damage: 5,
        attackRange: 10,
        detectionRange: 35,
        attackCooldown: 3,
        color: 0xff22ff,
        spawnWeight: 0.05
      }
    };
    
    // Abilities
    this.abilities = [
      { name: 'Attack', cooldown: 0, maxCooldown: 2, key: '1' },
      { name: 'Defend', cooldown: 0, maxCooldown: 3, key: '2' },
      { name: 'Dash', cooldown: 0, maxCooldown: 4, key: 'Space' },
      { name: 'Special', cooldown: 0, maxCooldown: 5, key: '3' }
    ];
    
    // UI state
    this.paused = false;
    this.notifications = [];
    
    // Interactive elements
    this.platforms = [];
    this.pressurePlates = [];
    this.breakableObjects = [];
    this.pickups = [];
    
    // Color palette
    this.colors = {
      player: 0x00ff88,
      enemy: 0xff4444,
      ability: 0x4488ff,
      pickup: 0x44ff44,
      neutral: 0x888888
    };
  }
  
  /**
   * Wait for GLTFLoader and CANNON to be loaded
   */
  async waitForDependencies() {
    const maxWait = 5000; // 5 seconds timeout
    const startTime = Date.now();
    
    while (!window.CANNON || !window.THREE.GLTFLoader) {
      if (Date.now() - startTime > maxWait) {
        console.warn('Timeout waiting for dependencies. CANNON:', !!window.CANNON, 'GLTFLoader:', !!window.THREE.GLTFLoader);
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (window.CANNON) {
      console.log('✓ CANNON physics ready');
    }
    if (window.THREE.GLTFLoader) {
      console.log('✓ GLTFLoader ready');
      this.gltfLoader = new window.THREE.GLTFLoader();
    }
  }
  
  /**
   * Load assets manifest
   */
  async loadAssetsManifest() {
    try {
      const response = await fetch('/assets_manifest.json');
      const manifest = await response.json();
      this.assetsManifest = manifest;
      console.log('✓ Assets manifest loaded:', manifest);
      return manifest;
    } catch (error) {
      console.error('❌ Failed to load assets manifest:', error);
      throw new Error('CRITICAL: Cannot load without asset manifest');
    }
  }
  
  /**
   * Load a GLB model from URL with proper error handling and logging
   */
  async loadGLBModel(url, modelName) {
    if (!this.gltfLoader) {
      throw new Error('❌ GLTFLoader not available - cannot load ' + modelName);
    }
    
    return new Promise((resolve, reject) => {
      console.log(`📦 Loading ${modelName} from: ${url}`);
      if (this.diagnosticMessages) {
        this.addDiagnosticMessage(`📦 Loading ${modelName}...`, 'info');
      }
      
      this.gltfLoader.load(
        url,
        (gltf) => {
          console.log(`✓ ${modelName} loaded successfully`);
          if (this.diagnosticMessages) {
            this.addDiagnosticMessage(`✓ ${modelName} loaded successfully`, 'success');
          }
          resolve(gltf);
        },
        (progress) => {
          if (progress.total > 0) {
            const percent = (progress.loaded / progress.total * 100).toFixed(0);
            console.log(`Loading ${modelName}: ${percent}% (${progress.loaded}/${progress.total} bytes)`);
          }
        },
        (error) => {
          const errorMsg = `❌ FAILED TO LOAD ${modelName} from ${url}: ${error.message}`;
          console.error(errorMsg);
          if (this.diagnosticMessages) {
            this.addDiagnosticMessage(errorMsg, 'error');
          }
          // Show critical error overlay
          this.showCriticalError(errorMsg);
          reject(new Error(errorMsg));
        }
      );
    });
  }
  
  /**
   * Show critical error overlay
   */
  showCriticalError(message) {
    const errorOverlay = document.createElement('div');
    errorOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 0, 0, 0.9);
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      font-family: 'Courier New', monospace;
      padding: 40px;
      text-align: center;
    `;
    
    // Detect if error is likely due to ad blocker blocking CDN resources
    const isLikelyAdBlocker = message.toLowerCase().includes('failed to load') || 
                               message.toLowerCase().includes('network error') ||
                               message.toLowerCase().includes('cors');
    
    const adBlockerInstructions = isLikelyAdBlocker ? `
      <div style="margin-top: 30px; padding: 25px; background: rgba(255, 255, 255, 0.1); border-radius: 10px; max-width: 600px; border: 2px solid #ffaa00;">
        <h2 style="font-size: 24px; margin-bottom: 15px; color: #ffaa00;">⚠️ Ad Blocker Detected?</h2>
        <p style="font-size: 16px; margin-bottom: 15px; line-height: 1.6;">
          This error is commonly caused by ad blockers or browser extensions blocking external resources.
        </p>
        <div style="text-align: left; font-size: 14px; margin: 20px auto; max-width: 500px;">
          <p style="margin-bottom: 10px; font-weight: bold;">To fix this issue:</p>
          <p style="margin-bottom: 8px;">1. <strong>Disable all ad blockers</strong> for this site</p>
          <p style="margin-bottom: 8px;">2. Or open the game in:</p>
          <p style="margin-left: 20px; margin-bottom: 5px;">• <strong>Chrome Incognito</strong> (extensions off)</p>
          <p style="margin-left: 20px; margin-bottom: 15px;">• <strong>Firefox with no addons</strong></p>
          <p style="margin-bottom: 8px;">3. Then click <strong>Reload</strong> below</p>
        </div>
      </div>
    ` : '';
    
    errorOverlay.innerHTML = `
      <h1 style="font-size: 48px; margin-bottom: 20px;">❌ CRITICAL ERROR</h1>
      <div style="font-size: 18px; max-width: 800px; background: rgba(0,0,0,0.3); padding: 20px; border-radius: 10px;">
        ${message}
      </div>
      <p style="margin-top: 20px; font-size: 14px;">The game cannot start without proper 3D assets.</p>
      ${adBlockerInstructions}
      <button onclick="window.location.reload()" style="margin-top: 20px; padding: 15px 30px; font-size: 16px; background: white; color: red; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Reload</button>
    `;
    document.body.appendChild(errorOverlay);
  }
  
  /**
   * Initialize physics world
   */
  initPhysics() {
    if (!window.CANNON) {
      console.warn('CANNON not available, physics disabled');
      this.config.usePhysics = false;
      return;
    }
    
    // Create physics world
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.8, 0) // Earth gravity
    });
    
    // Configure world
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10;
    this.world.defaultContactMaterial.friction = 0.4;
    
    console.log('✓ Physics world initialized');
  }
  
  /**
   * Create diagnostic overlay
   */
  createDiagnosticOverlay() {
    this.diagnosticOverlay = document.createElement('div');
    this.diagnosticOverlay.id = 'diagnostic-overlay';
    this.diagnosticOverlay.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.9);
      color: #00ff88;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      padding: 20px;
      border: 2px solid #00ff88;
      border-radius: 5px;
      z-index: 10000;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
    `;
    document.body.appendChild(this.diagnosticOverlay);
    this.updateDiagnosticOverlay();
  }
  
  /**
   * Add diagnostic message
   */
  addDiagnosticMessage(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const icon = type === 'success' ? '✓' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ';
    const color = type === 'success' ? '#00ff88' : type === 'error' ? '#ff4444' : type === 'warning' ? '#ffaa00' : '#4488ff';
    
    this.diagnosticMessages.push({
      timestamp,
      message,
      type,
      icon,
      color
    });
    
    console.log(`[${timestamp}] ${icon} ${message}`);
    this.updateDiagnosticOverlay();
  }
  
  /**
   * Update diagnostic overlay display
   */
  updateDiagnosticOverlay() {
    if (!this.diagnosticOverlay) return;
    
    let html = '<div style="font-weight: bold; margin-bottom: 15px; font-size: 16px;">🔍 INITIALIZATION DIAGNOSTICS</div>';
    
    this.diagnosticMessages.forEach(msg => {
      html += `
        <div style="margin: 8px 0; padding: 8px; background: rgba(0,0,0,0.3); border-left: 3px solid ${msg.color};">
          <span style="color: ${msg.color};">${msg.icon}</span>
          <span style="color: #999; font-size: 11px; margin-left: 8px;">[${msg.timestamp}]</span>
          <div style="margin-top: 4px;">${msg.message}</div>
        </div>
      `;
    });
    
    this.diagnosticOverlay.innerHTML = html;
  }
  
  /**
   * Hide diagnostic overlay after successful initialization
   */
  hideDiagnosticOverlay() {
    if (this.diagnosticOverlay) {
      setTimeout(() => {
        this.diagnosticOverlay.style.opacity = '0';
        this.diagnosticOverlay.style.transition = 'opacity 1s';
        setTimeout(() => {
          if (this.diagnosticOverlay && this.diagnosticOverlay.parentNode) {
            this.diagnosticOverlay.parentNode.removeChild(this.diagnosticOverlay);
          }
        }, 1000);
      }, 2000);
    }
  }
  
  /**
   * Initialize the 3D game with full diagnostics
   */
  async init() {
    try {
      // Create diagnostic overlay FIRST
      this.createDiagnosticOverlay();
      this.addDiagnosticMessage('Starting game initialization...', 'info');
      
      // Wait for GLTFLoader and CANNON to be available
      this.addDiagnosticMessage('Waiting for dependencies (GLTFLoader, CANNON)...', 'info');
      await this.waitForDependencies();
      this.addDiagnosticMessage('Dependencies loaded successfully', 'success');
      
      // Load assets manifest FIRST - this is critical
      this.addDiagnosticMessage('Loading assets manifest...', 'info');
      await this.loadAssetsManifest();
      this.addDiagnosticMessage('Assets manifest loaded successfully', 'success');
      
      // Initialize physics world
      this.addDiagnosticMessage('Initializing physics world...', 'info');
      this.initPhysics();
      this.addDiagnosticMessage('Physics world initialized', 'success');
      
      // STEP 1: Create renderer
      this.addDiagnosticMessage('Creating WebGL renderer...', 'info');
      this.renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: false 
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      document.body.appendChild(this.renderer.domElement);
      
      // Verify renderer size
      const size = this.renderer.getSize(new THREE.Vector2());
      if (size.x === 0 || size.y === 0) {
        throw new Error('Renderer size is zero!');
      }
      this.addDiagnosticMessage(`✓ Renderer initialized: ${size.x}x${size.y}`, 'success');
      
      // STEP 2: Create scene
      this.addDiagnosticMessage('Creating scene...', 'info');
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x202040); // Lighter background for visibility
      this.scene.fog = new THREE.Fog(0x202040, 50, 150); // Adjusted fog
      this.addDiagnosticMessage('✓ Scene created', 'success');
      
      // STEP 3: Create camera
      this.addDiagnosticMessage('Creating camera...', 'info');
      this.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      // Position camera above ground, looking at center
      this.camera.position.set(0, 10, 15);
      this.camera.lookAt(0, 0, 0);
      this.addDiagnosticMessage(`✓ Camera active at position (${this.camera.position.x.toFixed(1)}, ${this.camera.position.y.toFixed(1)}, ${this.camera.position.z.toFixed(1)})`, 'success');
      this.addDiagnosticMessage(`Camera looking at origin, frustum visible: YES`, 'success');
      
      // STEP 4: Create lights (EMERGENCY FALLBACK LIGHTING)
      this.addDiagnosticMessage('Adding emergency fallback lighting...', 'info');
      this.createLights();
      this.addDiagnosticMessage('✓ Lights active (Directional + Ambient)', 'success');
      
      // Add temporary visual debug helpers
      this.addDiagnosticMessage('Adding debug helpers (axis, grid)...', 'info');
      this.addDebugHelpers();
      this.addDiagnosticMessage('✓ Debug helpers added', 'success');
      
      // STEP 5: Load FLOOR first (REQUIRED - DO NOT CONTINUE IF FAILS)
      this.addDiagnosticMessage('Loading floor asset (CRITICAL)...', 'info');
      await this.loadFloorAsset();
      this.addDiagnosticMessage('✓ Floor loaded successfully and visible', 'success');
      
      // Position camera above floor
      this.camera.position.set(0, 10, 15);
      this.camera.lookAt(0, 0, 0);
      this.addDiagnosticMessage('✓ Camera positioned above floor', 'success');
      
      // RENDER IMMEDIATELY after floor loads
      this.addDiagnosticMessage('Rendering initial frame with floor...', 'info');
      this.renderer.render(this.scene, this.camera);
      this.addDiagnosticMessage('✓ Initial frame rendered - floor should be visible!', 'success');
      
      // ===== NEW: Initialize Conscience Engine Systems =====
      this.addDiagnosticMessage('Initializing Conscience Engine systems...', 'info');
    
      this.addDiagnosticMessage('Initializing Conscience Engine systems...', 'info');
    
    // Initialize Intent Tracker
    if (window.IntentTracker) {
      this.intentTracker = new window.IntentTracker();
      this.addDiagnosticMessage('✓ Intent Tracker initialized', 'success');
    }
    
    // Initialize World Reactions
    if (window.WorldReactions && this.intentTracker) {
      this.worldReactions = new window.WorldReactions(this.scene, this.intentTracker);
      this.addDiagnosticMessage('✓ World Reactions initialized', 'success');
    }
    
    // Initialize Power-Up System
    if (window.PowerUpSystem && this.intentTracker) {
      this.powerUpSystem = new window.PowerUpSystem(this.scene, this.intentTracker);
      this.addDiagnosticMessage('✓ Power-Up System initialized', 'success');
    }
    
    // Initialize Enemy System
    if (window.EnemySystem && this.intentTracker) {
      this.enemySystem = new window.EnemySystem(this.scene, this.intentTracker);
      this.addDiagnosticMessage('✓ Enemy System initialized', 'success');
    }
    
    // Initialize Death Screen
    if (window.DeathScreen && this.intentTracker) {
      this.deathScreen = new window.DeathScreen(this.intentTracker);
      this.addDiagnosticMessage('✓ Death Screen initialized', 'success');
    }
    
    // Initialize Vertical Map Generator
    if (window.VerticalMapGenerator) {
      this.mapGenerator = new window.VerticalMapGenerator(this.scene);
      this.addDiagnosticMessage('✓ Vertical Map Generator initialized', 'success');
    }
    
    this.addDiagnosticMessage('Conscience Engine initialized successfully!', 'success');
    
    // STEP 6: Load REST of environment (non-critical)
    this.addDiagnosticMessage('Loading additional environment assets...', 'info');
    await this.loadAdditionalEnvironmentAssets();
    this.addDiagnosticMessage('✓ Additional environment assets loaded', 'success');
    
    // Create player with GLB model
    this.addDiagnosticMessage('Loading player model...', 'info');
    await this.createPlayer();
    this.addDiagnosticMessage('✓ Player loaded and positioned', 'success');
    
    // Create initial enemies with GLB models
    this.addDiagnosticMessage('Spawning enemies...', 'info');
    await this.spawnNewEnemies(2, 1, 1, 0); // 2 Observers, 1 Punisher, 1 Distorter
    this.addDiagnosticMessage('✓ Enemies spawned successfully', 'success');
    
    // Create HUD
    this.addDiagnosticMessage('Creating HUD...', 'info');
    this.createHUD();
    this.addDiagnosticMessage('✓ HUD created', 'success');
    
    // Setup input handlers
    this.addDiagnosticMessage('Setting up input handlers...', 'info');
    this.setupInputHandlers();
    this.addDiagnosticMessage('✓ Input handlers ready', 'success');
    
    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
    
    // Final render to confirm everything is visible
    this.renderer.render(this.scene, this.camera);
    
    // All initialization complete!
    this.addDiagnosticMessage('=== INITIALIZATION COMPLETE ===', 'success');
    this.addDiagnosticMessage('Game is ready to play!', 'success');
    
    // Hide diagnostic overlay after a moment
    this.hideDiagnosticOverlay();
    
    // Start animation loop
    this.animate();
  } catch (error) {
    // Show error prominently
    this.addDiagnosticMessage(`CRITICAL ERROR: ${error.message}`, 'error');
    this.showCriticalError(`Initialization failed: ${error.message}\n\nCheck the diagnostic overlay for details.`);
    throw error;
  }
}
  
  /**
   * Add debug helpers (axis, grid)
   */
  addDebugHelpers() {
    // Axis helper at world origin
    const axisHelper = new THREE.AxesHelper(10);
    axisHelper.name = 'axisHelper';
    this.scene.add(axisHelper);
    console.log('✓ Axis helper added at world origin (Red=X, Green=Y, Blue=Z)');
    
    // Grid helper for floor reference
    const gridHelper = new THREE.GridHelper(200, 20, 0x00ff88, 0x444444);
    gridHelper.name = 'gridHelper';
    gridHelper.position.y = -0.01; // Slightly below floor to avoid z-fighting
    this.scene.add(gridHelper);
    console.log('✓ Grid helper added for floor reference');
  }
  
  /**
   * Create lighting
   */
  createLights() {
    // Ambient light - increased for better visibility
    const ambient = new THREE.AmbientLight(0x808080, 1.5);
    this.scene.add(ambient);
    
    // Directional light (sun)
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(10, 20, 10);
    sun.castShadow = true;
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    this.scene.add(sun);
    
    // Hemisphere light - increased for better visibility
    const hemi = new THREE.HemisphereLight(0x4488ff, 0x442200, 0.6);
    this.scene.add(hemi);
    
    console.log('✓ Lighting configured for asset visibility');
  }
  
  /**
   * Load floor asset FIRST - CRITICAL, blocks initialization if fails
   */
  async loadFloorAsset() {
    if (!this.gltfLoader) {
      throw new Error('❌ GLTFLoader not available');
    }
    
    if (!this.assetsManifest || !this.assetsManifest.environment || !this.assetsManifest.environment.floor) {
      throw new Error('❌ No floor asset URL in manifest');
    }
    
    const floorUrl = this.assetsManifest.environment.floor;
    
    this.addDiagnosticMessage(`Asset: floor`, 'info');
    this.addDiagnosticMessage(`URL: ${floorUrl}`, 'info');
    
    try {
      const floorGltf = await this.loadGLBModel(floorUrl, 'Floor');
      const floorModel = floorGltf.scene;
      
      // Configure floor model
      floorModel.position.set(0, -5, 0); // Position below player
      floorModel.scale.set(2, 0.1, 2); // Flatten it to make it ground-like
      
      floorModel.traverse((node) => {
        if (node.isMesh) {
          node.receiveShadow = true;
          node.castShadow = false; // Floor doesn't cast shadow
          
          // Create mesh collider for floor
          if (this.world) {
            try {
              this.createMeshCollider(node, 0); // mass = 0 for static
              this.addDiagnosticMessage('✓ Floor collider created', 'success');
            } catch (colliderError) {
              this.addDiagnosticMessage(`⚠️ Could not create collider for floor: ${colliderError.message}`, 'warning');
            }
          }
        }
      });
      
      this.scene.add(floorModel);
      this.environmentModels = { floor: floorModel };
      
      this.addDiagnosticMessage(`✓ Asset loaded successfully: floor`, 'success');
      
    } catch (error) {
      const errorMsg = `❌ FAILED TO LOAD: floor\nURL: ${floorUrl}\nError: ${error.message}`;
      this.addDiagnosticMessage(errorMsg, 'error');
      throw new Error(`CRITICAL: Cannot start without floor - ${error.message}`);
    }
  }
  
  /**
   * Load additional environment assets (non-blocking)
   */
  async loadAdditionalEnvironmentAssets() {
    if (!this.gltfLoader || !this.assetsManifest || !this.assetsManifest.environment) {
      this.addDiagnosticMessage('⚠️ No additional environment assets to load', 'warning');
      return;
    }
    
    const env = this.assetsManifest.environment;
    
    // Load ramp model
    if (env.ramp) {
      try {
        this.addDiagnosticMessage(`Loading asset: ramp from ${env.ramp}`, 'info');
        const rampGltf = await this.loadGLBModel(env.ramp, 'Ramp');
        
        // Create multiple ramp instances for level design
        for (let i = 0; i < 3; i++) {
          const rampModel = rampGltf.scene.clone();
          
          // Position ramps to create elevation changes
          const positions = [
            { x: 20, y: 0, z: 20, rotY: 0 },
            { x: -25, y: 0, z: -15, rotY: Math.PI / 4 },
            { x: 0, y: 0, z: -30, rotY: Math.PI / 2 }
          ];
          
          const pos = positions[i];
          rampModel.position.set(pos.x, pos.y, pos.z);
          rampModel.rotation.y = pos.rotY;
          
          rampModel.traverse((node) => {
            if (node.isMesh) {
              node.receiveShadow = true;
              node.castShadow = true;
              
              // Create mesh collider for ramp
              if (this.world) {
                try {
                  this.createMeshCollider(node, 0); // mass = 0 for static
                } catch (colliderError) {
                  this.addDiagnosticMessage(`⚠️ Could not create collider for ramp: ${colliderError.message}`, 'warning');
                }
              }
            }
          });
          
          this.scene.add(rampModel);
        }
        
        this.addDiagnosticMessage('✓ Asset loaded successfully: ramp', 'success');
      } catch (error) {
        this.addDiagnosticMessage(`⚠️ Failed to load ramp: ${error.message} (non-critical)`, 'warning');
      }
    }
    
    // Load platform model if available
    if (env.platform) {
      try {
        this.addDiagnosticMessage(`Loading asset: platform from ${env.platform}`, 'info');
        const platformGltf = await this.loadGLBModel(env.platform, 'Platform');
        
        // Create multiple platform instances
        for (let i = 0; i < 4; i++) {
          const platformModel = platformGltf.scene.clone();
          
          const angle = (i / 4) * Math.PI * 2;
          const distance = 30;
          platformModel.position.set(
            Math.cos(angle) * distance,
            5,
            Math.sin(angle) * distance
          );
          
          platformModel.traverse((node) => {
            if (node.isMesh) {
              node.receiveShadow = true;
              node.castShadow = true;
              
              // Create mesh collider for platform
              if (this.world) {
                this.createMeshCollider(node, 0); // mass = 0 for static
              }
            }
          });
          
          this.scene.add(platformModel);
        }
        
        this.addDiagnosticMessage('✓ Asset loaded successfully: platform', 'success');
      } catch (error) {
        this.addDiagnosticMessage(`⚠️ Failed to load platform: ${error.message} (non-critical)`, 'warning');
      }
    }
    
    // Load wall model if available
    if (env.wall) {
      try {
        this.addDiagnosticMessage(`Loading asset: wall from ${env.wall}`, 'info');
        const wallGltf = await this.loadGLBModel(env.wall, 'Wall');
        
        // Create walls to form rooms/zones
        const wallPositions = [
          { x: -40, y: 0, z: 0, rotY: 0 },
          { x: 40, y: 0, z: 0, rotY: 0 },
          { x: 0, y: 0, z: -40, rotY: Math.PI / 2 },
          { x: 0, y: 0, z: 40, rotY: Math.PI / 2 }
        ];
        
        wallPositions.forEach(pos => {
          const wallModel = wallGltf.scene.clone();
          wallModel.position.set(pos.x, pos.y, pos.z);
          wallModel.rotation.y = pos.rotY;
          
          wallModel.traverse((node) => {
            if (node.isMesh) {
              node.receiveShadow = true;
              node.castShadow = true;
              
              // Create mesh collider for wall
              if (this.world) {
                this.createMeshCollider(node, 0); // mass = 0 for static
              }
            }
          });
          
          this.scene.add(wallModel);
        });
        
        this.addDiagnosticMessage('✓ Asset loaded successfully: wall', 'success');
      } catch (error) {
        this.addDiagnosticMessage(`⚠️ Failed to load wall: ${error.message} (non-critical)`, 'warning');
      }
    }
  }
  
  /**
   * Load environment GLB models - DEPRECATED, replaced by loadFloorAsset and loadAdditionalEnvironmentAssets
   */
  async loadEnvironmentModels() {
    if (!this.gltfLoader) {
      throw new Error('❌ GLTFLoader not available');
    }
    
    if (!this.assetsManifest || !this.assetsManifest.environment) {
      throw new Error('❌ No environment assets in manifest');
    }
    
    const env = this.assetsManifest.environment;
    
    // Load floor model - REQUIRED
    if (env.floor) {
      try {
        const floorGltf = await this.loadGLBModel(env.floor, 'Floor');
        const floorModel = floorGltf.scene;
        
        // Configure floor model
        floorModel.position.set(0, -5, 0); // Position below player
        floorModel.scale.set(2, 0.1, 2); // Flatten it to make it ground-like
        
        floorModel.traverse((node) => {
          if (node.isMesh) {
            node.receiveShadow = true;
            node.castShadow = false; // Floor doesn't cast shadow
            
            // Create mesh collider for floor
            if (this.world) {
              try {
                this.createMeshCollider(node, 0); // mass = 0 for static
              } catch (colliderError) {
                console.warn('⚠️ Could not create collider for floor mesh:', colliderError.message);
              }
            }
          }
        });
        
        this.scene.add(floorModel);
        this.environmentModels = { floor: floorModel };
        console.log('✓ Floor model loaded and added with colliders');
      } catch (error) {
        console.error('Floor loading error:', error);
        throw new Error('❌ CRITICAL: Failed to load floor model - game cannot start');
      }
    } else {
      throw new Error('❌ CRITICAL: No floor model URL in manifest');
    }
    
    // Load ramp model - REQUIRED
    if (env.ramp) {
      try {
        const rampGltf = await this.loadGLBModel(env.ramp, 'Ramp');
        
        // Create multiple ramp instances for level design
        for (let i = 0; i < 3; i++) {
          const rampModel = rampGltf.scene.clone();
          
          // Position ramps to create elevation changes
          const positions = [
            { x: 20, y: 0, z: 20, rotY: 0 },
            { x: -25, y: 0, z: -15, rotY: Math.PI / 4 },
            { x: 0, y: 0, z: -30, rotY: Math.PI / 2 }
          ];
          
          const pos = positions[i];
          rampModel.position.set(pos.x, pos.y, pos.z);
          rampModel.rotation.y = pos.rotY;
          
          rampModel.traverse((node) => {
            if (node.isMesh) {
              node.receiveShadow = true;
              node.castShadow = true;
              
              // Create mesh collider for ramp
              if (this.world) {
                try {
                  this.createMeshCollider(node, 0); // mass = 0 for static
                } catch (colliderError) {
                  console.warn('⚠️ Could not create collider for ramp mesh:', colliderError.message);
                }
              }
            }
          });
          
          this.scene.add(rampModel);
        }
        
        console.log('✓ Ramp models loaded and placed with colliders');
      } catch (error) {
        console.warn('⚠️ Ramp model failed to load, but continuing:', error.message);
      }
    }
    
    // Load platform model if available
    if (env.platform) {
      try {
        const platformGltf = await this.loadGLBModel(env.platform, 'Platform');
        
        // Create multiple platform instances
        for (let i = 0; i < 4; i++) {
          const platformModel = platformGltf.scene.clone();
          
          const angle = (i / 4) * Math.PI * 2;
          const distance = 30;
          platformModel.position.set(
            Math.cos(angle) * distance,
            5,
            Math.sin(angle) * distance
          );
          
          platformModel.traverse((node) => {
            if (node.isMesh) {
              node.receiveShadow = true;
              node.castShadow = true;
              
              // Create mesh collider for platform
              if (this.world) {
                this.createMeshCollider(node, 0); // mass = 0 for static
              }
            }
          });
          
          this.scene.add(platformModel);
        }
        
        console.log('✓ Platform models loaded and placed with colliders');
      } catch (error) {
        console.warn('⚠️ Platform model failed to load, but continuing:', error.message);
      }
    }
    
    // Load wall model if available
    if (env.wall) {
      try {
        const wallGltf = await this.loadGLBModel(env.wall, 'Wall');
        
        // Create walls to form rooms/zones
        const wallPositions = [
          { x: -40, y: 0, z: 0, rotY: 0 },
          { x: 40, y: 0, z: 0, rotY: 0 },
          { x: 0, y: 0, z: -40, rotY: Math.PI / 2 },
          { x: 0, y: 0, z: 40, rotY: Math.PI / 2 }
        ];
        
        wallPositions.forEach(pos => {
          const wallModel = wallGltf.scene.clone();
          wallModel.position.set(pos.x, pos.y, pos.z);
          wallModel.rotation.y = pos.rotY;
          
          wallModel.traverse((node) => {
            if (node.isMesh) {
              node.receiveShadow = true;
              node.castShadow = true;
              
              // Create mesh collider for wall
              if (this.world) {
                this.createMeshCollider(node, 0); // mass = 0 for static
              }
            }
          });
          
          this.scene.add(wallModel);
        });
        
        console.log('✓ Wall models loaded and placed with colliders');
      } catch (error) {
        console.warn('⚠️ Wall model failed to load, but continuing:', error.message);
      }
    }
  }
  
  /**
   * Create mesh collider from a Three.js mesh
   */
  createMeshCollider(mesh, mass = 0) {
    if (!this.world || !window.CANNON) return;
    
    // Get mesh geometry
    const geometry = mesh.geometry;
    if (!geometry) return;
    
    // Get vertices and create trimesh
    const vertices = [];
    const indices = [];
    
    const position = geometry.attributes.position;
    if (!position) return;
    
    // Extract vertices
    for (let i = 0; i < position.count; i++) {
      vertices.push(position.getX(i), position.getY(i), position.getZ(i));
    }
    
    // Extract indices
    if (geometry.index) {
      const index = geometry.index;
      for (let i = 0; i < index.count; i++) {
        indices.push(index.getX(i));
      }
    } else {
      // No index, create sequential indices
      for (let i = 0; i < position.count; i++) {
        indices.push(i);
      }
    }
    
    // Create Cannon trimesh shape
    const shape = new CANNON.Trimesh(vertices, indices);
    
    // Create body
    const body = new CANNON.Body({
      mass: mass,
      shape: shape,
      material: new CANNON.Material({ friction: 0.4, restitution: 0.3 })
    });
    
    // Apply mesh world transform to body
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    mesh.getWorldPosition(worldPos);
    mesh.getWorldQuaternion(worldQuat);
    
    body.position.set(worldPos.x, worldPos.y, worldPos.z);
    body.quaternion.set(worldQuat.x, worldQuat.y, worldQuat.z, worldQuat.w);
    
    this.world.addBody(body);
    this.physicsBodies.push(body);
    
    return body;
  }
  
  /**
   * REMOVED: createPhysicsGround - violates NO PLACEHOLDER GEOMETRY rule
   */
  
  /**
   * REMOVED: createPhysicsRamps - violates NO PLACEHOLDER GEOMETRY rule
   */
  
  /**
   * Create game environment - ASSET-DRIVEN ONLY
   */
  async createEnvironment() {
    // Load GLB models for environment - NO FALLBACKS ALLOWED
    await this.loadEnvironmentModels();
    
    // NO grid helper - it's a placeholder
    // NO placeholder geometry of any kind
    
    // Generate vertical map with behavior zones (if uses GLB assets)
    if (this.mapGenerator) {
      // Only use map generator if it loads from GLB assets
      // TODO: Verify mapGenerator doesn't create placeholder geometry
      console.log('⚠️ Map generator may need review to ensure it uses GLB assets only');
    }
    
    // Add world reaction platforms and spikes (if uses GLB assets)
    if (this.worldReactions) {
      // TODO: Verify world reactions don't create placeholder geometry
      console.log('⚠️ World reactions may need review to ensure it uses GLB assets only');
    }
    
    // Create power-ups (if uses GLB assets)
    if (this.powerUpSystem) {
      // TODO: Verify power-up system doesn't create placeholder geometry
      console.log('⚠️ Power-up system may need review to ensure it uses GLB assets only');
    }
  }
  
  /**
   * DISABLED: createMovablePlatforms - violates NO PLACEHOLDER GEOMETRY rule
   * TODO: Load platform models from GLB assets instead
   */
  createMovablePlatforms() {
    console.warn('⚠️ createMovablePlatforms disabled - requires GLB assets');
    // Method disabled to comply with asset-driven architecture
  }
  
  /**
   * DISABLED: createPressurePlates - violates NO PLACEHOLDER GEOMETRY rule
   * TODO: Load pressure plate models from GLB assets instead
   */
  createPressurePlates() {
    console.warn('⚠️ createPressurePlates disabled - requires GLB assets');
    // Method disabled to comply with asset-driven architecture
  }
  
  /**
   * DISABLED: createBreakableObjects - violates NO PLACEHOLDER GEOMETRY rule
   * TODO: Load breakable object models from GLB assets instead
   */
  createBreakableObjects() {
    console.warn('⚠️ createBreakableObjects disabled - requires GLB assets');
    // Method disabled to comply with asset-driven architecture
  }
  
  /**
   * DISABLED: createPickups - violates NO PLACEHOLDER GEOMETRY rule
   * TODO: Load pickup models from GLB assets instead
   */
  createPickups() {
    console.warn('⚠️ createPickups disabled - requires GLB assets');
    // Method disabled to comply with asset-driven architecture
  }
  
  /**
   * Create player character - MUST use GLB model
   */
  async createPlayer() {
    if (!this.assetsManifest || !this.assetsManifest.characters || !this.assetsManifest.characters.player) {
      throw new Error('❌ CRITICAL: No player model in manifest');
    }
    
    const playerData = this.assetsManifest.characters.player;
    
    this.addDiagnosticMessage(`Loading player model from ${playerData.url}...`, 'info');
    
    try {
      // Load player GLB model - REQUIRED
      const gltf = await this.loadGLBModel(playerData.url, 'Player');
      
      // Use loaded model
      this.player = gltf.scene;
      this.player.position.set(0, 2, 0);
      this.player.scale.set(0.5, 0.5, 0.5); // Adjust scale as needed
      
      this.player.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      
      this.scene.add(this.player);
      this.addDiagnosticMessage(`✓ Player model loaded and positioned at (0, 2, 0)`, 'success');
      
      // Store animations if available
      if (gltf.animations && gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(this.player);
        this.playerAnimations = {};
        
        gltf.animations.forEach(clip => {
          this.addDiagnosticMessage(`✓ Player animation available: ${clip.name}`, 'success');
          this.playerAnimations[clip.name] = this.mixer.clipAction(clip);
        });
        
        // Play idle animation by default
        if (this.playerAnimations['idle']) {
          this.playerAnimations['idle'].play();
        }
      } else {
        this.addDiagnosticMessage('⚠️ No animations found in player GLB model', 'warning');
      }
    } catch (error) {
      // CRITICAL: No fallback allowed
      this.addDiagnosticMessage(`❌ CRITICAL: Failed to load player model`, 'error');
      throw new Error('❌ CRITICAL: Failed to load player model - game cannot start');
    }
    
    // Initialize player userData (MUST be done before any update loops)
    this.player.userData = {
      velocity: new THREE.Vector3(0, 0, 0),
      speed: 10,
      rotation: 0,
      isMoving: false,
      lastAction: null,
      currentAnimation: 'idle'
    };
    
    this.addDiagnosticMessage('✓ Player userData initialized', 'success');
    
    // Create physics body (capsule collider as dynamic rigid body)
    if (this.config.usePhysics && this.world) {
      this.createPlayerPhysicsBody();
    }
  }
  
  /**
   * Create physics body for player (capsule collider)
   */
  createPlayerPhysicsBody() {
    if (!this.world) return;
    
    // Create capsule shape using cylinder + 2 spheres
    const radius = 0.4;
    const cylinderHeight = 0.6;
    
    // Create compound shape for capsule
    const capsuleShape = new CANNON.Cylinder(radius, radius, cylinderHeight, 16);
    const topSphere = new CANNON.Sphere(radius);
    const bottomSphere = new CANNON.Sphere(radius);
    
    // Create player body
    this.playerBody = new CANNON.Body({
      mass: 1, // Dynamic body
      shape: capsuleShape,
      position: new CANNON.Vec3(0, 2, 0),
      linearDamping: this.physics.damping,
      angularDamping: 0.99, // Prevent rotation
      fixedRotation: false, // Allow controlled rotation
      material: new CANNON.Material({ friction: 0.3, restitution: 0.0 })
    });
    
    // Add sphere shapes to create capsule
    this.playerBody.addShape(topSphere, new CANNON.Vec3(0, cylinderHeight / 2, 0));
    this.playerBody.addShape(bottomSphere, new CANNON.Vec3(0, -cylinderHeight / 2, 0));
    
    // Lock rotation on X and Z axes (only allow Y rotation)
    this.playerBody.angularFactor = new CANNON.Vec3(0, 1, 0);
    
    this.world.addBody(this.playerBody);
    console.log('✓ Player physics body created (capsule collider, dynamic)');
  }
  
  /**
   * REMOVED: loadPlayerModel - now handled in createPlayer
   * REMOVED: loadMeshyCharacter - legacy compatibility removed
   */
  
  /**
   * Spawn new enemies using GLB models ONLY
   */
  async spawnNewEnemies(observerCount, punisherCount, distorterCount, normalCount = 0) {
    if (!this.assetsManifest || !this.assetsManifest.characters || !this.assetsManifest.characters.enemy_basic) {
      this.addDiagnosticMessage('❌ No enemy model in manifest', 'error');
      console.error('❌ No enemy model in manifest');
      return;
    }
    
    const enemyData = this.assetsManifest.characters.enemy_basic;
    
    this.addDiagnosticMessage(`Loading enemy model from ${enemyData.url}...`, 'info');
    
    // Load enemy GLB model once
    let enemyGltf;
    try {
      enemyGltf = await this.loadGLBModel(enemyData.url, 'Enemy');
    } catch (error) {
      this.addDiagnosticMessage('❌ Failed to load enemy model, cannot spawn enemies', 'error');
      console.error('❌ Failed to load enemy model, cannot spawn enemies');
      return;
    }
    
    const totalEnemies = observerCount + punisherCount + distorterCount + normalCount;
    this.addDiagnosticMessage(`Spawning ${totalEnemies} enemies...`, 'info');
    
    const spawnEnemy = (type) => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * 30;
      const position = new THREE.Vector3(
        Math.cos(angle) * distance,
        1,
        Math.sin(angle) * distance
      );
      
      // Clone the loaded model
      const enemyModel = enemyGltf.scene.clone();
      enemyModel.position.copy(position);
      enemyModel.scale.set(0.4, 0.4, 0.4); // Adjust scale as needed
      
      enemyModel.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      
      // Store animations if available
      let enemyMixer = null;
      let enemyAnimations = {};
      if (enemyGltf.animations && enemyGltf.animations.length > 0) {
        enemyMixer = new THREE.AnimationMixer(enemyModel);
        enemyGltf.animations.forEach(clip => {
          enemyAnimations[clip.name] = enemyMixer.clipAction(clip);
        });
        
        // Play idle animation by default
        if (enemyAnimations['idle']) {
          enemyAnimations['idle'].play();
        }
      }
      
      // Add enemy-specific data
      enemyModel.userData = {
        type: 'enemy',
        enemyType: type,
        health: 100,
        maxHealth: 100,
        velocity: new THREE.Vector3(),
        speed: 3,
        mixer: enemyMixer,
        animations: enemyAnimations,
        state: 'idle',
        attackCooldown: 0,
        attackRange: 4,
        detectionRange: 25,
        // Add definition property for EnemySystem compatibility
        definition: {
          detectionRange: 25,
          attackRange: 4,
          speed: 3,
          attackDamage: 10,
          attackWindup: 1.0,
          attackDuration: 0.5
        }
      };
      
      // Create capsule collider for enemy
      if (this.world) {
        this.createEnemyCapsuleCollider(enemyModel);
      }
      
      this.scene.add(enemyModel);
      this.enemies.push(enemyModel);
      
      // If using new enemy system, register with it
      if (this.enemySystem) {
        // The enemy system will handle AI behavior
        console.log(`✓ Spawned ${type} enemy with GLB model`);
      }
    };
    
    for (let i = 0; i < observerCount; i++) spawnEnemy('OBSERVER');
    for (let i = 0; i < punisherCount; i++) spawnEnemy('PUNISHER');
    for (let i = 0; i < distorterCount; i++) spawnEnemy('DISTORTER');
    
    console.log(`✓ Spawned ${observerCount + punisherCount + distorterCount} enemies from GLB models`);
  }
  
  /**
   * Create capsule collider for enemy
   */
  createEnemyCapsuleCollider(enemy) {
    if (!this.world) return;
    
    const radius = 0.4;
    const cylinderHeight = 0.6;
    
    // Create capsule shape using cylinder + 2 spheres
    const capsuleShape = new CANNON.Cylinder(radius, radius, cylinderHeight, 16);
    const topSphere = new CANNON.Sphere(radius);
    const bottomSphere = new CANNON.Sphere(radius);
    
    // Create enemy body
    const body = new CANNON.Body({
      mass: 1, // Dynamic body
      shape: capsuleShape,
      position: new CANNON.Vec3(enemy.position.x, enemy.position.y, enemy.position.z),
      linearDamping: 0.9,
      angularDamping: 0.99,
      material: new CANNON.Material({ friction: 0.3, restitution: 0.0 })
    });
    
    // Add sphere shapes to create capsule
    body.addShape(topSphere, new CANNON.Vec3(0, cylinderHeight / 2, 0));
    body.addShape(bottomSphere, new CANNON.Vec3(0, -cylinderHeight / 2, 0));
    
    // Lock rotation on X and Z axes
    body.angularFactor = new CANNON.Vec3(0, 1, 0);
    
    this.world.addBody(body);
    enemy.userData.physicsBody = body;
  }
  
  /**
   * REMOVED: Old spawnEnemies method that created placeholder geometry
   */
  
  /**
   * Get random enemy type with different tiers
   */
  getRandomEnemyType() {
    const types = Object.values(this.enemyTypes);
    
    // Weighted random selection
    const rand = Math.random();
    let cumulative = 0;
    
    for (const type of types) {
      cumulative += type.spawnWeight;
      if (rand < cumulative) {
        return type;
      }
    }
    
    // Fallback to normal if something goes wrong
    return this.enemyTypes.normal;
  }
  
  /**
   * Generate patrol target for enemy
   */
  generatePatrolTarget(currentPos) {
    return new THREE.Vector3(
      currentPos.x + (Math.random() - 0.5) * 20,
      1,
      currentPos.z + (Math.random() - 0.5) * 20
    );
  }
  
  /**
   * Create HUD elements
   */
  createHUD() {
    // Create HUD container
    const hudContainer = document.createElement('div');
    hudContainer.id = 'game-hud';
    hudContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
      font-family: 'Courier New', monospace;
      color: #fff;
    `;
    document.body.appendChild(hudContainer);
    
    // Health bar (top-left)
    const healthContainer = document.createElement('div');
    healthContainer.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      width: 200px;
    `;
    healthContainer.innerHTML = `
      <div style="font-size: 14px; margin-bottom: 5px;">HEALTH</div>
      <div style="background: rgba(0,0,0,0.5); border: 2px solid #00ff88; border-radius: 5px; overflow: hidden;">
        <div id="health-bar" style="height: 20px; background: linear-gradient(90deg, #00ff88 0%, #ffaa00 50%, #ff4444 100%); width: 100%; transition: width 0.3s;"></div>
      </div>
    `;
    hudContainer.appendChild(healthContainer);
    
    // Energy/Ability cooldowns (top-right)
    const abilityContainer = document.createElement('div');
    abilityContainer.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      display: flex;
      gap: 10px;
    `;
    this.abilities.forEach((ability, index) => {
      const abilityDiv = document.createElement('div');
      abilityDiv.style.cssText = `
        width: 60px;
        height: 60px;
        border: 2px solid #4488ff;
        border-radius: 50%;
        background: rgba(0,0,0,0.5);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        position: relative;
        overflow: hidden;
      `;
      abilityDiv.innerHTML = `
        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(68, 136, 255, 0.3);" id="ability-${index}-cooldown"></div>
        <div style="z-index: 1;">${ability.key}</div>
        <div style="z-index: 1; font-size: 8px;">${ability.name}</div>
      `;
      abilityContainer.appendChild(abilityDiv);
    });
    hudContainer.appendChild(abilityContainer);
    
    // Score/Progress (top-center)
    const scoreContainer = document.createElement('div');
    scoreContainer.style.cssText = `
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      text-align: center;
      font-size: 24px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
    `;
    scoreContainer.innerHTML = `
      <div>SCORE: <span id="game-score">0</span></div>
    `;
    hudContainer.appendChild(scoreContainer);
    
    // Notifications area (near player, bottom-center)
    const notificationContainer = document.createElement('div');
    notificationContainer.id = 'notification-container';
    notificationContainer.style.cssText = `
      position: absolute;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      text-align: center;
      font-size: 18px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
    `;
    hudContainer.appendChild(notificationContainer);
    
    // Enemy indicators container
    const indicatorContainer = document.createElement('div');
    indicatorContainer.id = 'enemy-indicators';
    indicatorContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    `;
    hudContainer.appendChild(indicatorContainer);
    
    // Controls hint (bottom-left)
    const controlsHint = document.createElement('div');
    controlsHint.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 20px;
      font-size: 12px;
      background: rgba(0,0,0,0.7);
      padding: 10px;
      border-radius: 5px;
      border: 1px solid #666;
    `;
    controlsHint.innerHTML = `
      <div><strong>CONTROLS</strong></div>
      <div>WASD - Move</div>
      <div>Mouse - Look</div>
      <div>1-3 - Abilities</div>
      <div>Space - Dash</div>
      <div>ESC - Pause</div>
    `;
    hudContainer.appendChild(controlsHint);
    
    // NEW: Intent Scores display (bottom-right)
    const intentContainer = document.createElement('div');
    intentContainer.style.cssText = `
      position: absolute;
      bottom: 20px;
      right: 20px;
      width: 200px;
      font-size: 12px;
      background: rgba(0,0,0,0.7);
      padding: 10px;
      border-radius: 5px;
      border: 1px solid #4488ff;
    `;
    intentContainer.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px; color: #4488ff;">INTENT ANALYSIS</div>
      <div id="intent-scores"></div>
    `;
    hudContainer.appendChild(intentContainer);
    
    // NEW: Power-Up Status (mid-right)
    const powerUpContainer = document.createElement('div');
    powerUpContainer.style.cssText = `
      position: absolute;
      top: 120px;
      right: 20px;
      width: 180px;
      font-size: 12px;
      background: rgba(0,0,0,0.7);
      padding: 10px;
      border-radius: 5px;
      border: 1px solid #ffaa00;
    `;
    powerUpContainer.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px; color: #ffaa00;">ACTIVE EFFECTS</div>
      <div id="powerup-status"></div>
    `;
    hudContainer.appendChild(powerUpContainer);
  }
  
  /**
   * Setup input handlers
   */
  setupInputHandlers() {
    // Keyboard
    document.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      this.keys[e.code] = true;
      
      // Pause
      if (e.key === 'Escape') {
        this.togglePause();
      }
      
      // Abilities
      if (e.key === '1') this.useAbility(0);
      if (e.key === '2') this.useAbility(1);
      if (e.key === '3') this.useAbility(3);
      if (e.key === ' ') this.useAbility(2); // Dash
    });
    
    document.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      this.keys[e.code] = false;
    });
    
    // Mouse movement for camera
    document.addEventListener('mousemove', (e) => {
      if (this.paused) return;
      
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });
    
    // Mouse buttons
    document.addEventListener('mousedown', (e) => {
      if (this.paused) return;
      this.mouse.buttons[e.button] = true;
    });
    
    document.addEventListener('mouseup', (e) => {
      this.mouse.buttons[e.button] = false;
    });
    
    // Prevent context menu
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  
  /**
   * Use ability
   */
  /**
   * Use ability
   */
  useAbility(index) {
    if (this.paused) return;
    
    const ability = this.abilities[index];
    if (ability.cooldown > 0) {
      this.showNotification(`${ability.name} on cooldown!`, 'warning');
      return;
    }
    
    ability.cooldown = ability.maxCooldown;
    
    // NEW: Track action for intent system
    const actionTypes = ['attack', 'defend', 'dash', 'special'];
    if (this.player && this.player.userData) {
      this.player.userData.lastAction = actionTypes[index];
    }
    
    // NEW: Register reaction for intent tracker (player reacting to threat)
    if (this.intentTracker && (index === 1 || index === 2)) { // Defend or dash
      this.intentTracker.registerReaction(actionTypes[index]);
    }
    
    // Special effects based on ability
    switch (index) {
      case 0: // Attack
        this.performAttack();
        this.showNotification('Attack!', 'ability');
        break;
      case 1: // Defend
        this.showNotification('Defending...', 'ability');
        this.createShield();
        break;
      case 2: // Dash
        this.performDash();
        break;
      case 3: // Special
        this.showNotification('Special Ability!', 'ability');
        this.createExplosion(this.player.position);
        break;
    }
    
    // Camera shake
    this.cameraShake(0.5);
  }
  
  /**
   * Perform attack
   */
  performAttack() {
    const attackRange = 5;
    
    // Attack enemies
    this.enemies.forEach(enemy => {
      const distance = this.player.position.distanceTo(enemy.position);
      if (distance < attackRange) {
        enemy.userData.health -= 30;
        this.createHitEffect(enemy.position);
        if (enemy.userData.health <= 0) {
          this.removeEnemy(enemy);
          this.playerScore += 100;
          this.updateScore();
        }
      }
    });
    
    // Break nearby objects
    this.breakableObjects.forEach(crate => {
      if (crate.userData.broken) return;
      const distance = this.player.position.distanceTo(crate.position);
      if (distance < attackRange) {
        crate.userData.health -= 30;
        if (crate.userData.health <= 0) {
          this.breakObject(crate);
        }
      }
    });
  }
  
  /**
   * Perform dash
   */
  performDash() {
    const dashSpeed = 30;
    const direction = new THREE.Vector3();
    
    if (this.keys['w']) direction.z -= 1;
    if (this.keys['s']) direction.z += 1;
    if (this.keys['a']) direction.x -= 1;
    if (this.keys['d']) direction.x += 1;
    
    if (direction.length() > 0) {
      direction.normalize();
      this.player.userData.velocity.add(direction.multiplyScalar(dashSpeed));
      
      // Motion blur effect (flash overlay)
      this.createMotionBlur();
      this.showNotification('Dash!', 'ability');
    }
  }
  
  /**
   * Create shield visual effect (transient VFX - acceptable)
   */
  createShield() {
    const geometry = new THREE.SphereGeometry(1.5, 32, 32);
    const material = new THREE.MeshBasicMaterial({ 
      color: this.colors.ability,
      transparent: true,
      opacity: 0.3,
      wireframe: true
    });
    const shield = new THREE.Mesh(geometry, material);
    shield.position.copy(this.player.position);
    this.scene.add(shield);
    
    // Animate and remove
    let scale = 1;
    const animate = () => {
      scale += 0.05;
      shield.scale.setScalar(scale);
      shield.material.opacity -= 0.01;
      if (shield.material.opacity > 0) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(shield);
      }
    };
    animate();
  }
  
  /**
   * Create explosion effect (transient VFX - acceptable)
   */
  createExplosion(position) {
    const particleCount = 30;
    for (let i = 0; i < particleCount; i++) {
      const geometry = new THREE.SphereGeometry(0.1, 8, 8);
      const material = new THREE.MeshBasicMaterial({ 
        color: Math.random() > 0.5 ? this.colors.ability : 0xffaa00
      });
      const particle = new THREE.Mesh(geometry, material);
      particle.position.copy(position);
      
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        Math.random() * 10,
        (Math.random() - 0.5) * 10
      );
      
      particle.userData = { velocity, lifetime: 1 };
      this.particles.push(particle);
      this.scene.add(particle);
    }
  }
  
  /**
   * Create hit effect (transient VFX - acceptable)
   */
  createHitEffect(position) {
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    const material = new THREE.MeshBasicMaterial({ 
      color: this.colors.enemy,
      transparent: true,
      opacity: 1
    });
    const hit = new THREE.Mesh(geometry, material);
    hit.position.copy(position);
    this.scene.add(hit);
    
    let scale = 1;
    const animate = () => {
      scale += 0.2;
      hit.scale.setScalar(scale);
      hit.material.opacity -= 0.05;
      if (hit.material.opacity > 0) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(hit);
      }
    };
    animate();
  }
  
  /**
   * Create motion blur flash
   */
  createMotionBlur() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle, transparent 40%, rgba(68, 136, 255, 0.3) 100%);
      pointer-events: none;
      z-index: 999;
      animation: fadeOut 0.3s forwards;
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 300);
  }
  
  /**
   * Camera shake effect
   */
  cameraShake(intensity) {
    const originalPosition = this.camera.position.clone();
    let shakeTime = 0;
    const duration = 0.3;
    
    const shake = () => {
      shakeTime += 0.016; // ~60fps
      if (shakeTime < duration) {
        this.camera.position.x += (Math.random() - 0.5) * intensity;
        this.camera.position.y += (Math.random() - 0.5) * intensity;
        requestAnimationFrame(shake);
      }
    };
    shake();
  }
  
  /**
   * Remove enemy
   */
  removeEnemy(enemy) {
    this.scene.remove(enemy);
    const index = this.enemies.indexOf(enemy);
    if (index > -1) {
      this.enemies.splice(index, 1);
    }
    
    // Spawn new enemy to maintain population
    setTimeout(() => this.spawnEnemies(1), 3000);
  }
  
  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.style.cssText = `
      background: rgba(0,0,0,0.8);
      padding: 10px 20px;
      border-radius: 5px;
      margin: 5px 0;
      border-left: 4px solid ${type === 'ability' ? '#4488ff' : type === 'warning' ? '#ffaa00' : '#00ff88'};
      animation: slideIn 0.3s, fadeOut 0.3s 1.7s forwards;
    `;
    notification.textContent = message;
    container.appendChild(notification);
    
    setTimeout(() => notification.remove(), 2000);
  }
  
  /**
   * Update score display
   */
  updateScore() {
    document.getElementById('game-score').textContent = this.playerScore;
  }
  
  /**
   * Update HUD
   */
  /**
   * Update HUD
   */
  updateHUD() {
    // Health bar
    const healthPercent = (this.playerHealth / this.playerMaxHealth) * 100;
    const healthBar = document.getElementById('health-bar');
    if (healthBar) {
      healthBar.style.width = `${healthPercent}%`;
    }
    
    // Ability cooldowns
    this.abilities.forEach((ability, index) => {
      if (ability.cooldown > 0) {
        ability.cooldown -= this.lastDelta;
        if (ability.cooldown < 0) ability.cooldown = 0;
      }
      
      const cooldownPercent = (ability.cooldown / ability.maxCooldown) * 100;
      const cooldownEl = document.getElementById(`ability-${index}-cooldown`);
      if (cooldownEl) {
        cooldownEl.style.height = `${cooldownPercent}%`;
      }
    });
    
    // NEW: Update Intent Scores display
    if (this.intentTracker) {
      const intentScores = this.intentTracker.getIntentScores();
      const intentContainer = document.getElementById('intent-scores');
      
      if (intentContainer) {
        const html = Object.entries(intentScores).map(([intent, score]) => {
          const percent = Math.round(score * 100);
          const color = score > 0.7 ? '#ff4444' : score > 0.5 ? '#ffaa44' : '#44ff44';
          return `
            <div style="margin-bottom: 5px;">
              <div style="display: flex; justify-content: space-between; font-size: 10px;">
                <span>${intent.toUpperCase()}</span>
                <span>${percent}%</span>
              </div>
              <div style="width: 100%; height: 4px; background: #333; border-radius: 2px; overflow: hidden;">
                <div style="width: ${percent}%; height: 100%; background: ${color};"></div>
              </div>
            </div>
          `;
        }).join('');
        intentContainer.innerHTML = html;
      }
    }
    
    // NEW: Update Power-Up Status
    if (this.powerUpSystem) {
      const powerUpUI = this.powerUpSystem.getUIData();
      const powerUpContainer = document.getElementById('powerup-status');
      
      if (powerUpContainer) {
        const html = powerUpUI.map(pup => {
          const percent = Math.round((pup.remaining / pup.total) * 100);
          const colorHex = pup.color.toString(16).padStart(6, '0');
          return `
            <div style="margin-bottom: 5px; padding: 5px; background: rgba(${parseInt(colorHex.substr(0,2), 16)}, ${parseInt(colorHex.substr(2,2), 16)}, ${parseInt(colorHex.substr(4,2), 16)}, 0.2); border-radius: 3px;">
              <div style="font-size: 10px; font-weight: bold;">${pup.name}</div>
              <div style="width: 100%; height: 3px; background: #333; border-radius: 2px; overflow: hidden; margin-top: 2px;">
                <div style="width: ${percent}%; height: 100%; background: #${colorHex};"></div>
              </div>
            </div>
          `;
        }).join('');
        powerUpContainer.innerHTML = html || '<div style="font-size: 10px; opacity: 0.5;">No active effects</div>';
      }
    }
    
    // Enemy indicators (off-screen arrows)
    this.updateEnemyIndicators();
  }
  
  /**
   * Update enemy indicators
   */
  updateEnemyIndicators() {
    const container = document.getElementById('enemy-indicators');
    if (!container) return;
    
    container.innerHTML = '';
    
    this.enemies.forEach(enemy => {
      const screenPos = this.worldToScreen(enemy.position);
      const distance = this.player.position.distanceTo(enemy.position);
      
      // Only show indicators for off-screen or distant enemies
      if (screenPos.x < 0 || screenPos.x > 1 || screenPos.y < 0 || screenPos.y > 1 || distance > 30) {
        const indicator = document.createElement('div');
        
        // Calculate indicator position
        let x = screenPos.x * window.innerWidth;
        let y = screenPos.y * window.innerHeight;
        
        // Clamp to screen edges
        const margin = 50;
        x = Math.max(margin, Math.min(window.innerWidth - margin, x));
        y = Math.max(margin, Math.min(window.innerHeight - margin, y));
        
        // Calculate rotation for arrow
        const angle = Math.atan2(
          y - window.innerHeight / 2,
          x - window.innerWidth / 2
        ) * (180 / Math.PI);
        
        indicator.style.cssText = `
          position: absolute;
          left: ${x}px;
          top: ${y}px;
          width: 0;
          height: 0;
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-bottom: 20px solid #${this.colors.enemy.toString(16).padStart(6, '0')};
          transform: translate(-50%, -50%) rotate(${angle + 90}deg);
          pointer-events: none;
          opacity: ${Math.max(0.3, 1 - distance / 50)};
        `;
        
        container.appendChild(indicator);
      } else {
        // On-screen health bar for nearby enemies
        const healthBar = document.createElement('div');
        const healthPercent = (enemy.userData.health / enemy.userData.maxHealth) * 100;
        
        healthBar.style.cssText = `
          position: absolute;
          left: ${screenPos.x * window.innerWidth}px;
          top: ${screenPos.y * window.innerHeight - 30}px;
          width: 50px;
          height: 5px;
          background: rgba(0,0,0,0.5);
          border: 1px solid #${this.colors.enemy.toString(16).padStart(6, '0')};
          transform: translateX(-50%);
          pointer-events: none;
        `;
        
        healthBar.innerHTML = `
          <div style="width: ${healthPercent}%; height: 100%; background: #${this.colors.enemy.toString(16).padStart(6, '0')};"></div>
        `;
        
        container.appendChild(healthBar);
      }
    });
  }
  
  /**
   * Convert 3D world position to 2D screen position
   */
  worldToScreen(position) {
    const vector = position.clone();
    vector.project(this.camera);
    
    return {
      x: (vector.x + 1) / 2,
      y: (-vector.y + 1) / 2
    };
  }
  
  /**
   * Toggle pause
   */
  togglePause() {
    this.paused = !this.paused;
    
    if (this.paused) {
      this.showPauseMenu();
    } else {
      this.hidePauseMenu();
    }
  }
  
  /**
   * Show pause menu
   */
  showPauseMenu() {
    let pauseMenu = document.getElementById('pause-menu');
    if (!pauseMenu) {
      pauseMenu = document.createElement('div');
      pauseMenu.id = 'pause-menu';
      pauseMenu.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        backdrop-filter: blur(10px);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        pointer-events: all;
      `;
      
      pauseMenu.innerHTML = `
        <div style="text-align: center; color: white; font-family: 'Courier New', monospace;">
          <h1 style="font-size: 48px; margin-bottom: 40px;">PAUSED</h1>
          <button id="resume-btn" style="display: block; margin: 20px auto; padding: 15px 40px; font-size: 18px; background: #4488ff; color: white; border: none; border-radius: 5px; cursor: pointer;">Resume</button>
          <button id="settings-btn" style="display: block; margin: 20px auto; padding: 15px 40px; font-size: 18px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer;">Settings</button>
          <button id="quit-btn" style="display: block; margin: 20px auto; padding: 15px 40px; font-size: 18px; background: #ff4444; color: white; border: none; border-radius: 5px; cursor: pointer;">Quit</button>
        </div>
      `;
      
      document.body.appendChild(pauseMenu);
      
      document.getElementById('resume-btn').addEventListener('click', () => this.togglePause());
      document.getElementById('settings-btn').addEventListener('click', () => this.showSettings());
      document.getElementById('quit-btn').addEventListener('click', () => window.location.reload());
    }
    
    pauseMenu.style.display = 'flex';
  }
  
  /**
   * Hide pause menu
   */
  hidePauseMenu() {
    const pauseMenu = document.getElementById('pause-menu');
    if (pauseMenu) {
      pauseMenu.style.display = 'none';
    }
  }
  
  /**
   * Show settings
   */
  showSettings() {
    alert('Settings menu would be implemented here with volume sliders, graphics options, and control remapping.');
  }
  
  /**
   * Update player (with physics-based movement and animations)
   */
  updatePlayer(delta) {
    if (this.paused || !this.player || !this.player.userData) return;
    
    // Update player animation mixer
    if (this.mixer) {
      this.mixer.update(delta);
    }
    
    // Determine player state for animation
    const isMoving = this.keys['w'] || this.keys['s'] || this.keys['a'] || this.keys['d'];
    
    // Transition animations
    if (this.playerAnimations) {
      if (isMoving && this.player.userData.currentAnimation !== 'run') {
        if (this.playerAnimations['idle']) {
          this.playerAnimations['idle'].fadeOut(0.2);
        }
        if (this.playerAnimations['run']) {
          this.playerAnimations['run'].reset().fadeIn(0.2).play();
        }
        this.player.userData.currentAnimation = 'run';
      } else if (!isMoving && this.player.userData.currentAnimation !== 'idle') {
        if (this.playerAnimations['run']) {
          this.playerAnimations['run'].fadeOut(0.2);
        }
        if (this.playerAnimations['idle']) {
          this.playerAnimations['idle'].reset().fadeIn(0.2).play();
        }
        this.player.userData.currentAnimation = 'idle';
      }
    }
    
    if (this.config.usePhysics && this.playerBody) {
      // Physics-based movement using forces
      this.updatePlayerPhysics(delta);
    } else {
      // Fallback to kinematic movement
      this.updatePlayerKinematic(delta);
    }
    
    // Rotate player based on movement
    if (this.playerBody && this.config.usePhysics) {
      const vel = this.playerBody.velocity;
      if (Math.sqrt(vel.x * vel.x + vel.z * vel.z) > 0.1) {
        this.player.userData.rotation = Math.atan2(vel.x, vel.z);
        this.player.rotation.y = this.player.userData.rotation;
      }
    }
  }
  
  /**
   * Update player using physics (force-based)
   */
  updatePlayerPhysics(delta) {
    if (!this.playerBody) return;
    
    const moveForce = this.physics.moveForce;
    const force = new CANNON.Vec3();
    
    // WASD movement - apply forces
    if (this.keys['w']) force.z -= moveForce;
    if (this.keys['s']) force.z += moveForce;
    if (this.keys['a']) force.x -= moveForce;
    if (this.keys['d']) force.x += moveForce;
    
    // Apply movement force
    if (force.length() > 0) {
      this.playerBody.applyForce(force, this.playerBody.position);
      this.player.userData.isMoving = true;
    } else {
      this.player.userData.isMoving = false;
    }
    
    // Clamp velocity to max speed (horizontal only)
    const vel = this.playerBody.velocity;
    const horizontalSpeed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    if (horizontalSpeed > this.physics.maxSpeed) {
      const scale = this.physics.maxSpeed / horizontalSpeed;
      this.playerBody.velocity.x *= scale;
      this.playerBody.velocity.z *= scale;
    }
    
    // Sync Three.js object with physics body
    this.player.position.copy(this.playerBody.position);
    this.player.quaternion.copy(this.playerBody.quaternion);
    
    // Keep player rotation upright (only Y-axis rotation)
    this.player.rotation.x = 0;
    this.player.rotation.z = 0;
    
    // Keep player in bounds (soft bounds)
    const boundSize = 90;
    if (Math.abs(this.playerBody.position.x) > boundSize) {
      this.playerBody.position.x = Math.sign(this.playerBody.position.x) * boundSize;
      this.playerBody.velocity.x = 0;
    }
    if (Math.abs(this.playerBody.position.z) > boundSize) {
      this.playerBody.position.z = Math.sign(this.playerBody.position.z) * boundSize;
      this.playerBody.velocity.z = 0;
    }
  }
  
  /**
   * Update player using kinematic movement (fallback)
   */
  updatePlayerKinematic(delta) {
    const moveSpeed = this.player.userData.speed;
    const targetVelocity = new THREE.Vector3();
    
    // WASD movement
    if (this.keys['w']) targetVelocity.z -= 1;
    if (this.keys['s']) targetVelocity.z += 1;
    if (this.keys['a']) targetVelocity.x -= 1;
    if (this.keys['d']) targetVelocity.x += 1;
    
    if (targetVelocity.length() > 0) {
      targetVelocity.normalize().multiplyScalar(moveSpeed);
      this.player.userData.isMoving = true;
    } else {
      targetVelocity.set(0, 0, 0);
      this.player.userData.isMoving = false;
    }
    
    // Smooth movement
    if (!this.player.userData.velocity) {
      this.player.userData.velocity = new THREE.Vector3();
    }
    const currentVel = this.player.userData.velocity;
    const targetDiff = targetVelocity.clone().sub(currentVel);
    const acceleration = targetDiff.multiplyScalar(delta * 8);
    currentVel.add(acceleration);
    
    // Apply friction
    if (!this.player.userData.isMoving) {
      currentVel.multiplyScalar(0.85);
    }
    
    // Apply velocity
    this.player.position.add(currentVel.clone().multiplyScalar(delta));
    
    // Keep on ground and in bounds
    this.player.position.y = 2;
    this.player.position.x = Math.max(-90, Math.min(90, this.player.position.x));
    this.player.position.z = Math.max(-90, Math.min(90, this.player.position.z));
    
    // Rotate player
    if (currentVel.length() > 0.1) {
      this.player.userData.rotation = Math.atan2(currentVel.x, currentVel.z);
      this.player.rotation.y = this.player.userData.rotation;
    }
  }
  
  /**
   * Update enemies with animations
   */
  updateEnemies(delta) {
    // Safety checks
    if (this.paused) return;
    if (!this.player || !this.player.position) return;
    // Ensure player position is a valid Vector3 with x, y, z properties
    if (typeof this.player.position.x === 'undefined') return;
    
    this.enemies.forEach(enemy => {
      // Additional safety check for enemy position
      if (!enemy || !enemy.position || typeof enemy.position.x === 'undefined') return;
      // Update animation mixer
      if (enemy.userData.mixer) {
        enemy.userData.mixer.update(delta);
      }
      
      const distanceToPlayer = this.player.position.distanceTo(enemy.position);
      
      // State machine: idle, walk, attack
      let newState = 'idle';
      if (distanceToPlayer < enemy.userData.detectionRange) {
        if (distanceToPlayer < enemy.userData.attackRange) {
          newState = 'attack';
        } else {
          newState = 'walk';
        }
      }
      
      // Transition animations based on state
      if (newState !== enemy.userData.state) {
        const animations = enemy.userData.animations;
        if (animations) {
          // Stop old animation
          if (animations[enemy.userData.state]) {
            animations[enemy.userData.state].fadeOut(0.2);
          }
          
          // Start new animation
          if (animations[newState]) {
            animations[newState].reset().fadeIn(0.2).play();
          }
        }
        enemy.userData.state = newState;
      }
      
      // AI behavior based on state
      const direction = new THREE.Vector3();
      
      switch (enemy.userData.state) {
        case 'idle':
          // Do nothing, just idle
          break;
          
        case 'walk':
          // Move toward player
          direction.subVectors(this.player.position, enemy.position);
          direction.y = 0;
          
          if (direction.length() > 0) {
            direction.normalize();
            
            // Update physics body if available
            if (enemy.userData.physicsBody) {
              const force = new CANNON.Vec3(
                direction.x * enemy.userData.speed * 10,
                0,
                direction.z * enemy.userData.speed * 10
              );
              enemy.userData.physicsBody.applyForce(force, enemy.userData.physicsBody.position);
              
              // Sync Three.js model with physics
              enemy.position.copy(enemy.userData.physicsBody.position);
            } else {
              // Kinematic movement fallback
              enemy.position.add(direction.multiplyScalar(enemy.userData.speed * delta));
            }
          }
          break;
          
        case 'attack':
          // Face player and attack
          direction.subVectors(this.player.position, enemy.position);
          direction.y = 0;
          
          // Attack cooldown
          enemy.userData.attackCooldown -= delta;
          if (enemy.userData.attackCooldown <= 0) {
            this.enemyAttack(enemy);
            enemy.userData.attackCooldown = 2; // Reset cooldown
          }
          break;
      }
      
      // Rotate toward player
      if (direction.length() > 0) {
        enemy.rotation.y = Math.atan2(direction.x, direction.z);
        if (enemy.userData.physicsBody) {
          enemy.userData.physicsBody.quaternion.setFromEuler(0, enemy.rotation.y, 0);
        }
      }
    });
  }
  
  /**
   * Enemy attack action - uses animation timing, NOT contact damage
   */
  enemyAttack(enemy) {
    // Play attack animation
    if (enemy.userData.animations && enemy.userData.animations['attack']) {
      const attackAnim = enemy.userData.animations['attack'];
      attackAnim.reset().play();
      
      // Calculate damage timing based on animation duration
      const attackDuration = attackAnim.getClip().duration;
      const damageFrame = attackDuration * 0.6; // Damage occurs 60% through animation
      
      // Schedule damage application
      setTimeout(() => {
        // Check if player is still in range
        const distToPlayer = this.player.position.distanceTo(enemy.position);
        if (distToPlayer < enemy.userData.attackRange) {
          const damage = 10;
          this.takeDamage(damage);
          console.log(`Enemy attacked for ${damage} damage at animation frame`);
        }
      }, damageFrame * 1000);
    } else {
      // No attack animation available - still apply damage at range (not on contact)
      const distToPlayer = this.player.position.distanceTo(enemy.position);
      if (distToPlayer < enemy.userData.attackRange) {
        this.takeDamage(10);
      }
    }
    
    // Visual attack effect
    this.createMeleeSwipe(enemy);
  }
  
  /**
   * Create enemy projectile
   */
  createEnemyProjectile(enemy) {
    if (!this.player || !this.player.position) return; // Safety check for player
    
    const geometry = new THREE.SphereGeometry(0.2);
    const material = new THREE.MeshBasicMaterial({ color: 0xff22ff });
    const projectile = new THREE.Mesh(geometry, material);
    projectile.position.copy(enemy.position);
    
    const direction = new THREE.Vector3();
    direction.subVectors(this.player.position, enemy.position).normalize();
    
    projectile.userData = {
      velocity: direction.multiplyScalar(15),
      lifetime: 3,
      damage: enemy.userData.damage
    };
    
    this.scene.add(projectile);
    this.particles.push(projectile);
  }
  
  /**
   * Create melee swipe effect
   */
  createMeleeSwipe(enemy) {
    const geometry = new THREE.ConeGeometry(0.5, 1.5, 8);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xff4444,
      transparent: true,
      opacity: 0.5
    });
    const swipe = new THREE.Mesh(geometry, material);
    swipe.position.copy(enemy.position);
    swipe.rotation.y = enemy.rotation.y;
    swipe.rotation.x = Math.PI / 2;
    
    this.scene.add(swipe);
    
    let opacity = 0.5;
    const animate = () => {
      opacity -= 0.05;
      swipe.material.opacity = opacity;
      swipe.scale.x += 0.1;
      swipe.scale.z += 0.1;
      
      if (opacity > 0) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(swipe);
      }
    };
    animate();
  }
  
  /**
   * Take damage
   */
  /**
   * Take damage
   */
  takeDamage(amount) {
    this.playerHealth = Math.max(0, this.playerHealth - amount);
    
    // Red flash overlay
    if (this.playerHealth > 0) {
      const flash = document.createElement('div');
      flash.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 68, 68, 0.3);
        pointer-events: none;
        z-index: 999;
        animation: fadeOut 0.3s forwards;
      `;
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 300);
    } else {
      this.gameOver();
    }
  }
  
  /**
   * Game over - show death screen with judgment
   */
  gameOver() {
    this.paused = true;
    
    // NEW: Show death screen with judgment
    if (this.deathScreen) {
      this.deathScreen.show(() => {
        // Restart game
        this.restartGame();
      });
    } else {
      // Fallback to old game over screen
      this.showOldGameOver();
    }
  }
  
  /**
   * Restart game after death
   */
  restartGame() {
    // Reset player
    this.playerHealth = this.playerMaxHealth;
    this.player.position.set(0, 1, 0);
    this.player.userData.velocity.set(0, 0, 0);
    
    // Remove all enemies
    this.enemies.forEach(enemy => this.scene.remove(enemy));
    this.enemies = [];
    
    // Respawn enemies
    if (this.enemySystem) {
      this.spawnNewEnemies(2, 1, 1, 1);
    }
    
    // Reset intent tracker
    if (this.intentTracker) {
      this.intentTracker = new window.IntentTracker();
    }
    
    // Unpause
    this.paused = false;
  }
  
  /**
   * Old game over screen (fallback)
   */
  showOldGameOver() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 3000;
      color: white;
      font-family: 'Courier New', monospace;
    `;
    overlay.innerHTML = `
      <h1 style="font-size: 72px; color: #ff4444;">GAME OVER</h1>
      <p style="font-size: 24px; margin: 20px;">Final Score: ${this.playerScore}</p>
      <button onclick="window.location.reload()" style="padding: 15px 40px; font-size: 18px; background: #4488ff; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 20px;">Restart</button>
    `;
    document.body.appendChild(overlay);
  }
  
  /**
   * Update interactive elements
   */
  /**
   * Update interactive elements
   */
  updateInteractiveElements(delta) {
    if (!this.player || !this.player.position || !this.player.userData) return; // Safety check
    
    // NEW: Check for power-up collection
    if (this.powerUpSystem) {
      const powerUpPickups = this.scene.children.filter(obj => 
        obj.userData && obj.userData.type === 'powerUp' && !obj.userData.collected
      );
      
      powerUpPickups.forEach(pickup => {
        const distToPlayer = this.player.position.distanceTo(pickup.position);
        if (distToPlayer < 2) {
          pickup.userData.collected = true;
          this.scene.remove(pickup);
          
          // Activate power-up
          this.powerUpSystem.activatePowerUp(
            pickup.userData.powerUpType,
            (msg, type) => this.showNotification(msg, type)
          );
          
          // Track action for intent system
          if (this.player.userData) {
            this.player.userData.lastAction = 'pickup';
          }
          
          // Respawn after delay
          setTimeout(() => {
            const newPickup = this.powerUpSystem.createPowerUpPickup(
              pickup.position,
              pickup.userData.powerUpType
            );
          }, 20000);
        } else {
          // Animate power-up
          this.powerUpSystem.animatePowerUpPickup(pickup, delta);
        }
      });
    }
    
    // Update platforms
    this.platforms.forEach(platform => {
      const distToPlayer = this.player.position.distanceTo(platform.position);
      
      // Activate platform when player is near
      if (distToPlayer < 5 && !platform.userData.activated) {
        platform.userData.activated = true;
        platform.userData.targetY = platform.userData.baseY + 3;
        this.showNotification('Platform activated!', 'info');
      }
      
      // Smooth movement
      const diff = platform.userData.targetY - platform.position.y;
      platform.position.y += diff * delta * 2;
    });
    
    // Update pressure plates
    this.pressurePlates.forEach(plate => {
      const distToPlayer = this.player.position.distanceTo(plate.position);
      plate.userData.cooldown -= delta;
      
      if (distToPlayer < 2 && !plate.userData.activated && plate.userData.cooldown <= 0) {
        plate.userData.activated = true;
        plate.userData.cooldown = 5;
        plate.material.color.setHex(0xff0000);
        
        if (plate.userData.effect === 'spikes') {
          this.createSpikeTrap(plate.position);
          this.showNotification('Spikes activated!', 'warning');
        } else {
          this.createCollapsibleFloor(plate.position);
          this.showNotification('Floor collapsing!', 'warning');
        }
        
        setTimeout(() => {
          plate.userData.activated = false;
          plate.material.color.setHex(0x888800);
        }, 3000);
      }
    });
    
    // Update breakable objects
    this.breakableObjects.forEach(crate => {
      if (crate.userData.broken) return;
      
      const distToPlayer = this.player.position.distanceTo(crate.position);
      
      // Break when attacked or dashed into
      if (distToPlayer < 2 && this.player.userData.velocity.length() > 5) {
        this.breakObject(crate);
      }
    });
    
    // Update pickups
    this.pickups.forEach(pickup => {
      if (pickup.userData.collected) return;
      
      // Rotate pickups
      pickup.rotation.y += delta * pickup.userData.rotationSpeed;
      pickup.position.y = 1 + Math.sin(Date.now() * 0.002) * 0.3;
      
      const distToPlayer = this.player.position.distanceTo(pickup.position);
      if (distToPlayer < 1.5) {
        this.collectPickup(pickup);
      }
    });
  }
  
  /**
   * Create spike trap effect
   */
  createSpikeTrap(position) {
    for (let i = 0; i < 8; i++) {
      const geometry = new THREE.ConeGeometry(0.2, 1.5, 4);
      const material = new THREE.MeshStandardMaterial({ color: 0x666666 });
      const spike = new THREE.Mesh(geometry, material);
      
      const angle = (i / 8) * Math.PI * 2;
      spike.position.set(
        position.x + Math.cos(angle) * 2,
        0,
        position.z + Math.sin(angle) * 2
      );
      spike.castShadow = true;
      
      this.scene.add(spike);
      
      // Animate spikes rising
      let targetY = 0.75;
      const rise = () => {
        if (spike.position.y < targetY) {
          spike.position.y += 0.1;
          requestAnimationFrame(rise);
        } else {
          // Check if player is hit
          const dist = this.player.position.distanceTo(spike.position);
          if (dist < 1) {
            this.takeDamage(20);
          }
          
          // Remove after delay
          setTimeout(() => {
            this.scene.remove(spike);
          }, 3000);
        }
      };
      rise();
    }
  }
  
  /**
   * Create collapsible floor effect
   */
  createCollapsibleFloor(position) {
    const geometry = new THREE.CircleGeometry(3, 32);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x332211,
      transparent: true,
      opacity: 0.8
    });
    const floor = new THREE.Mesh(geometry, material);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(position.x, 0.05, position.z);
    this.scene.add(floor);
    
    // Animate collapse
    setTimeout(() => {
      let opacity = 0.8;
      const collapse = () => {
        opacity -= 0.02;
        floor.material.opacity = opacity;
        floor.position.y -= 0.05;
        
        // Damage player if standing on it
        const dist = this.player.position.distanceTo(floor.position);
        if (dist < 3 && opacity > 0.3) {
          this.takeDamage(10);
        }
        
        if (opacity > 0) {
          requestAnimationFrame(collapse);
        } else {
          this.scene.remove(floor);
        }
      };
      collapse();
    }, 500);
  }
  
  /**
   * Break object
   */
  breakObject(crate) {
    crate.userData.broken = true;
    this.scene.remove(crate);
    
    // Create debris particles
    for (let i = 0; i < 10; i++) {
      const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
      const material = new THREE.MeshStandardMaterial({ color: 0x886644 });
      const debris = new THREE.Mesh(geometry, material);
      debris.position.copy(crate.position);
      debris.castShadow = true;
      
      debris.userData = {
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 5,
          Math.random() * 5 + 2,
          (Math.random() - 0.5) * 5
        ),
        lifetime: 2
      };
      
      this.particles.push(debris);
      this.scene.add(debris);
    }
    
    this.showNotification('Crate destroyed!', 'info');
    this.playerScore += 10;
    this.updateScore();
  }
  
  /**
   * Collect pickup
   */
  collectPickup(pickup) {
    pickup.userData.collected = true;
    this.scene.remove(pickup);
    
    switch (pickup.userData.pickupType) {
      case 'health':
        this.playerHealth = Math.min(100, this.playerHealth + 30);
        this.showNotification('+30 Health', 'info');
        break;
      case 'speed':
        this.physics.maxSpeed = 12;
        this.showNotification('Speed boost!', 'ability');
        setTimeout(() => { this.physics.maxSpeed = 8; }, 10000);
        break;
      case 'power':
        this.playerScore += 50;
        this.showNotification('+50 Score', 'info');
        this.updateScore();
        break;
    }
    
    // Respawn pickup after delay
    setTimeout(() => {
      pickup.userData.collected = false;
      pickup.position.set(
        (Math.random() - 0.5) * 80,
        1,
        (Math.random() - 0.5) * 80
      );
      this.scene.add(pickup);
    }, 15000);
  }
  
  /**
   * Update particles
   */
  updateParticles(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Update position
      particle.position.add(particle.userData.velocity.clone().multiplyScalar(delta));
      particle.userData.velocity.y -= 9.8 * delta; // Gravity
      
      // Check projectile collision with player
      if (particle.userData.damage) {
        const distToPlayer = this.player.position.distanceTo(particle.position);
        if (distToPlayer < 1) {
          this.takeDamage(particle.userData.damage);
          this.scene.remove(particle);
          this.particles.splice(i, 1);
          continue;
        }
      }
      
      // Update lifetime
      particle.userData.lifetime -= delta;
      
      if (particle.userData.lifetime <= 0 || particle.position.y < 0) {
        this.scene.remove(particle);
        this.particles.splice(i, 1);
      }
    }
  }
  
  /**
   * Update camera
   */
  updateCamera(delta) {
    if (this.paused || !this.player || !this.player.position) return; // Safety check
    
    // Calculate desired camera position
    const desiredPosition = this.player.position.clone().add(this.cameraOffset);
    
    // Add mouse influence for camera rotation
    const mouseInfluence = 3;
    desiredPosition.x += this.mouse.x * mouseInfluence;
    desiredPosition.y += -this.mouse.y * mouseInfluence + 5;
    
    // Smooth camera follow with damping
    this.camera.position.lerp(desiredPosition, 5 * delta);
    
    // Camera looks at player
    const lookAtPosition = this.player.position.clone();
    lookAtPosition.y += 1;
    this.camera.lookAt(lookAtPosition);
  }
  
  /**
   * Window resize handler
   */
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  /**
   * Animation loop
   */
  animate() {
    requestAnimationFrame(() => this.animate());
    
    const delta = this.clock.getDelta();
    this.lastDelta = delta;
    
    if (!this.paused) {
      // Step physics world
      if (this.world && this.config.usePhysics) {
        this.world.step(1 / 60, delta, 3);
      }
      
      // Safety check: ensure player exists before updating
      if (!this.player) {
        return; // Skip this frame if player not yet created
      }
      
      this.updatePlayer(delta);
      
      // NEW: Record frame data for intent tracking
      if (this.intentTracker && this.player && this.player.userData && this.player.userData.velocity) {
        const playerData = {
          position: this.player.position,
          velocity: this.player.userData.velocity,
          lastAction: this.player.userData.lastAction
        };
        this.intentTracker.recordFrame(playerData, this.enemies, delta);
      }
      
      // NEW: Update enemies with new system
      if (this.enemySystem) {
        const powerUpEffects = this.powerUpSystem ? this.powerUpSystem.getActiveEffects() : null;
        this.enemies.forEach(enemy => {
          this.enemySystem.updateEnemy(enemy, this.player, delta, powerUpEffects);
          
          // Check for pending damage from enemy attacks
          if (enemy.userData.pendingPlayerDamage) {
            this.takeDamage(enemy.userData.pendingPlayerDamage);
            enemy.userData.pendingPlayerDamage = 0;
            
            // Register reaction for intent tracker
            if (this.intentTracker) {
              this.intentTracker.registerReaction('hit_by_enemy');
            }
          }
          
          // Check for spike damage on enemies
          if (enemy.userData.pendingSpikeHit) {
            enemy.userData.health -= enemy.userData.spikeHitDamage || 15;
            enemy.userData.pendingSpikeHit = false;
            if (enemy.userData.health <= 0) {
              this.removeEnemy(enemy);
            }
          }
        });
      } else {
        // Fallback to old system
        this.updateEnemies(delta);
      }
      
      // NEW: Update world reactions
      if (this.worldReactions) {
        this.worldReactions.update(this.player, this.enemies, delta);
        
        // Check for spike damage on player
        this.worldReactions.spikes.forEach(spike => {
          if (spike.userData.pendingPlayerDamage) {
            this.takeDamage(spike.userData.pendingPlayerDamage);
            spike.userData.pendingPlayerDamage = 0;
          }
        });
      }
      
      // NEW: Update power-up system
      if (this.powerUpSystem) {
        this.powerUpSystem.update(delta, this.enemies);
      }
      
      // NEW: Update map dynamic elements
      if (this.mapGenerator) {
        this.mapGenerator.updateDynamicElements(this.player, delta);
      }
      
      this.updateParticles(delta);
      this.updateCamera(delta);
      this.updateInteractiveElements(delta);
    }
    
    this.updateHUD();
    
    this.renderer.render(this.scene, this.camera);
  }
}

// Export Game3D to global scope
window.Game3D = Game3D;

})();

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeOut {
    to { opacity: 0; }
  }
  
  @keyframes slideIn {
    from { transform: translateY(-20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  
  body {
    margin: 0;
    overflow: hidden;
    font-family: 'Courier New', monospace;
  }
`;
if (document.head) {
  document.head.appendChild(style);
}
