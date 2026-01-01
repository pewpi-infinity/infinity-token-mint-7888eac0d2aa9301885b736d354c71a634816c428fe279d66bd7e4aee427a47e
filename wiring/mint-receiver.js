// Mint Receiver
// Receives mint requests from various sources via hydrogen bond wiring

class MintReceiver {
  constructor(config) {
    this.config = config;
    this.endpoints = config.receives_from;
    this.requestQueue = [];
    this.receivedCount = 0;
  }

  // Receive mint request
  async receiveRequest(request) {
    const validated = this.validateRequest(request);
    
    if (!validated.valid) {
      return {
        success: false,
        error: validated.error
      };
    }

    const enrichedRequest = {
      ...request,
      received_at: new Date().toISOString(),
      request_id: this.generateRequestId(),
      source_validated: true,
      priority: this.getPriority(request.source)
    };

    this.requestQueue.push(enrichedRequest);
    this.receivedCount++;

    return {
      success: true,
      request_id: enrichedRequest.request_id,
      queue_position: this.requestQueue.length
    };
  }

  // Validate incoming request
  validateRequest(request) {
    if (!request.source) {
      return { valid: false, error: 'Missing source' };
    }

    const endpoint = this.endpoints.find(e => e.source === request.source);
    if (!endpoint) {
      return { valid: false, error: `Unknown source: ${request.source}` };
    }

    if (!request.trigger && !request.type) {
      return { valid: false, error: 'Missing trigger or type' };
    }

    if (!request.owner) {
      return { valid: false, error: 'Missing owner' };
    }

    return { valid: true };
  }

  // Get priority for source
  getPriority(source) {
    const endpoint = this.endpoints.find(e => e.source === source);
    return endpoint?.priority || 'medium';
  }

  // Get next request from queue (priority-based)
  getNextRequest() {
    if (this.requestQueue.length === 0) {
      return null;
    }

    // Sort by priority: high > medium > low
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    this.requestQueue.sort((a, b) => {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    return this.requestQueue.shift();
  }

  // Receive from dash-hub
  async receiveDashHub(data) {
    return await this.receiveRequest({
      source: 'dash-hub',
      trigger: data.trigger || 'user_contribution',
      owner: data.owner,
      amount: data.amount,
      metadata: data.metadata
    });
  }

  // Receive from Banksy (art created)
  async receiveBanksy(data) {
    return await this.receiveRequest({
      source: 'banksy',
      trigger: 'purchase',
      type: 'ART',
      owner: data.artist,
      amount: 1,
      metadata: {
        art_id: data.art_id,
        art_title: data.title,
        created_at: data.created_at
      }
    });
  }

  // Receive from commerce (purchase made)
  async receiveCommerce(data) {
    return await this.receiveRequest({
      source: 'commerce',
      trigger: 'purchase',
      type: 'RECEIPT',
      owner: data.buyer,
      amount: 1,
      metadata: {
        purchase_id: data.purchase_id,
        amount_usd: data.amount,
        items: data.items
      }
    });
  }

  // Receive value data from pricing engine
  async receivePricingEngine(data) {
    // This doesn't create tokens, just updates values
    return {
      success: true,
      message: 'Value data received',
      data
    };
  }

  generateRequestId() {
    return `REQ_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  getQueueStats() {
    const byPriority = {
      high: this.requestQueue.filter(r => r.priority === 'high').length,
      medium: this.requestQueue.filter(r => r.priority === 'medium').length,
      low: this.requestQueue.filter(r => r.priority === 'low').length
    };

    return {
      queue_length: this.requestQueue.length,
      by_priority: byPriority,
      total_received: this.receivedCount
    };
  }

  clearQueue() {
    const cleared = this.requestQueue.length;
    this.requestQueue = [];
    return { cleared };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MintReceiver;
}
