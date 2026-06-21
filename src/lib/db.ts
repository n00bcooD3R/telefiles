import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  // Open SQLite database file
  dbInstance = await open({
    filename: './telebox.db',
    driver: sqlite3.Database,
  });

  // Create tables if they do not exist
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_file_id TEXT NOT NULL,
      telegram_message_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      category TEXT NOT NULL, -- 'image' | 'video' | 'document' | 'audio'
      is_favorite INTEGER DEFAULT 0, -- 0 for false, 1 for true
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

  console.log('[privfiles DB] SQLite database initialized successfully.');
  return dbInstance;
}
