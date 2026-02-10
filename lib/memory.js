const fs = require('fs');
const path = require('path');
const os = require('os');

class MemoryManager {
  constructor(memoryDir = null) {
    this.memoryDir = memoryDir || process.env.MEMORY_DIR || 
      path.join(process.env.HOME || os.homedir(), '.openclaw/workspace/memory');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Date Utilities
  // ─────────────────────────────────────────────────────────────────────────────

  getDateString(date = new Date()) {
    return date.toISOString().split('T')[0];
  }

  parseDate(dateStr) {
    // Handle relative dates: today, yesterday, -N (days ago)
    if (dateStr === null || dateStr === undefined) return null;
    dateStr = String(dateStr); // Ensure string
    const now = new Date();
    
    if (dateStr === 'today') {
      return this.getDateString(now);
    }
    
    if (dateStr === 'yesterday') {
      now.setDate(now.getDate() - 1);
      return this.getDateString(now);
    }
    
    // -N days ago
    const daysAgoMatch = dateStr.match(/^-(\d+)$/);
    if (daysAgoMatch) {
      now.setDate(now.getDate() - parseInt(daysAgoMatch[1]));
      return this.getDateString(now);
    }
    
    // Partial dates: 02-10 or 10 (assumes current year/month)
    const partialMatch = dateStr.match(/^(\d{1,2})(?:-(\d{1,2}))?$/);
    if (partialMatch) {
      const year = now.getFullYear();
      const month = partialMatch[2] 
        ? String(partialMatch[1]).padStart(2, '0')
        : String(now.getMonth() + 1).padStart(2, '0');
      const day = partialMatch[2] 
        ? String(partialMatch[2]).padStart(2, '0')
        : String(partialMatch[1]).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Full date: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    return null;
  }

  isDateInRange(dateStr, from, to) {
    if (!dateStr) return false;
    if (from && dateStr < from) return false;
    if (to && dateStr > to) return false;
    return true;
  }

  getTodayPath() {
    return path.join(this.memoryDir, `${this.getDateString()}.md`);
  }

  getTimestamp() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  }

  ensureDir() {
    if (!fs.existsSync(this.memoryDir)) {
      fs.mkdirSync(this.memoryDir, { recursive: true });
      return true;
    }
    return false;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Core Operations
  // ─────────────────────────────────────────────────────────────────────────────

  init() {
    const created = this.ensureDir();
    const todayPath = this.getTodayPath();
    
    if (!fs.existsSync(todayPath)) {
      const template = `# ${this.getDateString()}\n\n## Timeline\n\n## Notes\n\n`;
      fs.writeFileSync(todayPath, template);
    }
    
    return { 
      created, 
      memoryDir: this.memoryDir,
      todayFile: todayPath
    };
  }

  today() {
    this.ensureDir();
    const todayPath = this.getTodayPath();
    
    if (!fs.existsSync(todayPath)) {
      const template = `# ${this.getDateString()}\n\n## Timeline\n\n## Notes\n\n`;
      fs.writeFileSync(todayPath, template);
    }
    
    return {
      path: todayPath,
      content: fs.readFileSync(todayPath, 'utf8'),
      date: this.getDateString()
    };
  }

  add(text, options = {}) {
    this.ensureDir();
    const todayPath = this.getTodayPath();
    
    if (!fs.existsSync(todayPath)) {
      this.today();
    }
    
    // Extract tags from text
    const tags = this.extractTags(text);
    
    const timestamp = options.timestamp || this.getTimestamp();
    const entry = `\n- **${timestamp}** — ${text}\n`;
    fs.appendFileSync(todayPath, entry);
    
    return {
      path: todayPath,
      entry: entry.trim(),
      timestamp,
      tags,
      date: this.getDateString()
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Search with Date Ranges
  // ─────────────────────────────────────────────────────────────────────────────

  search(query, options = {}) {
    this.ensureDir();
    const results = [];
    
    const { from, to, tags, limit } = options;
    const fromDate = from ? this.parseDate(from) : null;
    const toDate = to ? this.parseDate(to) : null;
    const tagFilters = tags ? (Array.isArray(tags) ? tags : [tags]) : [];
    
    let files = fs.readdirSync(this.memoryDir)
      .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.md$/))
      .sort()
      .reverse();
    
    // Filter by date range
    if (fromDate || toDate) {
      files = files.filter(f => {
        const fileDate = f.replace('.md', '');
        return this.isDateInRange(fileDate, fromDate, toDate);
      });
    }
    
    const queryLower = query ? query.toLowerCase() : null;
    
    for (const file of files) {
      const fileDate = file.replace('.md', '');
      const filePath = path.join(this.memoryDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, idx) => {
        // Skip empty lines and headings for entry matching
        if (!line.trim()) return;
        
        // Query match
        const queryMatch = !queryLower || line.toLowerCase().includes(queryLower);
        
        // Tag match
        const lineTags = this.extractTags(line);
        const tagMatch = tagFilters.length === 0 || 
          tagFilters.some(t => lineTags.includes(t.toLowerCase().replace(/^#/, '')));
        
        if (queryMatch && tagMatch) {
          results.push({
            file,
            date: fileDate,
            line: idx + 1,
            text: line.trim(),
            tags: lineTags
          });
        }
      });
      
      if (limit && results.length >= limit) break;
    }
    
    return limit ? results.slice(0, limit) : results;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Tag Support
  // ─────────────────────────────────────────────────────────────────────────────

  extractTags(text) {
    const tagRegex = /#([a-zA-Z][a-zA-Z0-9_-]*)/g;
    const tags = [];
    let match;
    while ((match = tagRegex.exec(text)) !== null) {
      tags.push(match[1].toLowerCase());
    }
    return [...new Set(tags)];
  }

  getTags() {
    this.ensureDir();
    const tagCounts = {};
    
    const files = fs.readdirSync(this.memoryDir)
      .filter(f => f.endsWith('.md'));
    
    for (const file of files) {
      const content = fs.readFileSync(path.join(this.memoryDir, file), 'utf8');
      const tags = this.extractTags(content);
      for (const tag of tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
    
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Statistics & Analytics
  // ─────────────────────────────────────────────────────────────────────────────

  stats() {
    this.ensureDir();
    
    const files = fs.readdirSync(this.memoryDir)
      .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.md$/))
      .sort();
    
    if (files.length === 0) {
      return {
        totalFiles: 0,
        totalEntries: 0,
        totalWords: 0,
        dateRange: null,
        averageEntriesPerDay: 0,
        averageWordsPerEntry: 0,
        mostActiveDay: null,
        streakCurrent: 0,
        streakLongest: 0,
        tags: []
      };
    }
    
    let totalEntries = 0;
    let totalWords = 0;
    const dailyEntries = [];
    const tagCounts = {};
    
    for (const file of files) {
      const content = fs.readFileSync(path.join(this.memoryDir, file), 'utf8');
      const lines = content.split('\n');
      
      // Count entries (lines starting with "- **")
      const entries = lines.filter(l => l.trim().startsWith('- **')).length;
      totalEntries += entries;
      
      // Word count
      const words = content.split(/\s+/).filter(w => w.length > 0).length;
      totalWords += words;
      
      dailyEntries.push({ date: file.replace('.md', ''), entries, words });
      
      // Tags
      const tags = this.extractTags(content);
      for (const tag of tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
    
    // Find most active day
    const mostActive = dailyEntries.reduce((max, d) => 
      d.entries > max.entries ? d : max, dailyEntries[0]);
    
    // Calculate streaks
    const { current: streakCurrent, longest: streakLongest } = this.calculateStreaks(files);
    
    // Top tags
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));
    
    return {
      totalFiles: files.length,
      totalEntries,
      totalWords,
      dateRange: {
        from: files[0].replace('.md', ''),
        to: files[files.length - 1].replace('.md', '')
      },
      averageEntriesPerDay: Math.round((totalEntries / files.length) * 10) / 10,
      averageWordsPerEntry: totalEntries > 0 
        ? Math.round(totalWords / totalEntries) 
        : 0,
      mostActiveDay: mostActive,
      streakCurrent,
      streakLongest,
      tags: topTags
    };
  }

  calculateStreaks(files) {
    const dates = files.map(f => f.replace('.md', '')).sort().reverse();
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;
    
    const today = this.getDateString();
    const yesterday = this.getDateString(new Date(Date.now() - 86400000));
    
    // Current streak
    if (dates[0] === today || dates[0] === yesterday) {
      currentStreak = 1;
      for (let i = 1; i < dates.length; i++) {
        const curr = new Date(dates[i - 1]);
        const prev = new Date(dates[i]);
        const diffDays = Math.round((curr - prev) / 86400000);
        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
    
    // Longest streak
    for (let i = 1; i < dates.length; i++) {
      const curr = new Date(dates[i - 1]);
      const prev = new Date(dates[i]);
      const diffDays = Math.round((curr - prev) / 86400000);
      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
    
    return { current: currentStreak, longest: longestStreak };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Export & Backup
  // ─────────────────────────────────────────────────────────────────────────────

  export(options = {}) {
    this.ensureDir();
    
    const { format = 'json', from, to, output } = options;
    const fromDate = from ? this.parseDate(from) : null;
    const toDate = to ? this.parseDate(to) : null;
    
    let files = fs.readdirSync(this.memoryDir)
      .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.md$/))
      .sort();
    
    if (fromDate || toDate) {
      files = files.filter(f => {
        const fileDate = f.replace('.md', '');
        return this.isDateInRange(fileDate, fromDate, toDate);
      });
    }
    
    const memories = [];
    
    for (const file of files) {
      const date = file.replace('.md', '');
      const content = fs.readFileSync(path.join(this.memoryDir, file), 'utf8');
      const entries = this.parseEntries(content);
      const tags = this.extractTags(content);
      
      memories.push({
        date,
        file,
        entries,
        tags,
        raw: format === 'full' ? content : undefined
      });
    }
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      memoryDir: this.memoryDir,
      dateRange: files.length > 0 ? {
        from: files[0].replace('.md', ''),
        to: files[files.length - 1].replace('.md', '')
      } : null,
      totalFiles: files.length,
      memories
    };
    
    const outputStr = JSON.stringify(exportData, null, 2);
    
    if (output) {
      fs.writeFileSync(output, outputStr);
      return { written: output, size: outputStr.length, files: files.length };
    }
    
    return exportData;
  }

  parseEntries(content) {
    const lines = content.split('\n');
    const entries = [];
    
    for (const line of lines) {
      const match = line.match(/^- \*\*(\d{2}:\d{2})\*\* — (.+)$/);
      if (match) {
        entries.push({
          time: match[1],
          text: match[2],
          tags: this.extractTags(match[2])
        });
      }
    }
    
    return entries;
  }

  backup(options = {}) {
    const { output } = options;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupName = output || `memory-backup-${timestamp}.tar.gz`;
    
    // Use tar to create compressed backup
    const { execSync } = require('child_process');
    
    try {
      execSync(`tar -czf "${backupName}" -C "${path.dirname(this.memoryDir)}" "${path.basename(this.memoryDir)}"`, {
        stdio: 'pipe'
      });
      
      const stats = fs.statSync(backupName);
      return {
        path: path.resolve(backupName),
        size: stats.size,
        sizeHuman: this.formatBytes(stats.size)
      };
    } catch (error) {
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // View & Navigation
  // ─────────────────────────────────────────────────────────────────────────────

  show(dateStr) {
    const date = this.parseDate(dateStr);
    if (!date) {
      throw new Error(`Invalid date: ${dateStr}`);
    }
    
    const filePath = path.join(this.memoryDir, `${date}.md`);
    
    if (!fs.existsSync(filePath)) {
      return { date, exists: false, path: filePath, content: null };
    }
    
    return {
      date,
      exists: true,
      path: filePath,
      content: fs.readFileSync(filePath, 'utf8')
    };
  }

  summary(days = 7) {
    this.ensureDir();
    const files = fs.readdirSync(this.memoryDir)
      .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.md$/))
      .sort()
      .reverse()
      .slice(0, days);
    
    const summaries = [];
    
    for (const file of files) {
      const filePath = path.join(this.memoryDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      const entries = lines.filter(l => l.trim().startsWith('- **')).length;
      const headings = lines.filter(l => l.startsWith('## ')).map(l => l.slice(3));
      const words = content.split(/\s+/).filter(w => w.length > 0).length;
      const tags = this.extractTags(content);
      
      summaries.push({
        date: file.replace('.md', ''),
        entries,
        words,
        sections: headings,
        tags
      });
    }
    
    return summaries;
  }

  list(options = {}) {
    this.ensureDir();
    const { from, to, limit } = options;
    const fromDate = from ? this.parseDate(from) : null;
    const toDate = to ? this.parseDate(to) : null;
    
    let files = fs.readdirSync(this.memoryDir)
      .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.md$/))
      .sort()
      .reverse();
    
    if (fromDate || toDate) {
      files = files.filter(f => {
        const fileDate = f.replace('.md', '');
        return this.isDateInRange(fileDate, fromDate, toDate);
      });
    }
    
    if (limit) {
      files = files.slice(0, limit);
    }
    
    return files;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Edit & Append
  // ─────────────────────────────────────────────────────────────────────────────

  append(dateStr, text) {
    const date = this.parseDate(dateStr);
    if (!date) {
      throw new Error(`Invalid date: ${dateStr}`);
    }
    
    this.ensureDir();
    const filePath = path.join(this.memoryDir, `${date}.md`);
    
    if (!fs.existsSync(filePath)) {
      const template = `# ${date}\n\n## Timeline\n\n## Notes\n\n`;
      fs.writeFileSync(filePath, template);
    }
    
    const entry = `\n- **${this.getTimestamp()}** — ${text}\n`;
    fs.appendFileSync(filePath, entry);
    
    return {
      path: filePath,
      entry: entry.trim(),
      date,
      tags: this.extractTags(text)
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Recent entries (for AI integration)
  // ─────────────────────────────────────────────────────────────────────────────

  recent(count = 10) {
    this.ensureDir();
    const results = [];
    
    const files = fs.readdirSync(this.memoryDir)
      .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.md$/))
      .sort()
      .reverse();
    
    for (const file of files) {
      if (results.length >= count) break;
      
      const date = file.replace('.md', '');
      const content = fs.readFileSync(path.join(this.memoryDir, file), 'utf8');
      const entries = this.parseEntries(content);
      
      for (const entry of entries.reverse()) {
        if (results.length >= count) break;
        results.push({
          date,
          ...entry
        });
      }
    }
    
    return results;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Cleanup/Archive old memories
  // ─────────────────────────────────────────────────────────────────────────────

  archive(options = {}) {
    const { olderThan = 90, output } = options;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThan);
    const cutoff = this.getDateString(cutoffDate);
    
    this.ensureDir();
    const files = fs.readdirSync(this.memoryDir)
      .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.md$/))
      .filter(f => f.replace('.md', '') < cutoff)
      .sort();
    
    if (files.length === 0) {
      return { archived: 0, path: null };
    }
    
    // Export to JSON
    const archiveData = this.export({ to: cutoff, format: 'full' });
    const archivePath = output || `memory-archive-before-${cutoff}.json`;
    fs.writeFileSync(archivePath, JSON.stringify(archiveData, null, 2));
    
    // Remove old files
    for (const file of files) {
      fs.unlinkSync(path.join(this.memoryDir, file));
    }
    
    return {
      archived: files.length,
      path: path.resolve(archivePath),
      cutoffDate: cutoff
    };
  }
}

module.exports = { MemoryManager };
