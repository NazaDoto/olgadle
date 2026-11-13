import mysql from 'mysql2/promise'
import config from './config.js'

const db = mysql.createPool(config.DB)

export async function transaction(work) {
    const connection = await db.getConnection()
    try {
        await connection.beginTransaction()
        const result = await work(connection)
        await connection.commit()
        return result
    } catch (error) {
        await connection.rollback().catch(() => {})
        throw error
    } finally {
        connection.release()
    }
}

export default db
