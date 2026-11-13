import { Router } from 'express'
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import { unlink } from 'node:fs/promises'
import path from 'node:path'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import sharp from 'sharp'
import config from '../config.js'
import { adminAuth } from '../middleware/auth.js'

const router = Router()
const upload = multer({ dest: config.UPLOAD_TEMP, limits: { fileSize: 5 * 1024 * 1024 } })

router.post('/login', (req, res) => {
    const { username, password } = req.body || {}
    const hash = (value) => createHash('sha256').update(value).digest()
    if (!config.ADMIN_PASSWORD) {
        return res.status(503).json({ error: 'Inicio de sesión administrativo sin configurar' })
    }
    if (username !== config.ADMIN_USERNAME || typeof password !== 'string' ||
        !timingSafeEqual(hash(password), hash(config.ADMIN_PASSWORD))) {
        return res.status(401).json({ error: 'Credenciales incorrectas' })
    }
    const token = jwt.sign({}, config.JWT_SECRET, { audience: 'admin', expiresIn: '8h' })
    res.json({ token })
})

router.post('/upload', adminAuth, upload.single('imagen'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Falta la imagen' })
    const fileName = randomUUID() + '.jpg'
    try {
        await sharp(req.file.path)
            .resize(400)
            .jpeg({ quality: 80 })
            .toFile(path.join('uploads', fileName))
        res.json({ url: fileName })
    } finally {
        await unlink(req.file.path)
    }
})

router.post('/delete-image', adminAuth, async (req, res) => {
    const { img } = req.body || {}
    if (!img) return res.json({ ok: true })
    if (typeof img !== 'string' || !/^[\p{L}\p{N}_-]+\.jpg$/iu.test(img)) {
        return res.status(400).json({ error: 'Nombre de imagen inválido' })
    }
    try {
        await unlink(path.join('uploads', img))
    } catch (error) {
        if (error.code !== 'ENOENT') throw error
    }
    res.json({ ok: true })
})

export default router
