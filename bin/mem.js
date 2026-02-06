#!/usr/bin/env node

const { MemoryManager } = require('../lib/memory.js');

const args = process.argv.slice(2);
const command = args[0];
const mem = new MemoryManager(process.env.MEMORY_DIR);

function usage() {
  console.log(`
mem - Agent Memory Tools

Usage:
  mem init              Initialize memory directory
  mem today             Show/create today's memory file
  mem add <text>        Add timestamped entry to today
  mem search <query>    Search across all memory files
  mem summary [days]    Show summary of recent days (default: 7)
  mem list              List all memory files
  mem help              Show this help

Environment:
  MEMORY_DIR            Override default memory directory
                        (default: ~/.openclaw/workspace/memory)
`);
}

switch (command) {
  case 'init': {
    const result = mem.init();
    if (result.created) {
      console.log(`✓ Created memory directory: ${result.memoryDir}`);
    } else {
      console.log(`✓ Memory directory exists: ${result.memoryDir}`);
    }
    console.log(`✓ Today's file: ${result.todayFile}`);
    break;
  }

  case 'today': {
    const result = mem.today();
    console.log(`📅 ${result.path}\n`);
    console.log(result.content);
    break;
  }

  case 'add': {
    const text = args.slice(1).join(' ');
    if (!text) {
      console.error('Error: No text provided');
      console.log('Usage: mem add <text>');
      process.exit(1);
    }
    const result = mem.add(text);
    console.log(`✓ Added to ${result.path}:`);
    console.log(`  ${result.entry}`);
    break;
  }

  case 'search': {
    const query = args.slice(1).join(' ');
    if (!query) {
      console.error('Error: No search query provided');
      console.log('Usage: mem search <query>');
      process.exit(1);
    }
    const results = mem.search(query);
    if (results.length === 0) {
      console.log(`No results found for "${query}"`);
    } else {
      console.log(`Found ${results.length} result(s) for "${query}":\n`);
      results.forEach(r => {
        console.log(`📄 ${r.file}:${r.line}`);
        console.log(`   ${r.text}\n`);
      });
    }
    break;
  }

  case 'summary': {
    const days = parseInt(args[1]) || 7;
    const summaries = mem.summary(days);
    if (summaries.length === 0) {
      console.log('No memory files found');
    } else {
      console.log(`📊 Memory Summary (last ${days} days):\n`);
      summaries.forEach(s => {
        console.log(`📅 ${s.date}: ${s.entries} entries`);
        if (s.sections.length > 0) {
          console.log(`   Sections: ${s.sections.join(', ')}`);
        }
        console.log('');
      });
    }
    break;
  }

  case 'list': {
    const files = mem.list();
    if (files.length === 0) {
      console.log('No memory files found');
    } else {
      console.log(`📁 Memory files (${files.length}):\n`);
      files.forEach(f => console.log(`  ${f}`));
    }
    break;
  }

  case 'help':
  case '--help':
  case '-h':
  case undefined:
    usage();
    break;

  default:
    console.error(`Unknown command: ${command}`);
    usage();
    process.exit(1);
}
