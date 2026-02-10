# agent-memory-tools

CLI for managing agent memory files — daily logs, long-term memory, search, analytics.

Built for AI agents running on OpenClaw or similar frameworks that use markdown files for memory/context persistence.

## Features

- 📝 **Daily logs** — Timestamped entries for each day
- 🔍 **Search** — Full-text search with date ranges
- 🏷️ **Tags** — Organize with #hashtags, filter by tag
- 📊 **Analytics** — Statistics, streaks, word counts
- 💾 **Export/Backup** — JSON export, tar.gz backups
- 🗄️ **Archive** — Move old memories to archive files

## Install

```bash
npm install -g @cortexair/agent-memory-tools
```

Or run directly:

```bash
npx @cortexair/agent-memory-tools
```

## Quick Start

```bash
# Initialize memory directory
mem init

# Add entries (tags are auto-extracted)
mem add "Deployed feature to production #deploy #work"
mem add "Had meeting with team about Q1 goals #work #planning"

# View today's memory
mem today

# Search across all memories
mem search "deploy"
mem search --tag work
mem search meeting --from -7 --to today

# See recent entries
mem recent 10

# Get statistics
mem stats
```

## Commands

### Core

| Command | Description |
|---------|-------------|
| `mem init` | Initialize memory directory |
| `mem today` | Show/create today's memory file |
| `mem add <text>` | Add timestamped entry to today |
| `mem show <date>` | Show memory for specific date |

### Search & Discovery

| Command | Description |
|---------|-------------|
| `mem search <query>` | Search across all memories |
| `mem recent [n]` | Show n most recent entries |
| `mem tags` | List all tags with counts |

Search options:
- `--from <date>` — Start date
- `--to <date>` — End date
- `--tag <tag>` — Filter by tag
- `--limit <n>` — Max results

### Analytics

| Command | Description |
|---------|-------------|
| `mem summary [days]` | Summary of recent days |
| `mem stats` | Full statistics and analytics |
| `mem list` | List all memory files |

### Export & Backup

| Command | Description |
|---------|-------------|
| `mem export` | Export memories to JSON |
| `mem backup` | Create compressed backup |
| `mem archive` | Archive old memories |

Export options:
- `--from/--to` — Date range filter
- `--output <file>` — Output file path

Archive options:
- `--older-than <days>` — Days threshold (default: 90)

## Date Formats

The CLI supports flexible date formats:

| Format | Example | Description |
|--------|---------|-------------|
| `YYYY-MM-DD` | `2026-02-10` | Full date |
| `MM-DD` | `02-10` | Current year |
| `DD` | `10` | Current month |
| `today` | — | Today's date |
| `yesterday` | — | Yesterday |
| `-N` | `-7` | N days ago |

## Tags

Tags are automatically extracted from entries using `#hashtag` syntax:

```bash
mem add "Working on #project-x with #team"
# Tags: project-x, team

mem search --tag project-x
# Find all entries with #project-x

mem tags
# List all tags with counts
```

Tag rules:
- Start with a letter
- Can contain letters, numbers, hyphens, underscores
- Case-insensitive (normalized to lowercase)

## Statistics

```bash
mem stats
```

Shows:
- Total files, entries, words
- Date range covered
- Average entries/day and words/entry
- Current and longest streaks
- Most active day
- Top tags

## Export & Backup

### Export to JSON

```bash
# Print to stdout
mem export

# Save to file
mem export --output memories.json

# Export date range
mem export --from 2026-01-01 --to 2026-01-31 --output jan.json
```

### Create Backup

```bash
mem backup
# Creates: memory-backup-2026-02-10T12-30-00.tar.gz

mem backup --output my-backup.tar.gz
```

### Archive Old Memories

```bash
# Archive memories older than 90 days
mem archive

# Archive memories older than 30 days
mem archive --older-than 30

# Specify output file
mem archive --output old-memories.json
```

This exports old memories to JSON and removes the original files.

## Programmatic Usage

```javascript
const { MemoryManager } = require('@cortexair/agent-memory-tools');

const mem = new MemoryManager('/path/to/memory');

// Add entry
mem.add('Task completed #done');

// Search with options
const results = mem.search('task', {
  from: '2026-02-01',
  to: 'today',
  tags: ['done'],
  limit: 10
});

// Get statistics
const stats = mem.stats();
console.log(`${stats.totalEntries} entries over ${stats.totalFiles} days`);

// Export
const data = mem.export({ from: '-30', to: 'today' });

// Get recent entries
const recent = mem.recent(10);
```

## File Format

Memory files are markdown with this structure:

```markdown
# 2026-02-10

## Timeline

- **09:00** — Morning standup #work
- **14:30** — Deployed feature X #deploy #work
- **16:00** — Code review with team #review

## Notes

Additional context and observations...
```

## Configuration

Set `MEMORY_DIR` environment variable to override the default:

```bash
export MEMORY_DIR=~/my-agent/memory
mem today
```

Default: `~/.openclaw/workspace/memory/`

## Why?

AI agents need persistent memory across sessions. This tool provides:

- **Simple CLI** — Easy to use from shell scripts or agent tools
- **Structured data** — Entries with timestamps and tags
- **Search** — Find past context quickly with date ranges
- **Analytics** — Understand memory patterns
- **Portability** — Plain markdown, no database required
- **Backup** — Easy export and archival

## License

MIT
