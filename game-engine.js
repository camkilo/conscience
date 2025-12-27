/**
 * Predictive World AI Engine
 * Analyzes player behavior and adapts the game world in real-time
 */

export class PredictiveAI {
  constructor() {
    this.playerProfile = {
      aggression: 0.5,
      caution: 0.5,
      morality: 0.5,
      exploration: 0.5,
      strategy: 0.5
    };
    this.actionHistory = [];
    this.predictions = [];
  }

  /**
   * Observe and record player action
   */
  observeAction(action) {
    this.actionHistory.push({
      type: action.type,
      timestamp: Date.now(),
      context: action.context
    });

    // Update player profile based on action
    this.updateProfile(action);
    
    // Generate predictions
    this.generatePredictions();
  }

  /**
   * Update player profile based on observed behavior
   */
  updateProfile(action) {
    const weight = 0.1; // Learning rate

    switch (action.type) {
      case 'attack':
        this.playerProfile.aggression += weight;
        this.playerProfile.caution -= weight * 0.5;
        break;
      case 'defend':
        this.playerProfile.caution += weight;
        this.playerProfile.aggression -= weight * 0.3;
        break;
      case 'help':
        this.playerProfile.morality += weight;
        break;
      case 'betray':
        this.playerProfile.morality -= weight;
        break;
      case 'explore':
        this.playerProfile.exploration += weight;
        break;
      case 'plan':
        this.playerProfile.strategy += weight;
        break;
    }

    // Normalize values between 0 and 1
    Object.keys(this.playerProfile).forEach(key => {
      this.playerProfile[key] = Math.max(0, Math.min(1, this.playerProfile[key]));
    });
  }

  /**
   * Generate predictions about player's next move
   */
  generatePredictions() {
    const recentActions = this.actionHistory.slice(-5);
    const patterns = this.detectPatterns(recentActions);
    
    this.predictions = patterns.map(pattern => ({
      action: pattern.likelyNext,
      confidence: pattern.confidence,
      counter: this.generateCounter(pattern.likelyNext)
    }));
  }

  /**
   * Detect patterns in player behavior
   */
  detectPatterns(actions) {
    if (actions.length < 2) return [];

    const patterns = [];
    
    // Check for aggressive patterns
    const aggressiveActions = actions.filter(a => a.type === 'attack').length;
    if (aggressiveActions / actions.length > 0.6) {
      patterns.push({
        likelyNext: 'attack',
        confidence: 0.8
      });
    }

    // Check for cautious patterns
    const cautiousActions = actions.filter(a => a.type === 'defend').length;
    if (cautiousActions / actions.length > 0.6) {
      patterns.push({
        likelyNext: 'defend',
        confidence: 0.75
      });
    }

    return patterns;
  }

  /**
   * Generate counter-strategy to player's predicted action
   */
  generateCounter(predictedAction) {
    const counters = {
      'attack': 'ambush',
      'defend': 'siege',
      'explore': 'trap',
      'help': 'manipulation',
      'betray': 'exposure',
      'plan': 'chaos'
    };

    return counters[predictedAction] || 'adapt';
  }

  /**
   * Get current player profile
   */
  getProfile() {
    return { ...this.playerProfile };
  }

  /**
   * Get current predictions
   */
  getPredictions() {
    return [...this.predictions];
  }
}

/**
 * Dynamic World System
 * Manipulates environment, enemies, and story based on AI predictions
 */
export class DynamicWorld {
  constructor(predictiveAI) {
    this.ai = predictiveAI;
    this.currentState = {
      environment: 'neutral',
      enemyStrategy: 'balanced',
      storyBranch: 'main',
      worldSeed: Math.random()
    };
    this.alterationHistory = [];
  }

  /**
   * Alter world based on player profile and predictions
   */
  alterWorld() {
    const profile = this.ai.getProfile();
    const predictions = this.ai.getPredictions();

    const alteration = {
      timestamp: Date.now(),
      changes: []
    };

    // Alter environment based on player style
    if (profile.aggression > 0.7) {
      this.currentState.environment = 'fortified';
      alteration.changes.push('Enemies have fortified their positions');
    } else if (profile.caution > 0.7) {
      this.currentState.environment = 'aggressive';
      alteration.changes.push('Enemies are pushing forward aggressively');
    }

    // Adapt enemy strategy
    if (predictions.length > 0) {
      const mainPrediction = predictions[0];
      this.currentState.enemyStrategy = mainPrediction.counter;
      alteration.changes.push(`Enemies are preparing for: ${mainPrediction.counter}`);
    }

    // Adapt story based on morality
    if (profile.morality > 0.7) {
      this.currentState.storyBranch = 'heroic';
      alteration.changes.push('Your reputation as a hero spreads');
    } else if (profile.morality < 0.3) {
      this.currentState.storyBranch = 'dark';
      alteration.changes.push('People whisper about your dark deeds');
    }

    this.alterationHistory.push(alteration);
    return alteration;
  }

  /**
   * Generate personalized encounter
   */
  generateEncounter() {
    const profile = this.ai.getProfile();
    const seed = this.currentState.worldSeed + this.alterationHistory.length;

    const encounter = {
      id: `encounter_${Date.now()}_${seed}`,
      type: this.determineEncounterType(profile),
      difficulty: this.calculateDifficulty(profile),
      moralDilemma: this.generateMoralChoice(profile),
      environmentalChallenge: this.generateEnvironmentalChallenge(profile)
    };

    return encounter;
  }

  determineEncounterType(profile) {
    if (profile.aggression > 0.6) return 'combat';
    if (profile.exploration > 0.6) return 'puzzle';
    if (profile.strategy > 0.6) return 'tactical';
    return 'mixed';
  }

  calculateDifficulty(profile) {
    // Higher skill in areas = higher difficulty in those areas
    const avgSkill = Object.values(profile).reduce((a, b) => a + b, 0) / Object.keys(profile).length;
    return Math.floor(avgSkill * 10) + 1;
  }

  generateMoralChoice(profile) {
    const choices = [
      {
        scenario: 'A wounded enemy begs for mercy',
        options: {
          mercy: { moralityChange: 0.1, consequence: 'They may return stronger' },
          kill: { moralityChange: -0.1, consequence: 'Their allies seek revenge' }
        }
      },
      {
        scenario: 'You find supplies that could help others',
        options: {
          share: { moralityChange: 0.1, consequence: 'You are weakened' },
          keep: { moralityChange: -0.1, consequence: 'You are stronger alone' }
        }
      },
      {
        scenario: 'An ally asks you to sacrifice yourself',
        options: {
          sacrifice: { moralityChange: 0.15, consequence: 'The mission succeeds' },
          refuse: { moralityChange: -0.05, consequence: 'You survive but they suffer' }
        }
      }
    ];

    // Choose based on player's morality tendency
    const index = Math.floor(Math.abs(Math.sin(profile.morality * this.currentState.worldSeed)) * choices.length);
    return choices[index % choices.length];
  }

  generateEnvironmentalChallenge(profile) {
    if (profile.exploration > 0.6) {
      return { type: 'maze', description: 'A complex labyrinth blocks your path' };
    }
    if (profile.aggression > 0.6) {
      return { type: 'ambush', description: 'Enemies have set a trap for aggressive players' };
    }
    return { type: 'standard', description: 'The path ahead is treacherous' };
  }

  getState() {
    return { ...this.currentState };
  }

  getAlterationHistory() {
    return [...this.alterationHistory];
  }
}

/**
 * Choice Ripple System
 * Tracks how player choices affect the world over time
 */
export class ChoiceRipple {
  constructor() {
    this.choices = [];
    this.consequences = [];
  }

  recordChoice(choice) {
    this.choices.push({
      id: `choice_${Date.now()}`,
      decision: choice.decision,
      timestamp: Date.now(),
      context: choice.context
    });

    // Generate ripple effects
    this.generateRipples(choice);
  }

  generateRipples(choice) {
    const ripple = {
      choiceId: `choice_${Date.now()}`,
      immediateEffect: choice.immediateEffect || 'Unknown',
      futureConsequences: []
    };

    // Add immediate consequence
    this.consequences.push({
      type: 'immediate',
      effect: ripple.immediateEffect,
      timestamp: Date.now()
    });

    // Add delayed consequences (simulation)
    setTimeout(() => {
      this.consequences.push({
        type: 'delayed',
        effect: `Your choice has affected NPC behavior`,
        timestamp: Date.now()
      });
    }, 100); // In real game, this would be much longer

    return ripple;
  }

  getActiveConsequences() {
    return [...this.consequences];
  }

  getChoiceHistory() {
    return [...this.choices];
  }
}

/**
 * Game Session Manager
 * Manages individual player sessions with personalized experiences
 */
export class GameSession {
  constructor(playerId) {
    this.playerId = playerId;
    this.ai = new PredictiveAI();
    this.world = new DynamicWorld(this.ai);
    this.ripple = new ChoiceRipple();
    this.sessionStart = Date.now();
    this.score = 0;
  }

  /**
   * Process player action
   */
  processAction(action) {
    // Observe action
    this.ai.observeAction(action);

    // Record choice if it's a moral decision
    if (action.isMoralChoice) {
      this.ripple.recordChoice(action);
    }

    // Alter world based on new information
    const worldChanges = this.world.alterWorld();

    // Generate next encounter
    const nextEncounter = this.world.generateEncounter();

    // Update score
    this.score += action.value || 0;

    return {
      worldChanges,
      nextEncounter,
      playerProfile: this.ai.getProfile(),
      predictions: this.ai.getPredictions(),
      consequences: this.ripple.getActiveConsequences()
    };
  }

  /**
   * Get current session state
   */
  getSessionState() {
    return {
      playerId: this.playerId,
      sessionDuration: Date.now() - this.sessionStart,
      score: this.score,
      playerProfile: this.ai.getProfile(),
      worldState: this.world.getState(),
      actionCount: this.ai.actionHistory.length,
      choiceCount: this.ripple.getChoiceHistory().length
    };
  }
}
