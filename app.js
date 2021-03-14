// carga de modulos
const express = require ('express');
const mysql = require ('mysql');
const util = require ('util');
const jwt = require ('jsonwebtoken');
const unless = require ('express-unless');
const bcrypt = require ('bcrypt');
//const { send } = require('process');

const app = express ();
const puerto = process.env.PORT ? process.env.PORT : 3000;

app.use (express.static('static')); // para manejar archivos estaticos
app.use (express.urlencoded()); // decodifica la url, recibe desde el cliente
app.use = (express.json());

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

//// Para pasar de callback a async-await
const qy = util.promisify(conexion.query).bind(conexion);

// autetificación
const auth = (req,res,next) => {
    try {
       let token = req.headers ['Authorization'] ;
       if (!token)
        throw new Error ('NO estas logueado');

        token = token.replace ('Bearer ','');

        jwt.verify (token, 'Secret', (err, user) => {
            if (err)
            throw new Error ('Token invalido');
        });

        next ();
    } catch (error) {
        res.status(413).send ({erro: error.message});
    }
};

// permite ejecutar una api sin pasar por la verificacion token
app.use (auth.unless ({
    path: [
        {url: '/api/login', methods:['POST']},
        {url: '/api/registro', methods:['POST']}
    ],
}),
);

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
//
//// post para registrar un alumno
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
            clave: claveEncriptada 
        };
        // inserto los datos en la BD
        query = 'INSERT INTO alumnos (nombre, apellido, dni, clave) VALUE (?,?,?,?)';
        respuesta = await qy (query, [alumno.nombre, alumno.apellido, alumno.dni, alumno.clave]);
        //console.log(respuesta);
        res.json (respuesta);

        // respuesta.insertId , busca el alumno ingresado a la BD por medio del inserId que retorna BD indicando que 
        // se realizo el ingreso correctame
        query = 'SELECT * FROM persona WHERE id = ?'
        const registroInsertado = await qy(query, [respuesta.insertId]);
        res.json(registroInsertado[0]);

    }
    catch (error) {
        console.log(error.message);
        res.status(413).send ({"error":error.message});
    }
});

// login api
app.post ('/api/login', async (req,res) => {
    try {
        if ( !req.body.dni || !req.body.clave )
            throw new Error ('Falta usuario/constraseña');

        // traigo al usuario
        let query = 'SELECT * FROM alumnos WHERE dni = ?';
        const usuario = await qy(query, req.body.dni);
        if (usuario.length == 0)
            throw new Error ('usuario y constraseña incorrectos');

        const claveCoincide = await bcrypt.compareSync(req.body.clave, usuario[0].clave);
        if (!claveCoincide)
            throw new Error ('usuario y contraseña incorrectos');

        // inicio sesión
        const tokenData = {
            nombre: usuario[0].nombre,
            apellido: usuario[0].apellido,
            dni: usuario[0].dni,
            user_id: usuario[0].id
        };

        const token = jwt.sign(tokenData, 'Secret', {
            expiresIn: 60*60*24, // 24 hs de login
        });
        res.send({token});
    } 
    catch (error) {
       res.status(413).send(error.message);
    }
})

// get devuelve la lista de alumnos
app.get ('/api/alumnos', async (req, res) => {
    try {
        let query = 'SELECT nombre, apellido, dni FROM alumnos';
        let respuesta = await qy (query); 
        res.send ({"respuesta":respuesta});
        //res.json (respuesta); 
    }
    catch (error) {
        console.log(error.message);
        res.status(413).send.json (error.message);
    }
});


// PUT actualiza un registro
app.put ('/api/alumnos/:id', async (req,res) => {
    try {
        const id = req.params.id;
        let consulta = 'SELECT * FROM alumnos WHERE id = ?';
        let respuesta = await qy ( consulta, [id] );
        if (consulta.length > 0)
            throw new Error ('No existe el alumno');
    }
    catch (error) {
        console.log(error.message);
        res.status(413).send ({"error":error.message});
    }
});

// Servidor 
app.listen (puerto, () => {
    console.log('Servidor funcionando por puerto ' + puerto);
});
