import initSqlJs, { Database } from 'sql.js';

let db: Database | null = null;
let SQL: any = null;

export async function initDatabase(tables: Record<string, any[]>) {
  try {
    if (!SQL) {
      SQL = await initSqlJs({
        locateFile: (_file: string) => {
          // Always use the browser wasm from public folder
          return `${typeof window !== 'undefined' ? window.location.origin : ''}/sql-wasm.wasm`;
        }
      });
    }

    db = new SQL.Database();

    for (const [tableName, rows] of Object.entries(tables)) {
      if (!rows || rows.length === 0) continue;
      const columns = Object.keys(rows[0]);
      const schema = columns.map(col => {
        const v = rows.find(r => r && r[col] !== undefined && r[col] !== null && r[col] !== '')?.[col];
        return `"${col.replace(/"/g, '""')}" ${typeof v === 'number' ? 'REAL' : 'TEXT'}`;
      }).join(', ');
      db!.run(`DROP TABLE IF EXISTS "${tableName.replace(/"/g, '""')}";`);
      db!.run(`CREATE TABLE "${tableName.replace(/"/g, '""')}" (${schema});`);
      for (const row of rows) {
        const vals = columns.map(col => {
          const v = row[col];
          return typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : (v !== undefined && v !== null && v !== '' ? v : 'NULL');
        }).join(', ');
        db!.run(`INSERT INTO "${tableName.replace(/"/g, '""')}" VALUES (${vals});`);
      }
    }
    return true;
  } catch (e: any) {
    console.error('DB init error:', e);
    throw e;
  }
}

export function addTableToDb(name: string, columns: string[], rows: any[]) {
  if (!db) throw new Error('DB not initialized');
  const schema = columns.map((col) => {
    const v = rows.find(r => r && r[col] !== undefined && r[col] !== null && r[col] !== '')?.[col];
    return `"${col.replace(/"/g, '""')}" ${typeof v === 'number' ? 'REAL' : 'TEXT'}`;
  }).join(', ');
  db.run(`DROP TABLE IF EXISTS "${name.replace(/"/g, '""')}";`);
  db.run(`CREATE TABLE "${name.replace(/"/g, '""')}" (${schema});`);
  for (const row of rows) {
    const vals = columns.map(col => {
      const v = row[col];
      return typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : (v !== undefined && v !== null && v !== '' ? v : 'NULL');
    }).join(', ');
    db.run(`INSERT INTO "${name.replace(/"/g, '""')}" VALUES (${vals});`);
  }
}

export function executeQuery(query: string): { columns: string[]; rows: any[] } {
  if (!db) throw new Error('Database not initialized');
  const res = db.exec(query);
  if (!res || res.length === 0) return { columns: [], rows: [] };
  const { columns, values } = res[0];
  const rows = values.map((row: any[]) => {
    const obj: any = {};
    columns.forEach((col: string, i: number) => { obj[col] = row[i]; });
    return obj;
  });
  return { columns, rows };
}

export function isDbReady() { return db !== null; }
