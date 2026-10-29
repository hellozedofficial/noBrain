import 'server-only'
import 'server-only';
import mysql from 'mysql2/promise'

let pool: mysql.Pool | null = null

export function getDbPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || "127.0.0.1",
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || "root",
      password: process.env.MYSQL_PASSWORD || "",
      database: process.env.MYSQL_DATABASE || "openrouter_ai",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    })
  }
  return pool
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = getDbPool()
  const [rows] = await db.query(sql, params)
  return rows as T[]
}

export async function execute(sql: string, params: any[] = []): Promise<any> {
  const db = getDbPool()
  
  // For transaction statements, use query() instead of execute()
  if (sql.trim().toUpperCase().startsWith('START TRANSACTION') ||
      sql.trim().toUpperCase().startsWith('COMMIT') ||
      sql.trim().toUpperCase().startsWith('ROLLBACK')) {
    const [result] = await db.query(sql, params)
    return result
  }
  
  const [result] = await db.execute(sql, params)
  return result
}
