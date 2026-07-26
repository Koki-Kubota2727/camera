import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (Platform.OS === "web") {
    throw new Error("WebではSQLiteの代わりにAsyncStorageを使用します。");
  }
  databasePromise ??= SQLite.openDatabaseAsync("lab-drive-camera.db");
  return databasePromise;
};

export const initializeDatabase = async (): Promise<void> => {
  if (Platform.OS === "web") {
    return;
  }
  const db = await getDatabase();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      display_name TEXT NOT NULL,
      photographer_code TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS drive_folders (
      id TEXT PRIMARY KEY,
      drive_id TEXT,
      name TEXT NOT NULL,
      parent_id TEXT,
      full_path_cache TEXT,
      can_add_children INTEGER NOT NULL,
      can_edit INTEGER NOT NULL,
      is_favorite INTEGER NOT NULL,
      last_used_at TEXT,
      modified_time TEXT,
      cached_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      local_uri TEXT NOT NULL,
      thumbnail_uri TEXT,
      target_folder_id TEXT NOT NULL,
      target_folder_name_cache TEXT NOT NULL,
      drive_folder_id TEXT,
      drive_folder_name TEXT,
      drive_id TEXT,
      photographer_code TEXT NOT NULL,
      captured_at TEXT NOT NULL,
      default_file_name TEXT NOT NULL,
      current_file_name TEXT NOT NULL,
      memo TEXT,
      mime_type TEXT NOT NULL,
      file_size INTEGER,
      sha256 TEXT,
      upload_status TEXT NOT NULL,
      drive_file_id TEXT,
      uploaded_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS upload_jobs (
      id TEXT PRIMARY KEY,
      photo_id TEXT NOT NULL,
      status TEXT NOT NULL,
      attempt_count INTEGER NOT NULL,
      last_error_code TEXT,
      last_error_message TEXT,
      next_retry_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  await addColumnIfMissing(db, "photos", "drive_folder_id", "TEXT");
  await addColumnIfMissing(db, "photos", "drive_folder_name", "TEXT");
};

const addColumnIfMissing = async (
  db: SQLite.SQLiteDatabase,
  tableName: string,
  columnName: string,
  definition: string
): Promise<void> => {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName})`);
  if (columns.some((column) => column.name === columnName)) {
    return;
  }
  await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
};
