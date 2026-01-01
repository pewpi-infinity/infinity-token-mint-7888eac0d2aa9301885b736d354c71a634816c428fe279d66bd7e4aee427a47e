// Capacitor Minting Physics
// Implements charge-based minting to prevent spam and abuse

class CapacitorMint {
  constructor(config) {
    this.config = config;
    this.charge = 0;
    this.maxCharge = 100;
    this.threshold = config.capacitor_physics?.threshold || 100;
    this.chargeRate = 1; // charge per activity unit
    this.dischargeRate = 20; // discharge per mint
    this.activityLog = [];
    this.lastMintTime = null;
  }

  // Register activity to charge capacitor
  registerActivity(activityType, intensity = 1) {
    const chargeAmount = intensity * this.chargeRate;
    
    this.charge = Math.min(this.maxCharge, this.charge + chargeAmount);
    
    this.activityLog.push({
      type: activityType,
      intensity,
      charge_added: chargeAmount,
      timestamp: new Date().toISOString(),
      total_charge: this.charge
    });

    // Trim activity log to last 100 entries
    if (this.activityLog.length > 100) {
      this.activityLog = this.activityLog.slice(-100);
    }

    return {
      charge: this.charge,
      can_mint: this.canMint()
    };
  }

  // Check if capacitor is charged enough to mint
  canMint() {
    return this.charge >= this.threshold;
  }

  // Attempt to mint (discharges capacitor)
  attemptMint() {
    if (!this.canMint()) {
      return {
        success: false,
        error: 'Insufficient capacitor charge',
        charge: this.charge,
        threshold: this.threshold,
        needed: this.threshold - this.charge
      };
    }

    // Discharge capacitor
    this.charge = Math.max(0, this.charge - this.dischargeRate);
    this.lastMintTime = new Date().toISOString();

    return {
      success: true,
      charge: this.charge,
      timestamp: this.lastMintTime
    };
  }

  // Natural charge decay (optional, prevents infinite accumulation)
  applyDecay(decayRate = 0.1) {
    this.charge = Math.max(0, this.charge - decayRate);
  }

  // Mongoose pattern detection for abuse prevention
  detectAbuse() {
    if (this.activityLog.length < 10) {
      return { abuse_detected: false };
    }

    const recentActivities = this.activityLog.slice(-10);
    const timestamps = recentActivities.map(a => new Date(a.timestamp).getTime());
    
    // Check for rapid-fire pattern (all within 1 second)
    const timeSpan = timestamps[timestamps.length - 1] - timestamps[0];
    if (timeSpan < 1000) {
      return {
        abuse_detected: true,
        pattern: 'rapid_fire',
        action: 'throttle',
        cooldown: 5000
      };
    }

    // Check for repetitive pattern
    const types = recentActivities.map(a => a.type);
    const allSame = types.every(t => t === types[0]);
    if (allSame && types.length > 8) {
      return {
        abuse_detected: true,
        pattern: 'repetitive',
        action: 'require_variety',
        suggestion: 'Vary activity types'
      };
    }

    return { abuse_detected: false };
  }

  // Get current status
  getStatus() {
    return {
      charge: this.charge,
      max_charge: this.maxCharge,
      threshold: this.threshold,
      can_mint: this.canMint(),
      charge_percentage: (this.charge / this.maxCharge * 100).toFixed(1),
      last_mint: this.lastMintTime,
      recent_activities: this.activityLog.slice(-5),
      abuse_check: this.detectAbuse()
    };
  }

  // Reset capacitor (admin function)
  reset() {
    this.charge = 0;
    this.activityLog = [];
    this.lastMintTime = null;
  }

  // Boost capacitor (power-up, like Mario mushroom)
  boost(amount) {
    this.charge = Math.min(this.maxCharge, this.charge + amount);
    return {
      boosted: true,
      boost_amount: amount,
      new_charge: this.charge
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CapacitorMint;
}
