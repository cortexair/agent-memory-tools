#!/usr/bin/env node

const { MemoryManager } = require('../lib/memory.js');

const args = process.argv.slice(2);
const command = args[0];
const mem = new MemoryManager(process.env.MEMORY_DIR);

// ─────────────────────────────────────────────────────────────────────────────
// Color helpers (no dependencies)
// ─────────────────────────────────────────────────────────────────────────────

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

const c = (str, ...styles) => {
  if (!process.stdout.isTTY) return str;
  return styles.map(s => colors[s] || '').join('') + str + colors.reset;
};

// ─────────────────────────────────────────────────────────────────────────────
// Argument parsing helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseArgs(args) {
  const opts = {};
  const positional = [];
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      if (value !== undefined) {
        opts[key] = value;
      } else if (args[i + 1] && !args[i + 1].startsWith('-')) {
        opts[key] = args[++i];
      } else {
        opts[key] = true;
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      const key = arg.slice(1);
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        opts[key] = args[++i];
      } else {
        opts[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  
  return { opts, positional };
}

// ─────────────────────────────────────────────────────────────────────────────
// Usage
// ─────────────────────────────────────────────────────────────────────────────

function usage() {
  console.log(`
${c('mem', 'bold', 'cyan')} - Agent Memory Tools ${c('v0.2.0', 'dim')}

${c('USAGE', 'bold')}
  mem <command> [options]

${c('CORE COMMANDS', 'bold')}
  ${c('init', 'green')}                    Initialize memory directory
  ${c('today', 'green')}                   Show/create today's memory file
  ${c('add', 'green')} <text>              Add timestamped entry to today
  ${c('show', 'green')} <date>             Show memory for specific date

${c('SEARCH & DISCOVERY', 'bold')}
  ${c('search', 'green')} <query>          Search across all memory files
      --from <date>       Start date (YYYY-MM-DD, -N, today, yesterday)
      --to <date>         End date
      --tag <tag>         Filter by #tag
      --limit <n>         Max results
  ${c('recent', 'green')} [n]              Show n most recent entries (default: 10)
  ${c('tags', 'green')}                    List all tags with counts

${c('ANALYTICS', 'bold')}
  ${c('summary', 'green')} [days]          Summary of recent days (default: 7)
  ${c('stats', 'green')}                   Memory statistics and analytics
  ${c('list', 'green')}                    List all memory files
      --from/--to         Filter by date range
      --limit <n>         Max files

${c('EXPORT & BACKUP', 'bold')}
  ${c('export', 'green')}                  Export memories to JSON
      --from/--to         Filter by date range
      --output <file>     Output file path
  ${c('backup', 'green')}                  Create compressed backup (tar.gz)
      --output <file>     Output file path
  ${c('archive', 'green')}                 Archive and remove old memories
      --older-than <days> Days threshold (default: 90)
      --output <file>     Archive file path

${c('DATE FORMATS', 'bold')}
  YYYY-MM-DD              Full date (2026-02-10)
  MM-DD                   Current year (02-10)
  DD                      Current month (10)
  today                   Today's date
  yesterday               Yesterday's date
  -N                      N days ago (-7)

${c('ENVIRONMENT', 'bold')}
  MEMORY_DIR              Override default memory directory
                          ${c('(default: ~/.openclaw/workspace/memory)', 'dim')}

${c('EXAMPLES', 'bold')}
  mem add "Deployed new feature #work #deploy"
  mem search deploy --from -7 --to today
  mem search --tag work --limit 20
  mem show yesterday
  mem export --from 2026-01-01 --output jan-memories.json
  mem stats
`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────────────────────

const { opts, positional } = parseArgs(args.slice(1));

switch (command) {
  case 'init': {
    const result = mem.init();
    if (result.created) {
      console.log(`${c('✓', 'green')} Created memory directory: ${c(result.memoryDir, 'cyan')}`);
    } else {
      console.log(`${c('✓', 'green')} Memory directory exists: ${c(result.memoryDir, 'cyan')}`);
    }
    console.log(`${c('✓', 'green')} Today's file: ${c(result.todayFile, 'cyan')}`);
    break;
  }

  case 'today': {
    const result = mem.today();
    console.log(`${c('📅', 'yellow')} ${c(result.date, 'bold')} ${c(result.path, 'dim')}\n`);
    console.log(result.content);
    break;
  }

  case 'show': {
    const dateStr = positional[0];
    if (!dateStr) {
      console.error(`${c('Error:', 'red')} No date provided`);
      console.log('Usage: mem show <date>');
      process.exit(1);
    }
    
    try {
      const result = mem.show(dateStr);
      if (!result.exists) {
        console.log(`${c('📅', 'yellow')} ${c(result.date, 'bold')} — ${c('No entries', 'dim')}`);
      } else {
        console.log(`${c('📅', 'yellow')} ${c(result.date, 'bold')} ${c(result.path, 'dim')}\n`);
        console.log(result.content);
      }
    } catch (e) {
      console.error(`${c('Error:', 'red')} ${e.message}`);
      process.exit(1);
    }
    break;
  }

  case 'add': {
    const text = positional.join(' ');
    if (!text) {
      console.error(`${c('Error:', 'red')} No text provided`);
      console.log('Usage: mem add <text>');
      process.exit(1);
    }
    const result = mem.add(text);
    console.log(`${c('✓', 'green')} Added to ${c(result.date, 'cyan')}:`);
    console.log(`  ${result.entry}`);
    if (result.tags.length > 0) {
      console.log(`  ${c('Tags:', 'dim')} ${result.tags.map(t => c('#' + t, 'magenta')).join(' ')}`);
    }
    break;
  }

  case 'search': {
    const query = positional.join(' ') || null;
    const searchOpts = {
      from: opts.from || opts.f,
      to: opts.to || opts.t,
      tags: opts.tag,
      limit: opts.limit ? parseInt(opts.limit) : null
    };
    
    if (!query && !searchOpts.tags) {
      console.error(`${c('Error:', 'red')} No search query or --tag provided`);
      console.log('Usage: mem search <query> [--from date] [--to date] [--tag tag] [--limit n]');
      process.exit(1);
    }
    
    const results = mem.search(query, searchOpts);
    
    if (results.length === 0) {
      console.log(`No results found${query ? ` for "${query}"` : ''}`);
    } else {
      console.log(`${c('Found', 'green')} ${c(String(results.length), 'bold')} ${c('result(s)', 'green')}${query ? ` for "${query}"` : ''}:\n`);
      
      let currentDate = null;
      for (const r of results) {
        if (r.date !== currentDate) {
          if (currentDate) console.log('');
          console.log(`${c('📅', 'yellow')} ${c(r.date, 'bold')}`);
          currentDate = r.date;
        }
        
        // Highlight query in results
        let text = r.text;
        if (query) {
          const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
          text = text.replace(regex, c('$1', 'yellow', 'bold'));
        }
        
        // Highlight tags
        text = text.replace(/#([a-zA-Z][a-zA-Z0-9_-]*)/g, c('#$1', 'magenta'));
        
        console.log(`   ${c(`L${r.line}`, 'dim')} ${text}`);
      }
    }
    break;
  }

  case 'recent': {
    const count = parseInt(positional[0]) || 10;
    const results = mem.recent(count);
    
    if (results.length === 0) {
      console.log('No recent entries found');
    } else {
      console.log(`${c('🕐', 'cyan')} ${c('Recent Entries', 'bold')} (${results.length})\n`);
      
      let currentDate = null;
      for (const r of results) {
        if (r.date !== currentDate) {
          if (currentDate) console.log('');
          console.log(`${c('📅', 'yellow')} ${c(r.date, 'bold')}`);
          currentDate = r.date;
        }
        
        let text = r.text.replace(/#([a-zA-Z][a-zA-Z0-9_-]*)/g, c('#$1', 'magenta'));
        console.log(`   ${c(r.time, 'cyan')} ${text}`);
      }
    }
    break;
  }

  case 'tags': {
    const tags = mem.getTags();
    
    if (tags.length === 0) {
      console.log('No tags found');
    } else {
      console.log(`${c('🏷️', 'magenta')} ${c('Tags', 'bold')} (${tags.length})\n`);
      
      const maxCount = Math.max(...tags.map(t => t.count));
      const maxLen = String(maxCount).length;
      
      for (const { tag, count } of tags) {
        const bar = '█'.repeat(Math.ceil((count / maxCount) * 20));
        console.log(`  ${c('#' + tag, 'magenta').padEnd(25 + (process.stdout.isTTY ? 9 : 0))} ${String(count).padStart(maxLen)} ${c(bar, 'blue')}`);
      }
    }
    break;
  }

  case 'stats': {
    const stats = mem.stats();
    
    console.log(`${c('📊', 'blue')} ${c('Memory Statistics', 'bold')}\n`);
    
    if (stats.totalFiles === 0) {
      console.log('No memory files found. Run `mem init` to get started.');
      break;
    }
    
    console.log(`  ${c('Total Files:', 'cyan').padEnd(25)} ${c(String(stats.totalFiles), 'bold')}`);
    console.log(`  ${c('Total Entries:', 'cyan').padEnd(25)} ${c(String(stats.totalEntries), 'bold')}`);
    console.log(`  ${c('Total Words:', 'cyan').padEnd(25)} ${c(String(stats.totalWords), 'bold')}`);
    console.log(`  ${c('Date Range:', 'cyan').padEnd(25)} ${stats.dateRange.from} → ${stats.dateRange.to}`);
    console.log('');
    console.log(`  ${c('Avg Entries/Day:', 'cyan').padEnd(25)} ${stats.averageEntriesPerDay}`);
    console.log(`  ${c('Avg Words/Entry:', 'cyan').padEnd(25)} ${stats.averageWordsPerEntry}`);
    console.log('');
    console.log(`  ${c('Current Streak:', 'cyan').padEnd(25)} ${c(String(stats.streakCurrent), 'green')} days`);
    console.log(`  ${c('Longest Streak:', 'cyan').padEnd(25)} ${c(String(stats.streakLongest), 'yellow')} days`);
    
    if (stats.mostActiveDay) {
      console.log(`  ${c('Most Active Day:', 'cyan').padEnd(25)} ${stats.mostActiveDay.date} (${stats.mostActiveDay.entries} entries)`);
    }
    
    if (stats.tags.length > 0) {
      console.log(`\n  ${c('Top Tags:', 'cyan')}`);
      for (const { tag, count } of stats.tags.slice(0, 5)) {
        console.log(`    ${c('#' + tag, 'magenta')} (${count})`);
      }
    }
    break;
  }

  case 'summary': {
    const days = parseInt(positional[0]) || 7;
    const summaries = mem.summary(days);
    
    if (summaries.length === 0) {
      console.log('No memory files found');
    } else {
      console.log(`${c('📊', 'blue')} ${c('Memory Summary', 'bold')} (last ${days} days)\n`);
      
      for (const s of summaries) {
        const entryBadge = s.entries > 0 
          ? c(`${s.entries} entries`, 'green') 
          : c('0 entries', 'dim');
        
        console.log(`${c('📅', 'yellow')} ${c(s.date, 'bold')} — ${entryBadge} · ${s.words} words`);
        
        if (s.tags.length > 0) {
          console.log(`   ${c('Tags:', 'dim')} ${s.tags.slice(0, 5).map(t => c('#' + t, 'magenta')).join(' ')}`);
        }
        if (s.sections.length > 0) {
          console.log(`   ${c('Sections:', 'dim')} ${s.sections.join(', ')}`);
        }
        console.log('');
      }
    }
    break;
  }

  case 'list': {
    const listOpts = {
      from: opts.from || opts.f,
      to: opts.to || opts.t,
      limit: opts.limit ? parseInt(opts.limit) : null
    };
    
    const files = mem.list(listOpts);
    
    if (files.length === 0) {
      console.log('No memory files found');
    } else {
      console.log(`${c('📁', 'blue')} ${c('Memory Files', 'bold')} (${files.length})\n`);
      files.forEach(f => console.log(`  ${c(f.replace('.md', ''), 'cyan')}`));
    }
    break;
  }

  case 'export': {
    const exportOpts = {
      from: opts.from || opts.f,
      to: opts.to || opts.t,
      output: opts.output || opts.o,
      format: opts.full ? 'full' : 'json'
    };
    
    if (exportOpts.output) {
      const result = mem.export(exportOpts);
      console.log(`${c('✓', 'green')} Exported ${c(String(result.files), 'bold')} files to ${c(result.written, 'cyan')}`);
      console.log(`  Size: ${mem.formatBytes(result.size)}`);
    } else {
      const data = mem.export(exportOpts);
      console.log(JSON.stringify(data, null, 2));
    }
    break;
  }

  case 'backup': {
    try {
      const result = mem.backup({ output: opts.output || opts.o });
      console.log(`${c('✓', 'green')} Backup created: ${c(result.path, 'cyan')}`);
      console.log(`  Size: ${result.sizeHuman}`);
    } catch (e) {
      console.error(`${c('Error:', 'red')} ${e.message}`);
      process.exit(1);
    }
    break;
  }

  case 'archive': {
    const olderThan = parseInt(opts['older-than']) || 90;
    
    try {
      const result = mem.archive({ 
        olderThan, 
        output: opts.output || opts.o 
      });
      
      if (result.archived === 0) {
        console.log(`${c('ℹ', 'blue')} No memories older than ${olderThan} days to archive`);
      } else {
        console.log(`${c('✓', 'green')} Archived ${c(String(result.archived), 'bold')} files`);
        console.log(`  Archive: ${c(result.path, 'cyan')}`);
        console.log(`  Cutoff: ${result.cutoffDate}`);
      }
    } catch (e) {
      console.error(`${c('Error:', 'red')} ${e.message}`);
      process.exit(1);
    }
    break;
  }

  case 'help':
  case '--help':
  case '-h':
  case undefined:
    usage();
    break;

  case '--version':
  case '-v':
    console.log('0.2.0');
    break;

  default:
    console.error(`${c('Error:', 'red')} Unknown command: ${command}`);
    usage();
    process.exit(1);
}
