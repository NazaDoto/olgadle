import { Router } from 'express'
import multer from 'multer'
import sharp from 'sharp'
import fs from 'fs'

const router = Router()
const upload = multer({ dest: 'temp/' })

router.post('/login', (req, res) => {
    const { username, password } = req.body
    if (username === 'admin' && password === 'olgadle@4pp') {
        return res.status(200).send('Login exitoso')
    }
    res.status(401).send('Credenciales incorrectas')
})

router.post('/upload', upload.single('imagen'), async (req, res) => {
    const nombre = req.body.nombre || 'integrante'
    const fileName = nombre.replace(/\s+/g, '_').toLowerCase() + '.jpg'
    const outputPath = 'uploads/' + fileName

    await sharp(req.file.path)
        .resize(400)
        .jpeg({ quality: 80 })
        .toFile(outputPath)

    fs.unlinkSync(req.file.path)
    res.json({ url: fileName })
})

router.post('/delete-image', (req, res) => {
    const { img } = req.body
    if (!img) return res.json({ ok: true })
    const filePath = '.' + img
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    res.json({ ok: true })
})

export default router   