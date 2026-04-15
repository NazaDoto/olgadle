import { Router } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', async (req, res) => {
    const [rows] = await db.query(`
    SELECT i.*, GROUP_CONCAT(p.nombre) programas
    FROM integrantes i
    LEFT JOIN integrante_programa ip ON i.id = ip.id_integrante
    LEFT JOIN programas p ON ip.id_programa = p.id
    GROUP BY i.id
  `)
    const data = rows.map(i => ({
        ...i,
        programas: i.programas ? i.programas.split(',') : [],
    }))
    res.json(data)
})

router.post('/', async (req, res) => {
    const { nombre, genero, rol, canta, hizo, nacio, img } = req.body
    try {
        const [result] = await db.query(
            'INSERT INTO integrantes (nombre, genero, rol, canta, hizo, nacio, img) VALUES (?,?,?,?,?,?,?)',
            [nombre, genero, rol, canta, hizo, nacio, img]
        )
        res.json({ id: result.insertId })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Error al crear integrante' })
    }
})

router.post('/:id', async (req, res) => {
    const { nombre, genero, rol, canta, hizo, nacio, img } = req.body
    await db.query(
        'UPDATE integrantes SET nombre=?, genero=?, rol=?, canta=?, hizo=?, nacio=?, img=? WHERE id=?',
        [nombre, genero, rol, canta, hizo, nacio, img, req.params.id]
    )
    res.json({ ok: true })
})

router.delete('/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM integrante_programa WHERE id_integrante = ?', [req.params.id])
        await db.query('DELETE FROM integrantes WHERE id = ?', [req.params.id])
        res.json({ ok: true })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Error al eliminar integrante' })
    }
})

router.post('/programas/asignar', async (req, res) => {
    const { id_integrante, id_programa } = req.body
    await db.query(
        'INSERT INTO integrante_programa (id_integrante, id_programa) VALUES (?,?)',
        [id_integrante, id_programa]
    )
    res.json({ ok: true })
})

router.post('/programas/quitar', async (req, res) => {
    const { id_integrante, programa } = req.body
    try {
        const [prog] = await db.query('SELECT id FROM programas WHERE nombre = ?', [programa])
        if (!prog.length) return res.status(404).json({ error: 'Programa no encontrado' })
        await db.query(
            'DELETE FROM integrante_programa WHERE id_integrante = ? AND id_programa = ?',
            [id_integrante, prog[0].id]
        )
        res.json({ ok: true })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Error al quitar programa' })
    }
})

export default router