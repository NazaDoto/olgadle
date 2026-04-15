import { Router } from 'express'
import fetch from 'node-fetch'
import config from '../config.js'

const router = Router()

let playlistCache = null
let lastFetchTime = 0
const CACHE_TTL = 15 * 60 * 1000

export async function fetchPlaylist(force = false) {
    try {
        if (!force && playlistCache && Date.now() - lastFetchTime < CACHE_TTL) {
            return playlistCache
        }
        console.log('🔄 Refrescando playlist desde Deezer...')
        const res = await fetch(`https://api.deezer.com/playlist/${config.DEEZER_PLAYLIST}`)
        if (!res.ok) throw new Error('Error Deezer')
        const data = await res.json()
        if (!data.tracks?.data) throw new Error('Playlist vacía')
        playlistCache = data
        lastFetchTime = Date.now()
        return data
    } catch (err) {
        console.error('❌ fetchPlaylist:', err.message)
        return playlistCache
    }
}

router.get('/playlist', async (req, res) => {
    const data = await fetchPlaylist()
    if (!data?.tracks?.data) return res.status(404).json({ error: 'Sin canciones' })
    res.json(data.tracks.data.map(t => ({
        id: t.id,
        title: t.title,
        artist: t.artist.name,
    })))
})

// Refrescar automáticamente cada 15 min
setInterval(() => fetchPlaylist(true), CACHE_TTL)

export default router