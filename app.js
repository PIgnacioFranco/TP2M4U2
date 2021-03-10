// carga de modulos
const express = require ('express');
const mysql = require ('mysql');
const util = require ('util');
const jwt = require ('jsonwebtoken');
const unless = require ('express-unless');
const bcrypt = require ('bcrypt');

const app = express ();
const puerto = process.env.PORT ? process.env.PORT : 3000;

app.use = (express.json());
app.use (express.urlencoded()); // decodifica la url, recibe desde el cliente
app.use (express.json()); // mapeo de json a obj js
app.use (express.static('static')); // para manejar archivos estaticos

const conexion = mysql.createConnection ({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bdtp'
});

conexion.connect( (error) => {
     if (error) {
        throw error;
    }
    console.log ('Conexión a la BD establecida!');
});

// Para pasar de callback a async-await
const qy = util.promisify(conexion.query).bind(conexion);

/**
 * Base de datos. Registro de alumnos:
 * Tabla: alumnos
 */

 /**
  * Descpción tabla alumnos:
  * id: id del alumno, int,  autoincremental
  * Nombre: nombre del alumno, varchar 50  (obligatorio)
  * Apellido: apellido del alumno, varchar 50 (obligatorio)
  * dni: dni del alumno, int 8 (obligatorio) 
  * constraseña: varchar codificada 100 (obligatorio)
  */

// get devuelve la lista de alumnos
app.get ('/api/alumnos', async (req, res) => {
    try {
        let query = 'SELECT * FROM alumnos';
        let respuesta = await qy (query); 
        //res.send ({"respuesta":respuesta});
        res.json (respuesta);
    }
    catch (error) {
        console.log(error.message);
        res.status(413).send.json (error.message);
    }
});

// post para registrar un alumno
app.post ('/api/registro', async (req, res) => {
    try {
        // verifico que se envio un nombre, apellido y dni
        if (!req.body.nombre || !req.body.apellido || !req.body.dni || !req.body.clave) {
            throw new Error ('Faltaron datos');
        }

        // verifico que no exista un alumno registrado
        let query = 'SELECT * FROM alumnos WHERE (nombre = ? AND apellido = ?) OR dni = ?';
        let respuesta = await qy (query, [req.body.nombre, req.body.apellido, req.body.dni]);

        if (respuesta.length > 0)
            throw new Error ('Ya se registro el alumno');
        
        // se termino la verificación

        // ingreso alumno
        // codifico la contraseña
        const claveEncriptada = await bcrypt.hash (req.body.clave, 10);

        // guardo los datos
        const alumno = {
            nombre: req.body.nombre,
            apellido: req.body.apellido,
            dni: req.body.dni,
            clave: claveEncriptada // falta codificar
        };

        query = 'INSERT INTO alumnos (nombre, apellido, dni, clave) VALUE (?,?,?,?)';
        respuesta = await qy (query, [alumno.nombre, alumno.apellido, alumno.dni, alumno.clave]);
        console.log(respuesta);
        //res.json (respuesta);

        // respuesta.insertId
        const registroInsertado = await query('select * from persona where id=?', [respuesta.insertId]);
        res.json(registroInsertado[0]);

    }
    catch (error) {
        console.log(error.message);
        res.status(413).send ({"error":error.message});
    }
})

// PUT actualiza un registro
app.put ('/api/alumnos/:id', async (req,res) => {
    try {
        const id = req.params.id;
        let consulta = 'SELECT * FROM alumnos WHERE id = ?';
        let respuesta = await qy ( consulta, [id] );
        if (consulta.length > 0)
            throw new Error ('No existe el alumno');
    }
})

// Servidor 
app.listen (puerto, () => {
    console.log('Servidor funcionando por puerto ' + puerto);
});
