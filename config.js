const ENV = process.env.NODE_ENV || 'prod'

export default {
    ENV,
    PORT: 3501,
    PLACE_PORT: 3502,
    JWT_SECRET: process.env.JWT_SECRET || 'place_secret_dev',
    DB: {
        host: 'localhost',
        user: 'root',
        password: ENV === 'prod' ? process.env.DB_PASS : '2112',
        database: 'olgadle',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
    },
    SSL: {
        key: '/var/www/ssl/nazadoto.com.key',
        cert: '/var/www/ssl/nazadoto.com.crt',
    },
    INTERVALO_MS: 12 * 60 * 60 * 1000,
    CANVAS_SIZE: 150,
    COOLDOWN_MS: 20000,
    YOUTUBE: {
        apiKey: process.env.YOUTUBE_API_KEY || 'AIzaSyB8JFz4XdDl62ny4LiA-dMnY6o_SNEw2s0',
        handle: process.env.YOUTUBE_CHANNEL_HANDLE || 'olgaenvivo_',
        channelId: process.env.YOUTUBE_CHANNEL_ID || 'UCX1UZ1AYTY_R3oG5Nc3S7Ww',
    },
    TOTAL_INTEGRANTES: 55,
    DEEZER_PLAYLIST: '14879715523',
}