import jwt from 'jsonwebtoken'
import config from '../config.js'

export function adminAuth(req, res, next) {
    const [scheme, token] = req.headers.authorization?.split(' ') || []
    if (scheme !== 'Bearer' || !verifyToken(token, 'admin')) {
        return res.status(401).json({ error: 'No autorizado' })
    }
    next()
}

function verifyToken(token, audience) {
    try {
        return jwt.verify(token, config.JWT_SECRET, { audience, algorithms: ['HS256'] })
    } catch {
        return null
    }
}

export function verifySocketToken(token) {
    return verifyToken(token, 'place')
}
