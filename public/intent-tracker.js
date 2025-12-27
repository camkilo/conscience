/**
 * Intent Tracking System (THE CORE)
 * Tracks player behavior patterns and derives intent scores
 */

class IntentTracker {
  constructor() {
    // Frame-by-frame tracking data
    this.frameData = [];
    
    // Rolling windows (in seconds)
    this.windows = {
      short: 5,    // 5 seconds
      medium: 15,  // 15 seconds
      long: 30     // 30 seconds
    };
    
    // Intent scores (0-1 scale)
    this.intentScores = {
      aggression: 0.5,
      evasion: 0.5,
      greed: 0.5,
      panic: 0.5,
      precision: 0.5
    };
    
    // Path tracking for repeated usage
    this.pathHeatmap = new Map(); // Grid-based heatmap
    this.gridSize = 5; // 5x5 meter grid cells
    
    // Threat tracking
    this.threats = [];
    this.lastThreatTime = 0;
    this.reactionTimes = [];
    
    // Movement tracking
    this.totalMovingTime = 0;
    this.totalStationaryTime = 0;
    this.lastPosition = null;
    this.stationaryThreshold = 0.1; // Movement below this is stationary
  }
  
  /**
   * Record frame data (call every frame)
   */
  recordFrame(playerData, enemiesData, delta) {
    const now = Date.now() / 1000; // Convert to seconds
    
    const frame = {
      timestamp: now,
      position: playerData.position.clone(),
      velocity: playerData.velocity.clone(),
      direction: playerData.velocity.clone().normalize(),
      speed: playerData.velocity.length(),
      isMoving: playerData.velocity.length() > this.stationaryThreshold,
      nearestEnemyDistance: this.calculateNearestEnemyDistance(playerData.position, enemiesData),
      enemiesInRange: this.countEnemiesInRange(playerData.position, enemiesData, 10),
      action: playerData.lastAction || null,
      delta: delta
    };
    
    // Track moving vs stationary time
    if (frame.isMoving) {
      this.totalMovingTime += delta;
    } else {
      this.totalStationaryTime += delta;
    }
    
    // Update path heatmap
    this.updatePathHeatmap(frame.position);
    
    // Store frame
    this.frameData.push(frame);
    
    // Clean old data (keep only last 30 seconds)
    this.cleanOldFrameData(now);
    
    // Update intent scores based on accumulated data
    this.updateIntentScores();
    
    this.lastPosition = frame.position.clone();
  }
  
  /**
   * Register a threat and track reaction
   */
  registerThreat(threatPosition, threatType) {
    const now = Date.now() / 1000;
    this.threats.push({
      timestamp: now,
      position: threatPosition.clone(),
      type: threatType,
      reacted: false,
      reactionTime: null
    });
    this.lastThreatTime = now;
  }
  
  /**
   * Register player reaction to threat
   */
  registerReaction(reactionType) {
    const now = Date.now() / 1000;
    
    // Find most recent unreacted threat
    for (let i = this.threats.length - 1; i >= 0; i--) {
      const threat = this.threats[i];
      if (!threat.reacted && now - threat.timestamp < 2) {
        threat.reacted = true;
        threat.reactionTime = now - threat.timestamp;
        threat.reactionType = reactionType;
        this.reactionTimes.push(threat.reactionTime);
        
        // Keep only last 20 reaction times
        if (this.reactionTimes.length > 20) {
          this.reactionTimes.shift();
        }
        break;
      }
    }
    
    // Clean old threats
    this.threats = this.threats.filter(t => now - t.timestamp < 5);
  }
  
  /**
   * Update path heatmap
   */
  updatePathHeatmap(position) {
    const gridX = Math.floor(position.x / this.gridSize);
    const gridZ = Math.floor(position.z / this.gridSize);
    const key = `${gridX},${gridZ}`;
    
    const count = this.pathHeatmap.get(key) || 0;
    this.pathHeatmap.set(key, count + 1);
  }
  
  /**
   * Get path repetition score for current position
   */
  getPathRepetition(position) {
    const gridX = Math.floor(position.x / this.gridSize);
    const gridZ = Math.floor(position.z / this.gridSize);
    const key = `${gridX},${gridZ}`;
    
    const count = this.pathHeatmap.get(key) || 0;
    const maxCount = Math.max(...Array.from(this.pathHeatmap.values()), 1);
    
    return count / maxCount; // Returns 0-1, where 1 is most repeated
  }
  
  /**
   * Clean old frame data
   */
  cleanOldFrameData(currentTime) {
    const cutoff = currentTime - this.windows.long;
    this.frameData = this.frameData.filter(f => f.timestamp > cutoff);
  }
  
  /**
   * Get frames within a time window
   */
  getFramesInWindow(windowSeconds) {
    if (this.frameData.length === 0) return [];
    
    const now = this.frameData[this.frameData.length - 1].timestamp;
    const cutoff = now - windowSeconds;
    
    return this.frameData.filter(f => f.timestamp > cutoff);
  }
  
  /**
   * Calculate nearest enemy distance
   */
  calculateNearestEnemyDistance(playerPos, enemies) {
    if (enemies.length === 0) return 999;
    
    let minDist = 999;
    enemies.forEach(enemy => {
      const dist = playerPos.distanceTo(enemy.position);
      if (dist < minDist) minDist = dist;
    });
    
    return minDist;
  }
  
  /**
   * Count enemies in range
   */
  countEnemiesInRange(playerPos, enemies, range) {
    return enemies.filter(e => playerPos.distanceTo(e.position) < range).length;
  }
  
  /**
   * Update all intent scores based on accumulated data
   */
  updateIntentScores() {
    // Use multiple time windows for different insights
    const shortFrames = this.getFramesInWindow(this.windows.short);
    const mediumFrames = this.getFramesInWindow(this.windows.medium);
    const longFrames = this.getFramesInWindow(this.windows.long);
    
    if (longFrames.length < 10) return; // Need minimum data
    
    // AGGRESSION: Moving toward enemies, attacking
    this.intentScores.aggression = this.calculateAggression(shortFrames, mediumFrames);
    
    // EVASION: Moving away from enemies, maintaining distance
    this.intentScores.evasion = this.calculateEvasion(shortFrames, mediumFrames);
    
    // GREED: Going for pickups, taking risks for rewards
    this.intentScores.greed = this.calculateGreed(mediumFrames);
    
    // PANIC: Erratic movement, poor decision making, reaction times
    this.intentScores.panic = this.calculatePanic(shortFrames, mediumFrames);
    
    // PRECISION: Consistent movement, good positioning, accurate actions
    this.intentScores.precision = this.calculatePrecision(mediumFrames, longFrames);
  }
  
  /**
   * Calculate aggression score
   */
  calculateAggression(shortFrames, mediumFrames) {
    if (shortFrames.length === 0) return 0.5;
    
    let aggressionScore = 0;
    
    // Factor 1: Moving toward enemies
    const movingTowardEnemy = shortFrames.filter(f => {
      if (f.nearestEnemyDistance > 20) return false;
      const nextFrame = shortFrames[shortFrames.indexOf(f) + 1];
      if (!nextFrame) return false;
      return nextFrame.nearestEnemyDistance < f.nearestEnemyDistance;
    }).length;
    
    aggressionScore += (movingTowardEnemy / shortFrames.length) * 0.4;
    
    // Factor 2: Time spent close to enemies
    const closeToEnemies = shortFrames.filter(f => f.nearestEnemyDistance < 5).length;
    aggressionScore += (closeToEnemies / shortFrames.length) * 0.3;
    
    // Factor 3: Attack actions in medium window
    const attackCount = mediumFrames.filter(f => f.action === 'attack').length;
    aggressionScore += Math.min(attackCount / 10, 1) * 0.3;
    
    return Math.max(0, Math.min(1, aggressionScore));
  }
  
  /**
   * Calculate evasion score
   */
  calculateEvasion(shortFrames, mediumFrames) {
    if (shortFrames.length === 0) return 0.5;
    
    let evasionScore = 0;
    
    // Factor 1: Moving away from enemies
    const movingAwayFromEnemy = shortFrames.filter(f => {
      if (f.nearestEnemyDistance > 20) return false;
      const nextFrame = shortFrames[shortFrames.indexOf(f) + 1];
      if (!nextFrame) return false;
      return nextFrame.nearestEnemyDistance > f.nearestEnemyDistance;
    }).length;
    
    evasionScore += (movingAwayFromEnemy / shortFrames.length) * 0.4;
    
    // Factor 2: Maintaining safe distance
    const safeDistance = shortFrames.filter(f => f.nearestEnemyDistance > 10 && f.nearestEnemyDistance < 20).length;
    evasionScore += (safeDistance / shortFrames.length) * 0.3;
    
    // Factor 3: Defend/dash actions
    const defensiveActions = mediumFrames.filter(f => f.action === 'defend' || f.action === 'dash').length;
    evasionScore += Math.min(defensiveActions / 8, 1) * 0.3;
    
    return Math.max(0, Math.min(1, evasionScore));
  }
  
  /**
   * Calculate greed score
   */
  calculateGreed(mediumFrames) {
    if (mediumFrames.length === 0) return 0.5;
    
    // Greed is measured by taking risks despite danger
    let greedScore = 0;
    
    // Factor 1: Approaching pickups despite nearby enemies
    const riskyPickups = mediumFrames.filter(f => 
      f.action === 'pickup' && f.enemiesInRange > 0
    ).length;
    
    greedScore += Math.min(riskyPickups / 3, 1) * 0.5;
    
    // Factor 2: Spending time in dangerous areas
    const dangerousTime = mediumFrames.filter(f => 
      f.enemiesInRange > 2 && f.isMoving
    ).length;
    
    greedScore += (dangerousTime / mediumFrames.length) * 0.5;
    
    return Math.max(0, Math.min(1, greedScore));
  }
  
  /**
   * Calculate panic score
   */
  calculatePanic(shortFrames, mediumFrames) {
    if (shortFrames.length === 0) return 0.5;
    
    let panicScore = 0;
    
    // Factor 1: Erratic direction changes
    let directionChanges = 0;
    for (let i = 1; i < shortFrames.length; i++) {
      const prevDir = shortFrames[i - 1].direction;
      const currDir = shortFrames[i].direction;
      if (prevDir.length() > 0 && currDir.length() > 0) {
        const dot = prevDir.dot(currDir);
        if (dot < 0.5) directionChanges++;
      }
    }
    
    panicScore += Math.min(directionChanges / (shortFrames.length * 0.3), 1) * 0.4;
    
    // Factor 2: Poor reaction times
    if (this.reactionTimes.length > 0) {
      const avgReaction = this.reactionTimes.reduce((a, b) => a + b, 0) / this.reactionTimes.length;
      if (avgReaction > 0.5) {
        panicScore += Math.min((avgReaction - 0.5) * 2, 1) * 0.3;
      }
    }
    
    // Factor 3: Time spent with enemies very close
    const veryClose = shortFrames.filter(f => f.nearestEnemyDistance < 3 && f.enemiesInRange > 1).length;
    panicScore += (veryClose / shortFrames.length) * 0.3;
    
    return Math.max(0, Math.min(1, panicScore));
  }
  
  /**
   * Calculate precision score
   */
  calculatePrecision(mediumFrames, longFrames) {
    if (mediumFrames.length === 0) return 0.5;
    
    let precisionScore = 0;
    
    // Factor 1: Smooth, consistent movement
    let speedVariance = 0;
    const speeds = mediumFrames.map(f => f.speed);
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    
    speeds.forEach(speed => {
      speedVariance += Math.pow(speed - avgSpeed, 2);
    });
    speedVariance = Math.sqrt(speedVariance / speeds.length);
    
    precisionScore += Math.max(0, 1 - (speedVariance / 5)) * 0.4;
    
    // Factor 2: Good reaction times
    if (this.reactionTimes.length > 0) {
      const avgReaction = this.reactionTimes.reduce((a, b) => a + b, 0) / this.reactionTimes.length;
      precisionScore += Math.max(0, 1 - avgReaction * 2) * 0.3;
    } else {
      precisionScore += 0.15; // Neutral if no data
    }
    
    // Factor 3: Path efficiency (not repeating same paths too much)
    const currentPos = mediumFrames[mediumFrames.length - 1]?.position;
    if (currentPos) {
      const repetition = this.getPathRepetition(currentPos);
      precisionScore += (1 - repetition) * 0.3;
    }
    
    return Math.max(0, Math.min(1, precisionScore));
  }
  
  /**
   * Get current intent scores
   */
  getIntentScores() {
    return { ...this.intentScores };
  }
  
  /**
   * Get movement statistics
   */
  getMovementStats() {
    const totalTime = this.totalMovingTime + this.totalStationaryTime;
    return {
      movingTime: this.totalMovingTime,
      stationaryTime: this.totalStationaryTime,
      movingRatio: totalTime > 0 ? this.totalMovingTime / totalTime : 0.5,
      pathRepetition: this.lastPosition ? this.getPathRepetition(this.lastPosition) : 0
    };
  }
  
  /**
   * Get average reaction time
   */
  getAverageReactionTime() {
    if (this.reactionTimes.length === 0) return 0;
    return this.reactionTimes.reduce((a, b) => a + b, 0) / this.reactionTimes.length;
  }
  
  /**
   * Get data for death screen judgment
   */
  getJudgmentData() {
    const scores = this.getIntentScores();
    const stats = this.getMovementStats();
    
    // Find dominant behavior pattern
    const maxScore = Math.max(...Object.values(scores));
    const dominantIntent = Object.keys(scores).find(key => scores[key] === maxScore);
    
    return {
      intentScores: scores,
      dominantIntent: dominantIntent,
      movementStats: stats,
      averageReactionTime: this.getAverageReactionTime(),
      pathHeatmap: Array.from(this.pathHeatmap.entries())
    };
  }
}

// Export to global scope for use in game3d.js
if (typeof window !== 'undefined') {
  window.IntentTracker = IntentTracker;
}
