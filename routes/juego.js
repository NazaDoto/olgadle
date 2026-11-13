import { Router } from 'express'
import fetch from 'node-fetch'
import config from '../config.js'
import db, { transaction } from '../db.js'
import { fetchPlaylist } from './playlist.js'
import { listarIntegrantes } from './integrantes.js'

const router = Router()

export async function initGame() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS game_round (
            id TINYINT PRIMARY KEY,
            ends_at BIGINT UNSIGNED NOT NULL DEFAULT 0,
            integrante JSON,
            integrante_qe JSON,
            songs JSON,
            attempts INT UNSIGNED NOT NULL DEFAULT 0,
            wins INT UNSIGNED NOT NULL DEFAULT 0,
            attempts_qe INT UNSIGNED NOT NULL DEFAULT 0,
            wins_qe INT UNSIGNED NOT NULL DEFAULT 0,
            attempts_en INT UNSIGNED NOT NULL DEFAULT 0,
            wins_en INT UNSIGNED NOT NULL DEFAULT 0
        ) ENGINE=InnoDB
    `)
    await db.query('INSERT IGNORE INTO game_round (id) VALUES (1)')
}

async function withRound(work) {
    return transaction(async (connection) => {
        const [[round]] = await connection.query('SELECT * FROM game_round WHERE id = 1 FOR UPDATE')
        if (round.ends_at <= Date.now()) {
            const integrantes = await listarIntegrantes(connection)
            const pick = () => integrantes[Math.floor(Math.random() * integrantes.length)] || null
            round.integrante = pick()
            round.integrante_qe = pick()
            round.ends_at = Date.now() + config.INTERVALO_MS
            round.songs = null
            round.attempts = round.wins = round.attempts_qe = round.wins_qe = round.attempts_en = round.wins_en = 0
            await connection.query(`
                UPDATE game_round SET ends_at=?, integrante=?, integrante_qe=?, songs=NULL,
                    attempts=0, wins=0, attempts_qe=0, wins_qe=0, attempts_en=0, wins_en=0 WHERE id=1
            `, [round.ends_at, JSON.stringify(round.integrante), JSON.stringify(round.integrante_qe)])
        }
        return work(round, connection)
    })
}

const remaining = (round) => Math.max(0, Math.ceil((round.ends_at - Date.now()) / 1000))

for (const [suffix, columnSuffix] of [['', ''], ['QE', '_qe'], ['EN', '_en']]) {
    const attempts = 'attempts' + columnSuffix
    const wins = 'wins' + columnSuffix
    const stats = (round) => ({
        ['intentosTotales' + suffix]: round[attempts],
        ['aciertos' + suffix]: round[wins],
    })
    if (suffix !== 'EN') {
        router.get('/integrante' + suffix, async (_req, res) => {
            const round = await withRound((current) => current)
            const integrante = round['integrante' + columnSuffix]
            if (!integrante) return res.status(404).json({ error: 'Sin integrantes para esta ronda' })
            res.json({ integrante, ronda: round.ends_at, tiempoRestante: remaining(round), ...stats(round) })
        })
    }
    router.post('/intento' + suffix, async (req, res) => {
        const { intento, ronda } = req.body || {}
        if (intento !== 0 && intento !== 1) return res.status(400).json({ error: 'Intento inválido' })
        const result = await withRound(async (round, connection) => {
            if (ronda !== round.ends_at) return null
            round[attempts]++
            round[wins] += intento
            await connection.query(`UPDATE game_round SET ${attempts}=?, ${wins}=? WHERE id=1`, [
                round[attempts], round[wins],
            ])
            return stats(round)
        })
        if (!result) return res.status(409).json({ error: 'La ronda cambió' })
        res.json(result)
    })
}

router.get('/random-tracks', async (_req, res) => {
    let round = await withRound((current) => current)
    if (!round.songs) {
        const playlist = await fetchPlaylist()
        const candidates = [...new Set((playlist?.tracks?.data || []).filter((track) => track.preview).map((track) => track.id))]
        const songs = []
        while (songs.length < 3 && candidates.length) {
            songs.push(candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0])
        }
        round = await withRound(async (current, connection) => {
            if (!current.songs && songs.length) {
                await connection.query('UPDATE game_round SET songs=? WHERE id=1', [JSON.stringify(songs)])
                current.songs = songs
            }
            return current
        })
    }
    if (!round.songs?.length) return res.status(404).json({ error: 'Sin canciones asignadas' })
    const tracks = await Promise.all(round.songs.map(async (id) => {
        const response = await fetch(`https://api.deezer.com/track/${id}`, { signal: AbortSignal.timeout(8000) })
        if (!response.ok) return null
        const track = await response.json()
        if (!track?.preview) return null
        return {
            id: track.id,
            title: track.title,
            artist: track.artist.name,
            album: track.album.title,
            preview: track.preview,
            cover: track.album.cover_medium,
        }
    })).catch(() => null)
    if (!tracks?.every(Boolean)) return res.status(503).json({ error: 'No se pudieron cargar las canciones' })
    res.json({
        tracks,
        ronda: round.ends_at,
        tiempoRestante: remaining(round),
        intentosTotalesEN: round.attempts_en,
        aciertosEN: round.wins_en,
    })
})

router.get('/version', (_req, res) => {
    res.json({ version: 0.7 })
})

export default router
