import os from 'node:os'
import path from 'node:path'
import { randomBytes } from 'node:crypto'

export default {
    PORT: Number(process.env.PORT || 3501),
    JWT_SECRET: process.env.JWT_SECRET || randomBytes(32).toString('hex'),
    ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    DB: {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'olgadle',
        waitForConnections: true,
        connectionLimit: 10,
    },
    UPLOAD_TEMP: path.join(os.tmpdir(), 'olgadle-uploads'),
    INTERVALO_MS: 12 * 60 * 60 * 1000,
    CANVAS_SIZE: 1000,
    PLACE_CYCLE_STARTED_AT: process.env.PLACE_CYCLE_STARTED_AT,
    YOUTUBE: {
        apiKey: process.env.YOUTUBE_API_KEY,
        handle: process.env.YOUTUBE_CHANNEL_HANDLE || 'olgaenvivo_',
        channelId: process.env.YOUTUBE_CHANNEL_ID || 'UCX1UZ1AYTY_R3oG5Nc3S7Ww',
    },
    DEEZER_PLAYLIST: '14879715523',
}
