// carga de modulos
const express = require ('express');
const mysql = require ('mysql');
const util = require ('util');

const app = express ();
const puerto = 3000;

app.use (express.urlencoded());
app.use (express.json()); // mapeo de json a obj js
app.use (express.static('static'));

const conexion = mysql.createConnection ({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'registro'
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
  */

// get devuelve la lista de alumnos
app.get ('/api/alumnos', async (req, res) => {
    try {
        let query = 'SELECT * FROM alumnos';
        let respuesta = await qy (query); 
        res.send ({"respuesta":respuesta});
    }
    catch (error) {
        console.log(error.message);
        res.status(413).send ({"error":error.message});
    }
});

// post ingresa un alumno
app.post ('/api/alumnos', async (req, res) => {
    try {
        // verifico que se envio un nombre, apellido y dni
        if (!req.body.nombre || !req.body.apellido || !req.body.dni) {
            console.log(req.body.nombre, req.body.apellido, req.body.dni);
            throw new Error ('Faltaron datos');
        }

        // verifico que ya exista algun dato 
        let query = 'SELECT * FROM alumnos WHERE nombre = ? OR apellido = ? OR dni = ?';
        let respuesta = await qy (query, [req.body.nombre, req.body.apellido, req.body.dni]);

        if (respuesta.length > 0)
            throw new Error ('Ya existe algun dato ingresado');
        
        // se termino la verificación
        // ingreso alumno

        query = 'INSERT INTO alumnos (nombre, apellido, dni) VALUE (?,?,?)';
        respuesta = await qy (query, [req.body.nombre, req.body.apellido, req.body.dni]);
        console.log(respuesta);
        res.send ({"respuesta": respuesta});
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
    console.log('Servidor funcionando por puerto 3000!');
});
