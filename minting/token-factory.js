// Token Factory
// Universal token creation system for all token types

class TokenFactory {
  constructor(rules) {
    this.rules = rules;
    this.tokenTypes = rules.token_types;
    this.ledger = [];
  }

  // Create any type of token
  createToken({ type, owner, value, metadata = {} }) {
    const tokenType = this.tokenTypes[type];
    
    if (!tokenType) {
      throw new Error(`Unknown token type: ${type}`);
    }

    if (!tokenType.mintable) {
      throw new Error(`Token type ${type} is not mintable`);
    }

    const token = {
      id: this.generateUniqueId(type),
      type,
      name: tokenType.name,
      emoji: tokenType.emoji,
      description: tokenType.description,
      timestamp: new Date().toISOString(),
      owner,
      value,
      metadata: {
        ...metadata,
        created_at: new Date().toISOString(),
        factory_version: this.rules.version
      },
      transferable: tokenType.transferable,
      burnable: tokenType.burnable,
      immutable: this.rules.token_structure.immutable
    };

    // Validate token
    if (!this.validateToken(token)) {
      throw new Error('Token validation failed');
    }

    // Add to ledger
    this.ledger.push(token);

    return token;
  }

  // Batch create tokens
  batchCreate(requests) {
    const tokens = [];
    const errors = [];

    for (let i = 0; i < requests.length; i++) {
      try {
        const token = this.createToken(requests[i]);
        tokens.push(token);
      } catch (error) {
        errors.push({ index: i, error: error.message });
      }
    }

    return { tokens, errors };
  }

  validateToken(token) {
    const required = this.rules.token_structure.required_fields;
    
    for (const field of required) {
      if (!token[field]) {
        return false;
      }
    }

    if (this.rules.validation_rules.require_owner && !token.owner) {
      return false;
    }

    if (this.rules.validation_rules.require_metadata && !token.metadata) {
      return false;
    }

    if (token.value < this.rules.validation_rules.min_value) {
      return false;
    }

    if (token.value > this.rules.validation_rules.max_value) {
      return false;
    }

    return true;
  }

  generateUniqueId(type) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const hash = this.simpleHash(`${type}_${timestamp}_${random}`);
    return hash;
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  // Query tokens
  queryTokens({ owner, type, minValue, maxValue }) {
    let results = [...this.ledger];

    if (owner) {
      results = results.filter(t => t.owner === owner);
    }

    if (type) {
      results = results.filter(t => t.type === type);
    }

    if (minValue !== undefined) {
      results = results.filter(t => t.value >= minValue);
    }

    if (maxValue !== undefined) {
      results = results.filter(t => t.value <= maxValue);
    }

    return results;
  }

  // Get token by ID
  getToken(id) {
    return this.ledger.find(t => t.id === id);
  }

  // Get total value by type
  getTotalValue(type) {
    return this.ledger
      .filter(t => t.type === type)
      .reduce((sum, t) => sum + t.value, 0);
  }

  // Get stats
  getStats() {
    const stats = {
      total_tokens: this.ledger.length,
      by_type: {}
    };

    for (const type in this.tokenTypes) {
      const tokens = this.ledger.filter(t => t.type === type);
      stats.by_type[type] = {
        count: tokens.length,
        total_value: tokens.reduce((sum, t) => sum + t.value, 0)
      };
    }

    return stats;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TokenFactory;
}
