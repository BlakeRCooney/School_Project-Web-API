const express = require('express');
const app = express();
require('dotenv').config();
const config = require('./config/config.js')
var cookieParser = require('cookie-parser')
var cors = require('cors')
const { Pool } = require('pg');


var corsOptions = {
    origin: (origin, callback) => {
        callback(null, [origin])
    },
    credentials: true,
    optionsSuccessStatus: 200,

}


const pool = new Pool({
    host: config.PG_HOST,
    user: config.PG_DATA_USERNAME,
    password: config.PG_DATA_PASSWORD,
    port: 5432,
    database: "Bootcamp"
});


// Use core
app.use(cors(corsOptions))

// Use json body parser
app.use(express.json())
app.use(cookieParser())

//Routes Import
const main = require('./routes/main')
const auth = require('./routes/auth')
const port = 3000;

app.get('/', (req, res) => {
    //Handel API request here
    res.send("Herro World!")
});

//Get ALL products from the products tabe in PostgreSQL
app.get('/data/products', (req, res) => {
    pool.connect()
    .then((client)=>{
        return client
        .query('SELECT * FROM public.products')
        .then((pRes)=>{
            // We Got The List of Products Here
            res.status(200);
            res.json({
                products: pRes.rows
            });
            client.release();
        })
        .catch((err)=>{
            // There is an error
            console.log("DB Error Occured While Fetching Products From DB")
            console.log(err)
            res.status(500);
            res.json({
                error: "A DB Error Has Occured"
            });
            client.release();
        })
    })
});


//Get one product by product id from the products. From products table in PostgreSQL
app.get('/data/products/:id', (req, res) => {
    // Get and verify the id parameter
    
    // Reject if the id is null or not a UUID
    
    pool.connect()
    .then((client)=>{
        return client
        .query('SELECT * FROM public.products WHERE id = $1::UUID', [req.params.id])
        .then((pRes)=>{
            // We Got The List of Products Here
            res.status(200);
            res.json({
                products: pRes.rows // This is where p= Postgres Res= response and this returns the rows in the products table in the Database
            });
            client.release(); // ALWAYS needs to release a client to make sure the connection does not get blocked. This returns the user to the pool
        })
        .catch((err)=>{
            // There is an error
            console.log("DB Error Occured While Fetching Products From DB")
            console.log(err)
            res.status(500);
            res.json({
                error: "A DB Error Has Occured"
            });
            client.release();
        })
    })
});

//Get ALL variant for a particular product id from the products. From variants table in PostgreSQL
app.get('/data/variants/:id', (req, res) => {
    // Get and verify the id parameter
    
    // Reject if the id is null or not a UUID
    
    pool.connect()
    .then((client)=>{
        return client
        .query('SELECT * FROM public.variants WHERE product_id = $1::UUID', [req.params.id])
        .then((pRes)=>{
            // We Got The List of Products Here
            res.status(200);
            res.json({
                variants: pRes.rows // This is where p= Postgres Res= response and this returns the rows in the products table in the Database
            });
            client.release(); // ALWAYS needs to release a client to make sure the connection does not get blocked. This returns the user to the pool
        })
        .catch((err)=>{
            // There is an error
            console.log("DB Error Occured While Fetching Variants From DB")
            console.log(err)
            res.status(500);
            res.json({
                error: "A DB Error Has Occured"
            });
            client.release();
        })
    })
});
app.use("/main", main);
app.use("/auth", auth);
app.listen(port, () => {
    console.log(`API Listening On Port ${port}`)
});