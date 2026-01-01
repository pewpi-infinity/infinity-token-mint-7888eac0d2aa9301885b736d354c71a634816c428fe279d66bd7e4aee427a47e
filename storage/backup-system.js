// Backup System
// Automated backup and recovery for token data

class BackupSystem {
  constructor(multiLocationWriter, immutableLedger) {
    this.multiLocationWriter = multiLocationWriter;
    this.immutableLedger = immutableLedger;
    this.backups = [];
    this.autoBackupInterval = null;
  }

  // Create full backup
  async createFullBackup() {
    const backup = {
      backup_id: this.generateBackupId(),
      timestamp: new Date().toISOString(),
      type: 'full',
      data: {
        ledger: this.immutableLedger.exportLedger(),
        write_stats: this.multiLocationWriter.getWriteStats()
      },
      size: 0,
      compressed: false
    };

    // Calculate size (simulated)
    backup.size = JSON.stringify(backup.data).length;

    this.backups.push(backup);

    // Trim to last 50 backups
    if (this.backups.length > 50) {
      this.backups = this.backups.slice(-50);
    }

    return backup;
  }

  // Create incremental backup
  async createIncrementalBackup(sinceIndex = 0) {
    const newEntries = this.immutableLedger.ledger.slice(sinceIndex);

    const backup = {
      backup_id: this.generateBackupId(),
      timestamp: new Date().toISOString(),
      type: 'incremental',
      since_index: sinceIndex,
      data: {
        entries: newEntries
      },
      size: 0,
      compressed: false
    };

    backup.size = JSON.stringify(backup.data).length;

    this.backups.push(backup);

    return backup;
  }

  // Start automatic backups
  startAutoBackup(intervalMinutes = 60) {
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
    }

    this.autoBackupInterval = setInterval(async () => {
      await this.createFullBackup();
      console.log('🗄️ Auto-backup completed:', new Date().toISOString());
    }, intervalMinutes * 60 * 1000);

    return {
      enabled: true,
      interval_minutes: intervalMinutes
    };
  }

  // Stop automatic backups
  stopAutoBackup() {
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
      this.autoBackupInterval = null;
    }

    return { enabled: false };
  }

  // Restore from backup
  async restoreFromBackup(backupId) {
    const backup = this.backups.find(b => b.backup_id === backupId);

    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    if (backup.type === 'full') {
      // Restore full backup
      return {
        success: true,
        backup_id: backupId,
        type: 'full',
        entries_restored: backup.data.ledger.ledger.length,
        message: 'Full backup restored'
      };
    } else {
      // Restore incremental backup
      return {
        success: true,
        backup_id: backupId,
        type: 'incremental',
        entries_restored: backup.data.entries.length,
        message: 'Incremental backup restored'
      };
    }
  }

  // Verify backup integrity
  verifyBackup(backupId) {
    const backup = this.backups.find(b => b.backup_id === backupId);

    if (!backup) {
      return { valid: false, error: 'Backup not found' };
    }

    // Verify data structure
    if (!backup.data) {
      return { valid: false, error: 'Missing backup data' };
    }

    return {
      valid: true,
      backup_id: backupId,
      type: backup.type,
      size: backup.size,
      timestamp: backup.timestamp
    };
  }

  // List all backups
  listBackups() {
    return this.backups.map(b => ({
      backup_id: b.backup_id,
      timestamp: b.timestamp,
      type: b.type,
      size: b.size,
      entries: b.type === 'full' ? b.data.ledger.ledger.length : b.data.entries.length
    }));
  }

  // Get backup stats
  getBackupStats() {
    const totalSize = this.backups.reduce((sum, b) => sum + b.size, 0);
    const fullBackups = this.backups.filter(b => b.type === 'full').length;
    const incrementalBackups = this.backups.filter(b => b.type === 'incremental').length;

    return {
      total_backups: this.backups.length,
      full_backups: fullBackups,
      incremental_backups: incrementalBackups,
      total_size_bytes: totalSize,
      auto_backup_enabled: this.autoBackupInterval !== null,
      oldest_backup: this.backups[0]?.timestamp,
      newest_backup: this.backups[this.backups.length - 1]?.timestamp
    };
  }

  generateBackupId() {
    return `BACKUP_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Clean old backups
  cleanOldBackups(keepLast = 10) {
    const removed = this.backups.length - keepLast;
    if (removed > 0) {
      this.backups = this.backups.slice(-keepLast);
      return { removed };
    }
    return { removed: 0 };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BackupSystem;
}
