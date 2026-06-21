let dbInstance: any = null;

export async function getDb(): Promise<any> {
  if (dbInstance) {
    return dbInstance;
  }

  // 1. Detect Cloudflare D1 environment (Edge Runtime)
  let d1Binding: any = null;
  try {
    const cfPackage = '@cloudflare/next-on-pages';
    const { getRequestContext } = require(cfPackage);
    const ctx = getRequestContext();
    if (ctx && ctx.env && ctx.env.DB) {
      d1Binding = ctx.env.DB;
    }
  } catch (error) {
    // getRequestContext is unavailable when running locally in dev mode
  }

  if (d1Binding) {
    console.log('[privfiles DB] Using Cloudflare D1 Database.');

    // Build the D1 database tables on startup if they don't exist yet
    try {
      await d1Binding.exec(`
        CREATE TABLE IF NOT EXISTS files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          telegram_file_id TEXT NOT NULL,
          telegram_message_id INTEGER NOT NULL,
          file_name TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          mime_type TEXT NOT NULL,
          category TEXT NOT NULL,
          is_favorite INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS albums (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS album_files (
          album_id INTEGER,
          file_id INTEGER,
          PRIMARY KEY (album_id, file_id),
          FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
          FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
    } catch (dbInitErr) {
      console.error('[D1 Initialization Warning]:', dbInitErr);
    }

    // Wrap Cloudflare D1 in a Node-sqlite compatible interface
    dbInstance = {
      isD1: true,
      async get(sql: string, params: any[] = []) {
        try {
          const result = await d1Binding.prepare(sql).bind(...params).first();
          return result || null;
        } catch (err) {
          console.error(`D1 get error for "${sql}" with params`, params, err);
          throw err;
        }
      },
      async all(sql: string, params: any[] = []) {
        try {
          const { results } = await d1Binding.prepare(sql).bind(...params).all();
          return results || [];
        } catch (err) {
          console.error(`D1 all error for "${sql}" with params`, params, err);
          throw err;
        }
      },
      async run(sql: string, params: any[] = []) {
        try {
          // Replace 'INSERT OR REPLACE' / 'INSERT OR IGNORE' to work on D1 if necessary.
          // D1 supports standard SQLite dialect, so INSERT OR REPLACE is fine.
          const res = await d1Binding.prepare(sql).bind(...params).run();
          return {
            lastID: res.meta?.last_row_id ?? null,
            changes: res.meta?.changes ?? 0,
          };
        } catch (err) {
          console.error(`D1 run error for "${sql}" with params`, params, err);
          throw err;
        }
      },
      async exec(sql: string) {
        try {
          await d1Binding.exec(sql);
        } catch (err) {
          console.error(`D1 exec error for "${sql}"`, err);
          throw err;
        }
      },
      async prepare(sql: string) {
        const stmt = d1Binding.prepare(sql);
        return {
          async run(params: any[] = []) {
            const res = await stmt.bind(...params).run();
            return {
              lastID: res.meta?.last_row_id ?? null,
              changes: res.meta?.changes ?? 0,
            };
          },
          async finalize() {
            // No-op for D1
          }
        };
      }
    };

    return dbInstance;
  }

  // 2. Local Fallback to Node sqlite3/sqlite (Local Server / Development)
  console.log('[privfiles DB] Using Local SQLite file database.');
  
  // Dynamic imports to prevent Edge compilation from trying to bundle native modules
  const sqlite3 = require('sqlite3');
  const { open } = require('sqlite');

  const localDb = await open({
    filename: './telebox.db',
    driver: sqlite3.Database,
  });

  // Create tables if they do not exist
  await localDb.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_file_id TEXT NOT NULL,
      telegram_message_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      category TEXT NOT NULL,
      is_favorite INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS album_files (
      album_id INTEGER,
      file_id INTEGER,
      PRIMARY KEY (album_id, file_id),
      FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  dbInstance = localDb;
  return dbInstance;
}
