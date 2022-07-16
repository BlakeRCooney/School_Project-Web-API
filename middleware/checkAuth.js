var jwt = require('jsonwebtoken');
const config = require('../config/config.js')
const _ = require('underscore');

const { Pool } = require('pg');
const { application } = require('express');

const pool = new Pool({
    host: config.PG_HOST,
    user: config.PG_AUTH_USERNAME,
    password: config.PG_AUTH_PASSWORD,
    port: 5432,
    database: "Bootcamp"
});

// This was creating new Schema in the DB, Not sure if it will be needed at a later date so leave it commented out
// const products = new Schema({
//     category: String,
//     name: String,
//     price: Number,
//     description: String,

// })

pool.on('error', (err, client) =>{
    console.error('Unexpected error in idle client', err)
    process.exit(-1);
});

function checkAllAuthMethods(req, res, next){
    var result = {};
    if(_.has(req.cookies, 'bootcamp')){
        var jwtVarifyOptions = {
            algorithm: 'RS256'
        }
        jwt.verify(req.cookies.bootcamp, config.keys.public, jwtVarifyOptions, (err, decoded)=>{
            if(!!err){
                console.log(err)
                result.error="No Auth Detected, Please Login"
                res.status(403)
                res.json(result);
                return false;
            }
            // Has been decoded Successfully
            if(decoded != undefined){
                var tokenID = decoded.tokenID;
                try {
                    pool.connect((err, client, done)=>{
                        if(err) throw err;
                        client.query(
                            `SELECT id, user_id FROM auth.tokens WHERE id = $1::UUID
                            AND added_on > (CURRENT_TIMESTAMP - '14 days'::INTERVAL)`, 
                            [tokenID],
                            (err, pgResult) =>{
                                done();
                                if(err){
                                    // It failed
                                    console.log(err);
                                    res.status(500);
                                    result.error = "A DB Error has occured"
                                    res.json(result);
                                }else if(pgResult.rowCount == 1){
                                    // It was successful
                                    req.user = pgResult.rows[0].user_id
                                    next();
                                }else{
                                    res.status(403);
                                    result.error="No Auth Detected, Please Login"
                                    res.status(403)
                                    res.json(result);
                                    return false;
                                }
                            }
                        )
                    })
                } catch (error) {
                    console.log(error);
                    res.status(500);
                    result.error = "A DB Error has occured"
                    res.json(result);
                }
            }else{
                console.log('Decoded was Undefined')
                res.status(200)
                res.send();
                return false;
            }
        })
    }else{
        result.error="No Auth Detected, Please Login"
        res.status(403)
        res.json(result);
        return false;
    }
}

module.exports = checkAllAuthMethods;