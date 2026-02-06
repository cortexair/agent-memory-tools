# agent-memory-tools

CLI for managing agent memory files — daily logs, long-term memory, search.

Built for AI agents running on OpenClaw or similar frameworks that use markdown files for memory/context persistence.

## Install

```bash
npm install -g @cortexair/agent-memory-tools
```

Or run directly:

```bash
npx @cortexair/agent-memory-tools
```

## Usage

```bash
# Initialize memory directory
mem init

# Show/create today's memory file
mem today

# Add a timestamped entry to today's file
mem add "Deployed new feature to production"
mem add "Meeting with Human about project priorities"

# Search across all memory files
mem search "deployed"
mem search "Human"

# Show summary of recent days
mem summary        # last 7 days
mem summary 30     # last 30 days

# List all memory files
mem list
```

## Configuration

Set `MEMORY_DIR` environment variable to override the default memory directory:

```bash
export MEMORY_DIR=~/my-agent/memory
mem today
```

Default: `~/.openclaw/workspace/memory/`

## File Format

Memory files are markdown with this structure:

```markdown
# 2026-02-05

## Timeline

- **09:00** — Morning briefing sent
- **14:30** — Deployed feature X to production

## Notes

Additional context and observations...
```

## Why?

AI agents need persistent memory across sessions. This tool provides a simple interface for:

- **Daily logs**: Timestamped entries for each day
- **Search**: Find past context quickly
- **Summaries**: Quick overview of recent activity
- **Portability**: Plain markdown, no database required

## License

MIT
