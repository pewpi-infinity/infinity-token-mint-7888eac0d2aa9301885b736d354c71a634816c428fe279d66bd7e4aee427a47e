// ALC (Andy Lian Coin) Minter
// Handles the creation and minting of Andy Lian Coins

class ALCMinter {
  constructor(config) {
    this.config = config;
    this.totalMinted = 0;
    this.inCirculation = 0;
    this.mintingHistory = [];
    this.capacitorCharge = 0;
  }

  // Main minting function
  async mint(request) {
    const { trigger, amount, owner, metadata } = request;
    
    // Validate request
    if (!this.validateMintRequest(request)) {
      return { success: false, error: 'Invalid mint request' };
    }
    
    // Check capacitor charge
    if (!this.checkCapacitorCharge(trigger)) {
      return { success: false, error: 'Insufficient capacitor charge' };
    }
    
    // Create token
    const token = this.createToken({
      type: 'ALC',
      amount: amount || this.config.minting_triggers[trigger].base_amount,
      owner,
      trigger,
      metadata: {
        ...metadata,
        trigger,
        timestamp: new Date().toISOString(),
        proof: this.generateProof()
      }
    });
    
    // Update stats
    this.totalMinted += token.value;
    this.inCirculation += token.value;
    this.mintingHistory.push(token);
    
    // Discharge capacitor
    this.dischargeCapacitor();
    
    // Trigger domino cascade
    this.triggerCascade(token);
    
    return {
      success: true,
      token,
      stats: this.getStats()
    };
  }

  createToken({ type, amount, owner, trigger, metadata }) {
    return {
      id: this.generateTokenId(),
      type,
      emoji: this.config.token_emoji,
      value: amount,
      owner,
      trigger,
      timestamp: new Date().toISOString(),
      metadata,
      immutable: true,
      blockchain_backed: this.config.blockchain_backed
    };
  }

  validateMintRequest(request) {
    if (!request.trigger || !request.owner) return false;
    if (!this.config.minting_triggers[request.trigger]) return false;
    if (!this.config.minting_triggers[request.trigger].enabled) return false;
    return true;
  }

  checkCapacitorCharge(trigger) {
    const threshold = this.config.capacitor_physics.threshold;
    return this.capacitorCharge >= threshold;
  }

  chargeCapacitor(activity) {
    // Activity charges the mint capacitor
    this.capacitorCharge = Math.min(100, this.capacitorCharge + activity);
  }

  dischargeCapacitor() {
    // Minting discharges the capacitor
    this.capacitorCharge = Math.max(0, this.capacitorCharge - 20);
  }

  generateTokenId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `ALC_${timestamp}_${random}`;
  }

  generateProof() {
    return {
      shows: this.config.minting_proof.shows,
      proves: this.config.minting_proof.proves,
      evidence: this.config.minting_proof.evidence,
      timestamp: new Date().toISOString(),
      signature: this.generateSignature()
    };
  }

  generateSignature() {
    return `sig_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  triggerCascade(token) {
    // Domino cascade: minting triggers economy updates
    console.log('🧲 Domino Cascade: Token minting triggers economy updates');
    // This would notify other systems in a real implementation
  }

  getStats() {
    return {
      total_minted: this.totalMinted,
      in_circulation: this.inCirculation,
      mint_rate: this.calculateMintRate(),
      capacitor_charge: this.capacitorCharge,
      recent_mints: this.mintingHistory.slice(-10)
    };
  }

  calculateMintRate() {
    // Calculate mints per hour based on recent history
    const oneHourAgo = Date.now() - 3600000;
    const recentMints = this.mintingHistory.filter(
      t => new Date(t.timestamp).getTime() > oneHourAgo
    );
    return recentMints.length;
  }

  // Auto-charge capacitor based on activity
  registerActivity(activityLevel = 5) {
    this.chargeCapacitor(activityLevel);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ALCMinter;
}
