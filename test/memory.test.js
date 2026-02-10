const { MemoryManager } = require('../lib/memory.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Test utilities
const assert = (condition, message) => {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
};

const assertEqual = (actual, expected, message) => {
  if (actual !== expected) {
    throw new Error(`${message}: expected "${expected}", got "${actual}"`);
  }
};

const assertIncludes = (arr, item, message) => {
  if (!arr.includes(item)) {
    throw new Error(`${message}: ${JSON.stringify(arr)} does not include "${item}"`);
  }
};

// Test runner
let passed = 0;
let failed = 0;

const test = async (name, fn) => {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${e.message}`);
    failed++;
  }
};

// Create temp directory for tests
const testDir = path.join(os.tmpdir(), `mem-test-${Date.now()}`);

// Cleanup function
const cleanup = () => {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
};

// Run tests
(async () => {
  console.log('\n📊 agent-memory-tools tests\n');
  console.log(`Test directory: ${testDir}\n`);

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('Date Utilities');
  // ─────────────────────────────────────────────────────────────────────────────

  await test('parseDate: today', () => {
    const mem = new MemoryManager(testDir);
    const result = mem.parseDate('today');
    assertEqual(result, mem.getDateString(), 'today should return current date');
  });

  await test('parseDate: yesterday', () => {
    const mem = new MemoryManager(testDir);
    const result = mem.parseDate('yesterday');
    const expected = new Date();
    expected.setDate(expected.getDate() - 1);
    assertEqual(result, mem.getDateString(expected), 'yesterday calculation');
  });

  await test('parseDate: -N days ago', () => {
    const mem = new MemoryManager(testDir);
    const result = mem.parseDate('-7');
    const expected = new Date();
    expected.setDate(expected.getDate() - 7);
    assertEqual(result, mem.getDateString(expected), '-7 days calculation');
  });

  await test('parseDate: full date', () => {
    const mem = new MemoryManager(testDir);
    assertEqual(mem.parseDate('2026-02-10'), '2026-02-10', 'full date passthrough');
  });

  await test('parseDate: invalid returns null', () => {
    const mem = new MemoryManager(testDir);
    assertEqual(mem.parseDate('invalid'), null, 'invalid date');
  });

  await test('isDateInRange: basic range', () => {
    const mem = new MemoryManager(testDir);
    assert(mem.isDateInRange('2026-02-05', '2026-02-01', '2026-02-10'), 'in range');
    assert(!mem.isDateInRange('2026-01-15', '2026-02-01', '2026-02-10'), 'before range');
    assert(!mem.isDateInRange('2026-02-15', '2026-02-01', '2026-02-10'), 'after range');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nCore Operations');
  // ─────────────────────────────────────────────────────────────────────────────

  await test('init: creates directory', () => {
    cleanup();
    const mem = new MemoryManager(testDir);
    const result = mem.init();
    assert(result.created, 'should report created');
    assert(fs.existsSync(testDir), 'directory should exist');
    assert(fs.existsSync(result.todayFile), 'today file should exist');
  });

  await test('today: returns content', () => {
    const mem = new MemoryManager(testDir);
    const result = mem.today();
    assert(result.content.includes(mem.getDateString()), 'should contain date');
    assert(result.content.includes('## Timeline'), 'should contain Timeline');
  });

  await test('add: appends entry', () => {
    const mem = new MemoryManager(testDir);
    const result = mem.add('Test entry #test #feature');
    assert(result.entry.includes('Test entry'), 'entry should contain text');
    assertIncludes(result.tags, 'test', 'tags extracted');
    assertIncludes(result.tags, 'feature', 'tags extracted');
    
    const content = fs.readFileSync(result.path, 'utf8');
    assert(content.includes('Test entry'), 'file should contain entry');
  });

  await test('add: multiple entries', () => {
    const mem = new MemoryManager(testDir);
    mem.add('First entry');
    mem.add('Second entry');
    mem.add('Third entry');
    
    const { content } = mem.today();
    assert(content.includes('First entry'), 'first entry');
    assert(content.includes('Second entry'), 'second entry');
    assert(content.includes('Third entry'), 'third entry');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nTag Extraction');
  // ─────────────────────────────────────────────────────────────────────────────

  await test('extractTags: basic tags', () => {
    const mem = new MemoryManager(testDir);
    const tags = mem.extractTags('Working on #project with #team');
    assertIncludes(tags, 'project', 'project tag');
    assertIncludes(tags, 'team', 'team tag');
  });

  await test('extractTags: deduplication', () => {
    const mem = new MemoryManager(testDir);
    const tags = mem.extractTags('#test #Test #TEST');
    assertEqual(tags.length, 1, 'should dedupe');
    assertIncludes(tags, 'test', 'lowercase');
  });

  await test('extractTags: complex tags', () => {
    const mem = new MemoryManager(testDir);
    const tags = mem.extractTags('#my-project #feature_flag #v2');
    assertIncludes(tags, 'my-project', 'hyphen');
    assertIncludes(tags, 'feature_flag', 'underscore');
    assertIncludes(tags, 'v2', 'alphanumeric');
  });

  await test('extractTags: ignores invalid', () => {
    const mem = new MemoryManager(testDir);
    const tags = mem.extractTags('#123 #-invalid');
    assertEqual(tags.length, 0, 'no valid tags');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nSearch');
  // ─────────────────────────────────────────────────────────────────────────────

  await test('search: basic query', () => {
    const mem = new MemoryManager(testDir);
    const results = mem.search('entry');
    assert(results.length > 0, 'should find entries');
  });

  await test('search: tag filter', () => {
    const mem = new MemoryManager(testDir);
    const results = mem.search(null, { tags: 'test' });
    assert(results.length > 0, 'should find tagged entries');
    results.forEach(r => {
      assert(r.tags.includes('test') || r.text.includes('#test'), 'should have tag');
    });
  });

  await test('search: limit', () => {
    const mem = new MemoryManager(testDir);
    const results = mem.search('entry', { limit: 2 });
    assert(results.length <= 2, 'should respect limit');
  });

  await test('search: date range', () => {
    const mem = new MemoryManager(testDir);
    const today = mem.getDateString();
    const results = mem.search('entry', { from: today, to: today });
    results.forEach(r => {
      assertEqual(r.date, today, 'should be today');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nMultiple Days');
  // ─────────────────────────────────────────────────────────────────────────────

  await test('show: specific date', () => {
    const mem = new MemoryManager(testDir);
    const result = mem.show('today');
    assert(result.exists, 'today should exist');
    assert(result.content.length > 0, 'should have content');
  });

  await test('show: nonexistent date', () => {
    const mem = new MemoryManager(testDir);
    const result = mem.show('2020-01-01');
    assert(!result.exists, 'should not exist');
  });

  await test('append: to specific date', () => {
    const mem = new MemoryManager(testDir);
    // Create yesterday's file
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = mem.getDateString(yesterday);
    
    const result = mem.append('yesterday', 'Backdated entry');
    assertEqual(result.date, yesterdayStr, 'should be yesterday');
    
    const content = fs.readFileSync(result.path, 'utf8');
    assert(content.includes('Backdated entry'), 'should contain entry');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nStatistics');
  // ─────────────────────────────────────────────────────────────────────────────

  await test('stats: returns data', () => {
    const mem = new MemoryManager(testDir);
    const stats = mem.stats();
    assert(stats.totalFiles > 0, 'has files');
    assert(stats.totalEntries > 0, 'has entries');
    assert(stats.totalWords > 0, 'has words');
    assert(stats.dateRange, 'has date range');
  });

  await test('getTags: returns tag counts', () => {
    const mem = new MemoryManager(testDir);
    const tags = mem.getTags();
    assert(Array.isArray(tags), 'is array');
    if (tags.length > 0) {
      assert(tags[0].tag, 'has tag');
      assert(typeof tags[0].count === 'number', 'has count');
    }
  });

  await test('recent: returns entries', () => {
    const mem = new MemoryManager(testDir);
    const recent = mem.recent(5);
    assert(Array.isArray(recent), 'is array');
    if (recent.length > 0) {
      assert(recent[0].date, 'has date');
      assert(recent[0].time, 'has time');
      assert(recent[0].text, 'has text');
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nExport');
  // ─────────────────────────────────────────────────────────────────────────────

  await test('export: returns data', () => {
    const mem = new MemoryManager(testDir);
    const data = mem.export();
    assert(data.exportedAt, 'has timestamp');
    assert(data.memories.length > 0, 'has memories');
    assert(data.memories[0].entries, 'has entries');
  });

  await test('export: to file', () => {
    const mem = new MemoryManager(testDir);
    const output = path.join(testDir, 'export.json');
    const result = mem.export({ output });
    assert(result.written === output, 'written path');
    assert(fs.existsSync(output), 'file exists');
    
    const content = JSON.parse(fs.readFileSync(output, 'utf8'));
    assert(content.memories.length > 0, 'has memories');
  });

  await test('export: date range filter', () => {
    const mem = new MemoryManager(testDir);
    const today = mem.getDateString();
    const data = mem.export({ from: today, to: today });
    data.memories.forEach(m => {
      assertEqual(m.date, today, 'only today');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nList & Summary');
  // ─────────────────────────────────────────────────────────────────────────────

  await test('list: returns files', () => {
    const mem = new MemoryManager(testDir);
    const files = mem.list();
    assert(files.length > 0, 'has files');
    assert(files[0].endsWith('.md'), 'are markdown');
  });

  await test('list: with limit', () => {
    const mem = new MemoryManager(testDir);
    const files = mem.list({ limit: 1 });
    assertEqual(files.length, 1, 'respects limit');
  });

  await test('summary: returns summaries', () => {
    const mem = new MemoryManager(testDir);
    const summaries = mem.summary(7);
    assert(summaries.length > 0, 'has summaries');
    assert(typeof summaries[0].entries === 'number', 'has entries');
    assert(typeof summaries[0].words === 'number', 'has words');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nEntry Parsing');
  // ─────────────────────────────────────────────────────────────────────────────

  await test('parseEntries: extracts entries', () => {
    const mem = new MemoryManager(testDir);
    const content = `# 2026-02-10

## Timeline

- **09:00** — Morning standup #work
- **14:30** — Deployed feature #deploy #work

## Notes
`;
    const entries = mem.parseEntries(content);
    assertEqual(entries.length, 2, 'two entries');
    assertEqual(entries[0].time, '09:00', 'first time');
    assertIncludes(entries[0].tags, 'work', 'first tags');
    assertEqual(entries[1].time, '14:30', 'second time');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nStreaks');
  // ─────────────────────────────────────────────────────────────────────────────

  await test('calculateStreaks: basic', () => {
    const mem = new MemoryManager(testDir);
    
    // Create files for a streak
    const today = mem.getDateString();
    const files = [
      `${today}.md`,
      `${mem.getDateString(new Date(Date.now() - 86400000))}.md`
    ];
    
    const { current, longest } = mem.calculateStreaks(files);
    assert(current >= 1, 'current streak');
    assert(longest >= current, 'longest >= current');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Cleanup
  // ─────────────────────────────────────────────────────────────────────────────
  
  cleanup();

  // Summary
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log(`${'─'.repeat(50)}\n`);

  process.exit(failed > 0 ? 1 : 0);
})();
