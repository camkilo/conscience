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
    this.enemies = [];
    this.particles = [];
    this.clock = new THREE.Clock();
    
    // Input state
    this.keys = {};
    this.mouse = { x: 0, y: 0, buttons: {} };
    
    // Camera settings
    this.cameraOffset = new THREE.Vector3(0, 5, 10);
    this.cameraVelocity = new THREE.Vector3();
    
    // Player state
    this.playerHealth = 100;
    this.playerEnergy = 100;
    this.playerScore = 0;
    
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
   * Initialize the 3D game
   */
  async init() {
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: false 
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);
    
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);
    this.scene.fog = new THREE.Fog(0x0a0a1a, 20, 100);
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    
    // Create lights
    this.createLights();
    
    // Create environment
    this.createEnvironment();
    
    // Create player
    this.createPlayer();
    
    // Create initial enemies
    this.spawnEnemies(5);
    
    // Create HUD
    this.createHUD();
    
    // Setup input handlers
    this.setupInputHandlers();
    
    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
    
    // Start animation loop
    this.animate();
  }
  
  /**
   * Create lighting
   */
  createLights() {
    // Ambient light
    const ambient = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambient);
    
    // Directional light (sun)
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(10, 20, 10);
    sun.castShadow = true;
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    this.scene.add(sun);
    
    // Hemisphere light
    const hemi = new THREE.HemisphereLight(0x4488ff, 0x442200, 0.3);
    this.scene.add(hemi);
  }
  
  /**
   * Create game environment
   */
  createEnvironment() {
    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x223344,
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    
    // Grid helper
    const grid = new THREE.GridHelper(200, 40, 0x444466, 0x222233);
    this.scene.add(grid);
    
    // Add some obstacles/structures
    for (let i = 0; i < 15; i++) {
      const size = Math.random() * 2 + 1;
      const geometry = new THREE.BoxGeometry(size, size * 2, size);
      const material = new THREE.MeshStandardMaterial({ 
        color: 0x336688,
        roughness: 0.7,
        metalness: 0.3
      });
      const obstacle = new THREE.Mesh(geometry, material);
      obstacle.position.set(
        (Math.random() - 0.5) * 80,
        size,
        (Math.random() - 0.5) * 80
      );
      obstacle.castShadow = true;
      obstacle.receiveShadow = true;
      this.scene.add(obstacle);
    }
  }
  
  /**
   * Create player character
   */
  createPlayer() {
    const geometry = new THREE.ConeGeometry(0.5, 2, 8);
    const material = new THREE.MeshStandardMaterial({ 
      color: this.colors.player,
      emissive: this.colors.player,
      emissiveIntensity: 0.3,
      roughness: 0.5,
      metalness: 0.5
    });
    this.player = new THREE.Mesh(geometry, material);
    this.player.position.y = 1;
    this.player.castShadow = true;
    this.player.userData = {
      velocity: new THREE.Vector3(),
      speed: 10,
      rotation: 0
    };
    this.scene.add(this.player);
    
    // Add player indicator ring
    const ringGeometry = new THREE.RingGeometry(0.8, 1, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({ 
      color: this.colors.player,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.1;
    this.player.add(ring);
  }
  
  /**
   * Spawn enemies
   */
  spawnEnemies(count) {
    for (let i = 0; i < count; i++) {
      const geometry = new THREE.OctahedronGeometry(0.6);
      const material = new THREE.MeshStandardMaterial({ 
        color: this.colors.enemy,
        emissive: this.colors.enemy,
        emissiveIntensity: 0.3,
        roughness: 0.5,
        metalness: 0.5
      });
      const enemy = new THREE.Mesh(geometry, material);
      enemy.position.set(
        (Math.random() - 0.5) * 60,
        1,
        (Math.random() - 0.5) * 60
      );
      enemy.castShadow = true;
      enemy.userData = {
        health: 100,
        velocity: new THREE.Vector3(),
        speed: 3,
        type: 'enemy'
      };
      this.scene.add(enemy);
      this.enemies.push(enemy);
    }
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
  useAbility(index) {
    if (this.paused) return;
    
    const ability = this.abilities[index];
    if (ability.cooldown > 0) {
      this.showNotification(`${ability.name} on cooldown!`, 'warning');
      return;
    }
    
    ability.cooldown = ability.maxCooldown;
    
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
   * Create shield visual
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
   * Create explosion effect
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
   * Create hit effect
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
  updateHUD() {
    // Health bar
    const healthPercent = (this.playerHealth / 100) * 100;
    const healthBar = document.getElementById('health-bar');
    if (healthBar) {
      healthBar.style.width = `${healthPercent}%`;
    }
    
    // Ability cooldowns
    this.abilities.forEach((ability, index) => {
      if (ability.cooldown > 0) {
        ability.cooldown -= this.clock.getDelta();
        if (ability.cooldown < 0) ability.cooldown = 0;
      }
      
      const cooldownPercent = (ability.cooldown / ability.maxCooldown) * 100;
      const cooldownEl = document.getElementById(`ability-${index}-cooldown`);
      if (cooldownEl) {
        cooldownEl.style.height = `${cooldownPercent}%`;
      }
    });
    
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
          border-bottom: 20px solid ${this.colors.enemy.toString(16).padStart(6, '0')};
          transform: translate(-50%, -50%) rotate(${angle + 90}deg);
          pointer-events: none;
          opacity: ${Math.max(0.3, 1 - distance / 50)};
        `;
        
        container.appendChild(indicator);
      } else {
        // On-screen health bar for nearby enemies
        const healthBar = document.createElement('div');
        const healthPercent = (enemy.userData.health / 100) * 100;
        
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
   * Update player
   */
  updatePlayer(delta) {
    if (this.paused) return;
    
    const moveSpeed = this.player.userData.speed * delta;
    const direction = new THREE.Vector3();
    
    // WASD movement
    if (this.keys['w']) direction.z -= 1;
    if (this.keys['s']) direction.z += 1;
    if (this.keys['a']) direction.x -= 1;
    if (this.keys['d']) direction.x += 1;
    
    if (direction.length() > 0) {
      direction.normalize();
      this.player.userData.velocity.add(direction.multiplyScalar(moveSpeed));
    }
    
    // Apply velocity with damping
    this.player.position.add(this.player.userData.velocity);
    this.player.userData.velocity.multiplyScalar(0.9);
    
    // Keep player on ground and in bounds
    this.player.position.y = 1;
    this.player.position.x = Math.max(-90, Math.min(90, this.player.position.x));
    this.player.position.z = Math.max(-90, Math.min(90, this.player.position.z));
    
    // Rotate player based on movement
    if (this.player.userData.velocity.length() > 0.1) {
      this.player.userData.rotation = Math.atan2(
        this.player.userData.velocity.x,
        this.player.userData.velocity.z
      );
      this.player.rotation.y = this.player.userData.rotation;
    }
  }
  
  /**
   * Update enemies
   */
  updateEnemies(delta) {
    if (this.paused) return;
    
    this.enemies.forEach(enemy => {
      // Simple AI: move toward player
      const direction = new THREE.Vector3();
      direction.subVectors(this.player.position, enemy.position);
      direction.y = 0;
      
      if (direction.length() > 3) {
        direction.normalize();
        enemy.position.add(direction.multiplyScalar(enemy.userData.speed * delta));
      }
      
      // Rotate toward player
      enemy.rotation.y = Math.atan2(direction.x, direction.z);
      
      // Bobbing animation
      enemy.position.y = 1 + Math.sin(Date.now() * 0.003 + enemy.position.x) * 0.2;
      
      // Check collision with player
      const distance = this.player.position.distanceTo(enemy.position);
      if (distance < 1.5) {
        this.takeDamage(5 * delta);
      }
    });
  }
  
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
   * Game over
   */
  gameOver() {
    this.paused = true;
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
   * Update particles
   */
  updateParticles(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Update position
      particle.position.add(particle.userData.velocity.clone().multiplyScalar(delta));
      particle.userData.velocity.y -= 9.8 * delta; // Gravity
      
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
    if (this.paused) return;
    
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
    
    if (!this.paused) {
      this.updatePlayer(delta);
      this.updateEnemies(delta);
      this.updateParticles(delta);
      this.updateCamera(delta);
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
