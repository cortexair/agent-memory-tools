const fs = require('fs');
const path = require('path');
const readline = require('readline');

class MemoryManager {
  constructor(memoryDir = null) {
    this.memoryDir = memoryDir || process.env.MEMORY_DIR || 
      path.join(process.env.HOME, '.openclaw/workspace/memory');
  }

  getDateString(date = new Date()) {
    return date.toISOString().split('T')[0];
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
      content: fs.readFileSync(todayPath, 'utf8')
    };
  }

  add(text) {
    this.ensureDir();
    const todayPath = this.getTodayPath();
    
    if (!fs.existsSync(todayPath)) {
      this.today(); // Create file first
    }
    
    const entry = `\n- **${this.getTimestamp()}** — ${text}\n`;
    fs.appendFileSync(todayPath, entry);
    
    return {
      path: todayPath,
      entry: entry.trim()
    };
  }

  search(query) {
    this.ensureDir();
    const results = [];
    const files = fs.readdirSync(this.memoryDir)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse();
    
    const queryLower = query.toLowerCase();
    
    for (const file of files) {
      const filePath = path.join(this.memoryDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes(queryLower)) {
          results.push({
            file: file,
            line: idx + 1,
            text: line.trim()
          });
        }
      });
    }
    
    return results;
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
      
      // Count entries (lines starting with "- **")
      const entries = lines.filter(l => l.trim().startsWith('- **')).length;
      
      // Get first heading after date
      const headings = lines.filter(l => l.startsWith('## ')).map(l => l.slice(3));
      
      summaries.push({
        date: file.replace('.md', ''),
        entries,
        sections: headings
      });
    }
    
    return summaries;
  }

  list() {
    this.ensureDir();
    return fs.readdirSync(this.memoryDir)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse();
  }
}

module.exports = { MemoryManager };
