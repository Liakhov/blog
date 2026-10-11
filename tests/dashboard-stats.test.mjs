import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

// Transpile the actual query module; execute its SQL against real SQLite.
function moduleUrl(path, imports = {}) {
  let source = stripTypeScriptTypes(readFileSync(new URL(path, import.meta.url), 'utf8'));
  for (const [name, url] of Object.entries(imports)) source = source.replaceAll(name, url);
  return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
}

const { getDashboardData } = await import(
  moduleUrl('../src/lib/analytics/dashboard-stats.ts', {
    '@/consts': moduleUrl('../src/consts.ts'),
    './bot-filter': moduleUrl('../src/lib/analytics/bot-filter.ts')
  })
);

function database(t) {
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  for (const migration of ['0001_analytics.sql', '0002_drop_os_device.sql']) {
    sqlite.exec(readFileSync(new URL(`../migrations/${migration}`, import.meta.url), 'utf8'));
  }
  const db = {
    prepare(sql) {
      let values = [];
      return {
        bind(...args) {
          values = args;
          return this;
        },
        execute() {
          return {
            results: sqlite
              .prepare(sql)
              .all(...values)
              .map(row => ({ ...row }))
          };
        }
      };
    },
    async batch(statements) {
      return statements.map(statement => statement.execute());
    }
  };
  return { sqlite, db };
}

test('live breakdowns count today, preserve missing sources, and exclude bots and yesterday', async t => {
  const { sqlite, db } = database(t);
  const insert = sqlite.prepare(`INSERT INTO pageview_events
    (visitor_id, path, referrer, browser, country, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now', 'start of day', ?))`);
  insert.run('reader-a', '/', null, 'Firefox', 'UA', '+1 hour');
  insert.run('reader-a', '/', null, 'Firefox', 'UA', '+2 hours');
  insert.run('reader-b', '/posts/example', 'google.com', 'Chrome', 'PL', '+3 hours');
  insert.run('reader-c', '/posts/example', 'google.com', null, null, '+4 hours');
  insert.run('old-reader', '/', 'yesterday.example', 'Safari', 'DE', '-1 day');
  for (let i = 0; i < 3; i++) {
    insert.run('burst-bot', '/', 'bot.example', 'Bot', 'US', '+5 hours');
  }
  for (let i = 0; i < 51; i++) {
    insert.run('volume-bot', '/', 'bot.example', 'Bot', 'US', `+${i * 60} seconds`);
  }
  const data = await getDashboardData(db);
  assert.deepEqual(data.liveTodayTotals, { views: 4, visitors: 3 });
  assert.deepEqual(
    data.liveTodayPages.find(row => row.path === '/'),
    {
      path: '/',
      views: 2,
      visitors: 1
    }
  );
  assert.deepEqual(data.liveTodayReferrers, [
    { referrer: 'No referrer', hits: 2 },
    { referrer: 'google.com', hits: 2 }
  ]);
  assert.deepEqual(data.liveTodayBrowsers, [
    { browser: 'Firefox', hits: 2 },
    { browser: 'Chrome', hits: 1 },
    { browser: 'Unknown', hits: 1 }
  ]);
  assert.deepEqual(data.liveTodayCountries, [
    { country: 'UA', hits: 2 },
    { country: 'PL', hits: 1 },
    { country: 'Unknown', hits: 1 }
  ]);
});

test('live breakdowns are empty when there are no events', async t => {
  const { db } = database(t);
  const data = await getDashboardData(db);
  assert.deepEqual(data.liveTodayReferrers, []);
  assert.deepEqual(data.liveTodayBrowsers, []);
  assert.deepEqual(data.liveTodayCountries, []);
});
