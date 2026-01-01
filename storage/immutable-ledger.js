// Immutable Ledger
// Permanent, unchangeable record of all minted tokens

class ImmutableLedger {
  constructor() {
    this.ledger = [];
    this.merkleRoots = [];
    this.sealed = false;
  }

  // Add token to immutable ledger
  addToken(token) {
    if (!token.immutable) {
      throw new Error('Only immutable tokens can be added to ledger');
    }

    const entry = {
      index: this.ledger.length,
      token_id: token.id,
      token_type: token.type,
      owner: token.owner,
      value: token.value,
      timestamp: new Date().toISOString(),
      added_at: Date.now(),
      hash: this.calculateHash(token),
      previous_hash: this.ledger.length > 0 ? this.ledger[this.ledger.length - 1].hash : '0',
      immutable: true,
      sealed: false
    };

    this.ledger.push(entry);

    // Create Merkle root every 100 entries
    if (this.ledger.length % 100 === 0) {
      this.createMerkleRoot();
    }

    return entry;
  }

  calculateHash(token) {
    const data = `${token.id}${token.type}${token.owner}${token.value}${token.timestamp}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `0x${Math.abs(hash).toString(16).padStart(16, '0')}`;
  }

  // Create Merkle root for current batch
  createMerkleRoot() {
    const lastIndex = this.ledger.length;
    const batchStart = Math.max(0, lastIndex - 100);
    const batch = this.ledger.slice(batchStart, lastIndex);
    
    const merkleRoot = {
      root_id: `MERKLE_${Date.now()}`,
      batch_start: batchStart,
      batch_end: lastIndex - 1,
      batch_size: batch.length,
      timestamp: new Date().toISOString(),
      root_hash: this.calculateBatchHash(batch),
      sealed: true,
      immutable: true
    };

    this.merkleRoots.push(merkleRoot);

    // Mark entries as sealed
    for (let i = batchStart; i < lastIndex; i++) {
      this.ledger[i].sealed = true;
      this.ledger[i].merkle_root = merkleRoot.root_id;
    }

    return merkleRoot;
  }

  calculateBatchHash(batch) {
    const hashes = batch.map(entry => entry.hash).join('');
    let hash = 0;
    for (let i = 0; i < hashes.length; i++) {
      const char = hashes.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `0x${Math.abs(hash).toString(16).padStart(32, '0')}`;
  }

  // Verify ledger integrity
  verifyIntegrity() {
    const results = {
      valid: true,
      total_entries: this.ledger.length,
      verified_entries: 0,
      errors: []
    };

    for (let i = 1; i < this.ledger.length; i++) {
      const current = this.ledger[i];
      const previous = this.ledger[i - 1];

      if (current.previous_hash !== previous.hash) {
        results.valid = false;
        results.errors.push({
          index: i,
          error: 'Hash chain broken',
          expected: previous.hash,
          actual: current.previous_hash
        });
      } else {
        results.verified_entries++;
      }
    }

    return results;
  }

  // Get token by ID
  getToken(tokenId) {
    return this.ledger.find(entry => entry.token_id === tokenId);
  }

  // Query ledger
  query({ owner, type, fromIndex, toIndex }) {
    let results = [...this.ledger];

    if (owner) {
      results = results.filter(e => e.owner === owner);
    }

    if (type) {
      results = results.filter(e => e.token_type === type);
    }

    if (fromIndex !== undefined) {
      results = results.filter(e => e.index >= fromIndex);
    }

    if (toIndex !== undefined) {
      results = results.filter(e => e.index <= toIndex);
    }

    return results;
  }

  // Get ledger stats
  getStats() {
    const totalValue = this.ledger.reduce((sum, e) => sum + e.value, 0);
    const typeCount = {};
    
    this.ledger.forEach(e => {
      typeCount[e.token_type] = (typeCount[e.token_type] || 0) + 1;
    });

    return {
      total_entries: this.ledger.length,
      total_value: totalValue,
      merkle_roots: this.merkleRoots.length,
      sealed_entries: this.ledger.filter(e => e.sealed).length,
      by_type: typeCount,
      integrity: this.verifyIntegrity().valid
    };
  }

  // Export ledger (for backup)
  exportLedger() {
    return {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      ledger: this.ledger,
      merkle_roots: this.merkleRoots,
      stats: this.getStats()
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ImmutableLedger;
}
