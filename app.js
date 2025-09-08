import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

// Variables para el integrante oculto y control de tiempo
let integranteIndex = null;
let ultimaAsignacion = null;
const INTERVALO_MS = 24 * 60 * 60 * 1000; // 24 horas

// Función que asigna un nuevo integrante
function asignarNuevoIntegrante(totalIntegrantes) {
    integranteIndex = Math.floor(Math.random() * totalIntegrantes);
    ultimaAsignacion = Date.now();
    console.log("Nuevo integrante oculto:", integranteIndex);
}

// Middleware para comprobar si hay que renovar el integrante
function verificarIntegrante(totalIntegrantes) {
    if (!ultimaAsignacion || Date.now() - ultimaAsignacion >= INTERVALO_MS) {
        asignarNuevoIntegrante(totalIntegrantes);
    }
}

// Endpoint
app.get("/integrante", (req, res) => {
    const totalIntegrantes = 32; // ⚠️ Cambiá este valor según la cantidad en tu front

    verificarIntegrante(totalIntegrantes);

    // Calcular tiempo restante en segundos
    const tiempoRestante =
        INTERVALO_MS - (Date.now() - ultimaAsignacion);

    res.json({
        integrante: integranteIndex, // el front usa este número como índice
        tiempoRestante: Math.floor(tiempoRestante / 1000), // en segundos
    });
});

// Iniciar servidor
const PORT = process.env.PORT || 3501;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
