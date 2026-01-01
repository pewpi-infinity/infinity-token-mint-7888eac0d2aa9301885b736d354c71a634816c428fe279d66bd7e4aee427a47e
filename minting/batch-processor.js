// Batch Processor
// Handles batch minting operations efficiently

class BatchProcessor {
  constructor(tokenFactory, alcMinter) {
    this.tokenFactory = tokenFactory;
    this.alcMinter = alcMinter;
    this.queue = [];
    this.processing = false;
    this.maxBatchSize = 100;
    this.batchHistory = [];
  }

  // Add mint request to queue
  addToQueue(request) {
    this.queue.push({
      ...request,
      queued_at: new Date().toISOString(),
      status: 'queued'
    });

    return {
      success: true,
      position: this.queue.length,
      estimated_wait: this.queue.length * 0.1 // seconds
    };
  }

  // Process batch of mints
  async processBatch(batchSize = null) {
    if (this.processing) {
      return { error: 'Batch already processing' };
    }

    const size = Math.min(
      batchSize || this.maxBatchSize,
      this.queue.length
    );

    if (size === 0) {
      return { message: 'Queue is empty' };
    }

    this.processing = true;
    const batch = this.queue.splice(0, size);
    const results = {
      batch_id: this.generateBatchId(),
      timestamp: new Date().toISOString(),
      size,
      tokens: [],
      errors: []
    };

    for (let i = 0; i < batch.length; i++) {
      const request = batch[i];
      try {
        let token;
        
        if (request.type === 'ALC' || !request.type) {
          // Use ALC minter
          const result = await this.alcMinter.mint(request);
          if (result.success) {
            token = result.token;
          } else {
            throw new Error(result.error);
          }
        } else {
          // Use general token factory
          token = this.tokenFactory.createToken(request);
        }

        results.tokens.push(token);
      } catch (error) {
        results.errors.push({
          index: i,
          request,
          error: error.message
        });
      }
    }

    this.processing = false;
    this.batchHistory.push(results);

    // Trim history to last 50 batches
    if (this.batchHistory.length > 50) {
      this.batchHistory = this.batchHistory.slice(-50);
    }

    return results;
  }

  // Process queue automatically
  async autoProcess() {
    if (this.queue.length >= 10) {
      return await this.processBatch(10);
    }
    return { message: 'Queue too small for auto-processing' };
  }

  // Mushroom boost - process entire queue instantly
  async mushroomBoost() {
    if (this.queue.length === 0) {
      return { message: 'Queue is empty' };
    }

    console.log('🍄 Mushroom Boost Activated! Processing entire queue...');
    
    const result = await this.processBatch(this.queue.length);
    
    return {
      ...result,
      boost: 'mushroom',
      message: '🍄 Mama mia! Batch boost complete!'
    };
  }

  generateBatchId() {
    return `BATCH_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  getQueueStatus() {
    return {
      queue_length: this.queue.length,
      processing: this.processing,
      oldest_request: this.queue[0]?.queued_at,
      recent_batches: this.batchHistory.slice(-5).map(b => ({
        batch_id: b.batch_id,
        timestamp: b.timestamp,
        tokens_minted: b.tokens.length,
        errors: b.errors.length
      }))
    };
  }

  clearQueue() {
    const cleared = this.queue.length;
    this.queue = [];
    return { cleared };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BatchProcessor;
}
