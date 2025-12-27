/**
 * Death Screen System with Judgment
 * Shows player intent graph and generates one-sentence judgment
 */

export class DeathScreen {
  constructor(intentTracker) {
    this.intentTracker = intentTracker;
  }
  
  /**
   * Generate judgment sentence based on player behavior
   */
  generateJudgment(judgmentData) {
    const { intentScores, dominantIntent, movementStats, averageReactionTime } = judgmentData;
    
    // Judgment templates based on dominant behavior
    const judgments = {
      aggression: [
        {
          condition: () => intentScores.aggression > 0.8 && averageReactionTime < 0.3,
          text: "You trusted speed. The world waited."
        },
        {
          condition: () => intentScores.aggression > 0.7 && intentScores.precision < 0.4,
          text: "Reckless force. The world rewards patience."
        },
        {
          condition: () => intentScores.aggression > 0.6,
          text: "Aggression without wisdom. The world adapted."
        }
      ],
      
      evasion: [
        {
          condition: () => intentScores.evasion > 0.8 && movementStats.movingRatio > 0.8,
          text: "You never stopped running. The world closed in."
        },
        {
          condition: () => intentScores.evasion > 0.7 && intentScores.panic > 0.6,
          text: "Fear guided you. The world sensed it."
        },
        {
          condition: () => intentScores.evasion > 0.6,
          text: "You hesitated. The world closed in."
        }
      ],
      
      greed: [
        {
          condition: () => intentScores.greed > 0.7,
          text: "You chased rewards. The world set traps."
        },
        {
          condition: () => intentScores.greed > 0.5 && intentScores.precision < 0.4,
          text: "Desire made you predictable."
        }
      ],
      
      panic: [
        {
          condition: () => intentScores.panic > 0.7 && averageReactionTime > 0.5,
          text: "Chaos was your strategy. The world found order."
        },
        {
          condition: () => intentScores.panic > 0.6,
          text: "You lost composure. The world remained calm."
        }
      ],
      
      precision: [
        {
          condition: () => intentScores.precision > 0.8 && movementStats.pathRepetition > 0.7,
          text: "Perfect patterns. Perfectly predictable."
        },
        {
          condition: () => intentScores.precision > 0.8 && movementStats.pathRepetition > 0.7,
          text: "You repeated yourself."
        },
        {
          condition: () => intentScores.precision > 0.7,
          text: "Precision without adaptation. The world evolved."
        }
      ]
    };
    
    // Special combined judgments
    const combinedJudgments = [
      {
        condition: () => movementStats.movingRatio < 0.2,
        text: "Standing still is still a choice. The world remembered."
      },
      {
        condition: () => averageReactionTime > 0.8,
        text: "The world moved faster than your thoughts."
      },
      {
        condition: () => movementStats.pathRepetition > 0.9,
        text: "The same path, the same end."
      },
      {
        condition: () => intentScores.aggression > 0.7 && intentScores.panic > 0.7,
        text: "Desperate aggression. The world exploited both."
      },
      {
        condition: () => intentScores.evasion > 0.7 && intentScores.greed > 0.6,
        text: "Caution and greed cannot coexist."
      }
    ];
    
    // Try combined judgments first
    for (const judgment of combinedJudgments) {
      if (judgment.condition()) {
        return judgment.text;
      }
    }
    
    // Try specific judgments for dominant intent
    if (judgments[dominantIntent]) {
      for (const judgment of judgments[dominantIntent]) {
        if (judgment.condition()) {
          return judgment.text;
        }
      }
    }
    
    // Fallback generic judgments
    return "The world observed. The world adapted. The world prevailed.";
  }
  
  /**
   * Create and show death screen
   */
  show(onRestart) {
    const judgmentData = this.intentTracker.getJudgmentData();
    const judgment = this.generateJudgment(judgmentData);
    
    // Create death screen overlay
    const overlay = document.createElement('div');
    overlay.id = 'death-screen';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: #ffffff;
      font-family: 'Courier New', monospace;
      z-index: 10000;
      animation: fadeIn 1s ease-in;
    `;
    
    // Title
    const title = document.createElement('div');
    title.style.cssText = `
      font-size: 48px;
      font-weight: bold;
      color: #ff4444;
      margin-bottom: 40px;
      text-shadow: 0 0 10px #ff0000;
    `;
    title.textContent = 'CONSCIENCE';
    overlay.appendChild(title);
    
    // Judgment text
    const judgmentEl = document.createElement('div');
    judgmentEl.style.cssText = `
      font-size: 24px;
      color: #ffaa44;
      margin-bottom: 40px;
      max-width: 600px;
      text-align: center;
      line-height: 1.6;
      font-style: italic;
    `;
    judgmentEl.textContent = `"${judgment}"`;
    overlay.appendChild(judgmentEl);
    
    // Intent graph
    const graphContainer = document.createElement('div');
    graphContainer.style.cssText = `
      width: 500px;
      margin-bottom: 40px;
    `;
    
    const graphTitle = document.createElement('div');
    graphTitle.style.cssText = `
      font-size: 18px;
      margin-bottom: 15px;
      color: #aaaaaa;
    `;
    graphTitle.textContent = 'YOUR INTENT PROFILE';
    graphContainer.appendChild(graphTitle);
    
    // Create bars for each intent
    Object.entries(judgmentData.intentScores).forEach(([intent, value]) => {
      const barContainer = document.createElement('div');
      barContainer.style.cssText = `
        margin-bottom: 10px;
      `;
      
      const label = document.createElement('div');
      label.style.cssText = `
        display: flex;
        justify-content: space-between;
        font-size: 14px;
        margin-bottom: 5px;
      `;
      label.innerHTML = `
        <span style="text-transform: uppercase;">${intent}</span>
        <span>${Math.round(value * 100)}%</span>
      `;
      barContainer.appendChild(label);
      
      const barBg = document.createElement('div');
      barBg.style.cssText = `
        width: 100%;
        height: 20px;
        background: #333333;
        border-radius: 3px;
        overflow: hidden;
      `;
      
      const barFill = document.createElement('div');
      const color = intent === judgmentData.dominantIntent ? '#ff4444' : '#4488ff';
      barFill.style.cssText = `
        width: ${value * 100}%;
        height: 100%;
        background: ${color};
        transition: width 1s ease-out;
      `;
      barBg.appendChild(barFill);
      barContainer.appendChild(barBg);
      
      graphContainer.appendChild(barContainer);
    });
    
    overlay.appendChild(graphContainer);
    
    // Stats
    const statsContainer = document.createElement('div');
    statsContainer.style.cssText = `
      font-size: 14px;
      color: #888888;
      margin-bottom: 30px;
      text-align: center;
    `;
    statsContainer.innerHTML = `
      <div>Movement: ${Math.round(judgmentData.movementStats.movingRatio * 100)}% Active</div>
      <div>Reaction Time: ${judgmentData.averageReactionTime.toFixed(2)}s Average</div>
      <div>Path Repetition: ${Math.round(judgmentData.movementStats.pathRepetition * 100)}%</div>
    `;
    overlay.appendChild(statsContainer);
    
    // Restart button
    const restartBtn = document.createElement('button');
    restartBtn.style.cssText = `
      padding: 15px 40px;
      font-size: 18px;
      font-family: 'Courier New', monospace;
      background: #ff4444;
      color: #ffffff;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      transition: background 0.3s;
    `;
    restartBtn.textContent = 'TRY AGAIN';
    restartBtn.onmouseover = () => restartBtn.style.background = '#ff6666';
    restartBtn.onmouseout = () => restartBtn.style.background = '#ff4444';
    restartBtn.onclick = () => {
      document.body.removeChild(overlay);
      if (onRestart) onRestart();
    };
    overlay.appendChild(restartBtn);
    
    document.body.appendChild(overlay);
    
    // Add animation CSS
    if (!document.getElementById('death-screen-style')) {
      const style = document.createElement('style');
      style.id = 'death-screen-style';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  /**
   * Hide death screen if visible
   */
  hide() {
    const deathScreen = document.getElementById('death-screen');
    if (deathScreen) {
      document.body.removeChild(deathScreen);
    }
  }
}

// Export to global scope
if (typeof window !== 'undefined') {
  window.DeathScreen = DeathScreen;
}
