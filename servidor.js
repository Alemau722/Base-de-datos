import express from 'express'; // Importa la librería Express para gestionar el servidor web y rutas
import dotenv from 'dotenv'; // Importa dotenv para leer las variables del archivo .env
import mysql from 'mysql2/promise'; // Importa el cliente de MySQL con soporte para promesas (async/await)
import cors from 'cors'; // Importa CORS para permitir peticiones HTTP desde dominios externos

dotenv.config(); // Carga las variables de entorno dentro del objeto process.env

const app = express(); // Inicializa la aplicación de Express
const port = process.env.PORT || 3000; // Asigna el puerto del entorno o el 3000 por defecto
let connection;  // Declara la variable global que almacenará la conexión a MySQL

app.use(cors());            // Aplica el middleware para habilitar peticiones entre diferentes orígenes
app.use(express.json());    // Aplica el middleware para parsear cuerpos de peticiones en formato JSON

async function connectionDB() {     // Declara la función asíncrona para conectar la base de datos
    try {                          

        connection = await mysql.createConnection({         // Crea y guarda la conexión conectando a la BD
            host: process.env.DB_HOST,                      // Dirección del servidor de la BD (ej. localhost)
            port: Number(process.env.DB_PORT),              // Puerto del servidor MySQL convertido a número
            user: process.env.DB_USER,                      // Usuario de la BD
            password: String(process.env.DB_PASS || ''),    // Contraseña convertida a texto
            database: process.env.DB_NAME,                  // Nombre de la base de datos
        
        });
        console.log('Conexion exitosa');    
    } catch (e) {  
        console.log('TRONO DE MEXICO', e);
    } 
}

connectionDB().then(() => { // Llama a la función y espera a que termine para iniciar el servidor
    app.listen(port, () => { // Pone al servidor a escuchar peticiones en el puerto asignado
        console.log(`Servidor en linea en el puerto ${port}`);
    }); 
}); 

app.get('/', (req, res) => { // Define una ruta GET de prueba en la raíz del servidor
    res.send('<h1>Hola Xavi</h1>');
}); 

app.get('/usuarios', async (req, res) => { // Define una ruta GET para obtener los usuarios
    try {
        const [rows] = await connection.query(                              // Ejecuta la consulta SQL y desestructura obteniendo las filas
            'SELECT nombre, apellidos, correo, password FROM usuarios'      // Sentencia SQL SELECT
        ); 
        res.json(rows);     // Responde enviando la lista de usuarios en formato JSON
    } catch (e) {           
        console.error('Conexion fracasada', e); 
        res.status(500).send('Error en el servidor'); 
    } 
}); 

app.get('/usuarios/:correo', async (req, res) => {
    try { 
        const { correo } = req.params;              // Extrae el parámetro 'correo' pasado desde la URL
        const [rows] = await connection.query(      // Ejecuta la consulta de forma parametrizada para seguridad
            'SELECT * FROM usuarios WHERE correo = ?', [correo] // Busca el registro que coincida con el correo
        );

        if (rows.length === 0) {                                                // Evalúa si la lista devuelta no contiene ningún elemento
            return res.status(404).json({ message: 'Usuario no encontrado' });
        } 
        res.json(rows[0]);  // Responde con el objeto del usuario encontrado (primer elemento)
    } catch (e) {          
        console.error(e);   
        res.status(500).json({ error: 'Error al buscar el usuario' });  
    }
}); 

app.post('/usuarios', async (req, res) => { // Define ruta POST para registrar o crear un nuevo usuario
    try { 
        const { nombre, apellidos, correo, password } = req.body; // Extrae las propiedades enviadas en el body JSON

        if (!nombre || !apellidos || !correo || !password) { // Verifica si falta alguno de los datos obligatorios
            return res.status(400).json({ ok: false, error: 'Faltan datos obligatorios' }); 
        } 

        const [result] = await connection.query( // Ejecuta la inserción en la base de datos
            'INSERT INTO usuarios (nombre, apellidos, correo, password) VALUES (?, ?, ?, ?)', // Sentencia SQL INSERT
            [nombre, apellidos, correo, password] // Arreglo con los valores de los marcadores '?'
        ); 
        res.status(201).json({ ok: true, id: result.insertId, nombre, apellidos, correo }); // Responde con HTTP 201 Created y los datos guardados
    } catch (e) { 
        console.error(e); 
        res.status(500).json({ ok: false, error: 'Error al crear usuario' }); 
    } 
});

app.put('/usuarios/:correo', async (req, res) => { // Define ruta PUT para modificar datos de un usuario por correo
    try { 
        const { correo } = req.params; // Extrae el parámetro correo de la URL
        const { nombre, apellidos, password } = req.body; // Extrae los nuevos datos a actualizar desde el body
        const [result] = await connection.query( // Ejecuta la actualización y obtiene el resultado
            'UPDATE usuarios SET nombre = ?, apellidos = ?, password = ? WHERE correo = ?', // Consulta UPDATE
            [nombre, apellidos, password, correo] // Pasa los valores parametrizados
        ); 

        if (result.affectedRows === 0) { // Comprueba si no se modificó ninguna fila (usuario no encontrado)
            return res.status(404).json({ message: 'Usuario no encontrado' }); 
        } 
        res.json({ message: 'Usuario actualizado correctamente' }); 
    } catch (e) { 
        console.error(e); 
        res.status(500).json({ error: 'Error al actualizar usuario' }); 
    } 
}); 

app.delete('/usuarios/:correo', async (req, res) => { // Define ruta DELETE para borrar un usuario por correo
    try { 
        const { correo } = req.params; // Extrae el correo remitido en los parámetros de la URL
        const [result] = await connection.query( // Ejecuta el borrado SQL en la base de datos
            'DELETE FROM usuarios WHERE correo = ?', [correo] // Sentencia SQL DELETE parametrizada
        ); 

        if (result.affectedRows === 0) { // Evalúa si la consulta no afectó ningún registro
            return res.status(404).json({ message: 'Usuario no encontrado' }); 
        } 
        res.json({ message: 'Usuario eliminado correctamente' }); 
    } catch (e) { 
        console.error(e); 
        res.status(500).json({ error: 'Error al eliminar usuario' }); 
    } 
}); 