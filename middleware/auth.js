import jwt from 'jsonwebtoken'
import config from '../config.js'

// Middleware para rutas de admin (usuario/password hardcodeado)
export function adminAuth(req, res, next) {
    const { username, password } = req.body
    if (username === 'admin' && password === 'olgadle@4pp') return next()
    res.status(401).json({ error: 'No autorizado' })
}

// Middleware JWT para rutas de place (usuarios registrados)
export function jwtAuth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'Token requerido' })
    try {
        req.user = jwt.verify(token, config.JWT_SECRET)
        next()
    } catch {
        res.status(401).json({ error: 'Token inválido' })
    }
}

// Helper para verificar JWT en socket.io (no es middleware express)
export function verifySocketToken(token) {
    try {
        return jwt.verify(token, config.JWT_SECRET)
    } catch {
        return null
    }
}