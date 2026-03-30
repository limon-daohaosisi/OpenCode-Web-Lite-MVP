type SqlitePragmaCapable = {
  pragma(source: string): unknown;
};

export function applySqlitePragmas(db: SqlitePragmaCapable) {
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('temp_store = MEMORY');
}
