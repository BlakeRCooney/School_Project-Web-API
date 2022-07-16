const express = require('express');
const router = express.Router();
const _ = require('underscore');
const bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
const config = require('../config/config.js')

const { Pool } = require('pg');
const checkAuth = require('../middleware/checkAuth.js')

const pool = new Pool({
    host: config.PG_HOST,
    user: config.PG_AUTH_USERNAME,
    password: config.PG_AUTH_PASSWORD,
    port: 5432,
    database: "Bootcamp"
});

pool.on('error', (err, client) =>{
    console.error('Unexpected error in idle client', err)
    process.exit(-1);
});

router.post("/create", (req, res) =>{
    const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    /* 
    body expects
    username - MUST BE VALID EMAIL ADDRESS
    password - not null, not blank
    */
    
    var username = _.get(req, ["body", "username"], null);
    var password = _.get(req, ["body", "password"], null);

    var result = {}

    if(username == null || password == null){
        // Send 400 bad request to the user
        res,sendStatus(400);
    }else{
        // Check to see if username is a valid email address ( implies text)
        // Check Username
        if(username.toString().match(emailRegex)){
            // Then its an email
            // Rules for passwords
            // - Must be String
            // - Cannot be blank
            if(_.isString(password) && password.length > 0){
                // Password is a String of at laest length 1
                // Hash the password and add Salt
                bcrypt.hash(password, 10, (err, hash) => {
                    if(!!err){
                        console.log(err);
                        res.status(500);
                        result.error = "Something went wrong while creating new user"
                        res.json(result);
                        return false;
                    }

                    var obj = {
                        username: username,
                        passHash: hash
                    };
                    // Insert into Database
                    try {
                        pool.connect((err, client, done)=>{
                            if(err) throw err;
                            client.query(
                                `INSERT INTO auth.users(username, passhash)
                                VALUES ($1::TEXT, $2::TEXT)`, 
                                [obj.username, obj.passHash],
                                (err, pgResult) =>{
                                    done();
                                    if(err){
                                        // It failed
                                        console.log(err);
                                        res.status(500);
                                        result.error = "A DB Error has occured"
                                        res.json(result);
                                    }else{
                                        // It was successful
                                        result.result = "User Created";
                                        res.status(201);
                                        res.json(result);
                                        return true;
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
                })
            }else{
                // Password is not a String
                res.status(400);
                result.error = "Password Must be a String"
                res.json(result);
            }
        }else{
            // Its not an email
            res.status(400);
            result.error = ["Username must be a Valid Email"]
            res.json(result);
        }
        // Check to see if passwrod is a text value and not null
        // We are safe to just insert the value into the database
    }
})

router.post("/login", (req, res)=>{
    const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    /* 
    body expects
    username - MUST BE VALID EMAIL ADDRESS
    password - not null, not blank
    */
    
    var username = _.get(req, ["body", "username"], null);
    var password = _.get(req, ["body", "password"], null);

    var result = {}

    if(username == null || password == null){
        // Send 400 bad request to the user
        res.sendStatus(400);
    }else{
        // Check to see if username is a valid email address ( implies text)
        // Check Username
        if(!username.toString().match(emailRegex)){
            // Its not an email
            res.status(400);
            result.error = "Username must be a Valid Email"
            res.json(result);
            return false;
        }
        if(!_.isString(password) || password.length == 0){
            // Password is not a String
            res.status(400);
            result.error = "Password Must be a String"
            res.json(result);
            return false;
        }
        // Put try statement
        try {
            pool.connect((err, client, done)=>{
                if(err) throw err;
                client.query(`
                    SELECT id, passhash FROM auth.users WHERE username = $1::TEXT`,
                    [username],
                    (err, pgResult)=>{
                        done();
                        // The Query can return 0 rows 
                        // Can return 1 row
                        // Can return an Error
                        if(err){
                            // It failed
                            console.log(err);
                            res.status(500);
                            result.error = "A DB Error has occured"
                            res.json(result);
                            return false;
                        }else if(pgResult.rowCount > 0){
                            // It was successful
                            // Compair the Hash to the password provided
                            bcrypt.compare(password, pgResult.rows[0].passhash, (err, bResult) =>{
                                if(err){
                                    console.log(err);
                                    res.status(500);
                                    result.err = "A DB Error has occured"
                                    res.json(result);
                                    return false;
                                }
                                if(!!bResult){
                                    try {
                                        pool.connect((err, client, done)=>{
                                            if(err) throw err;
                                            client.query(
                                                `INSERT INTO auth.tokens(user_id)
                                                VALUES ($1::UUID) RETURNING id`, 
                                                [pgResult.rows[0].id],
                                                (err, tokenRes) =>{
                                                    done();
                                                    if(err){
                                                        // It failed
                                                        console.log(err);
                                                        res.status(500);
                                                        result.error = "A DB Error has occured"
                                                        res.json(result);
                                                    }else{
                                                        var token_id = tokenRes.rows[0].id
                                                        // It was successful
                                                        // Create a JWT
                                                        // - With Claim - token_id
                                                        var payLoad = {
                                                            tokenID: token_id
                                                        }
                                                        var jwtOptions = {
                                                            algorithm: 'RS256',
                                                            expiresIn: '14 days',
                                                            jwtid: token_id
                                                        }
                                                        jwt.sign(payLoad, config.keys.private, jwtOptions, (err, signedJWT)=>{
                                                            if(!!err) throw err;
                                                            //Put that JWT in a cookie
                                                            res.cookie("bootcamp", signedJWT, {
                                                                domain: config.COOKIE_DOMAIN,
                                                                expires: new Date(Date.now() + (14 * 24 * 60 * 60 * 1000)),
                                                                secure: true,
                                                                httpOnly: true,
                                                            })
                                                            // Return the cookie to the user
                                                            res.status(200)
                                                            result = {
                                                                login: "OK"
                                                            };
                                                            res.json(result)
                                                            return true;
                                                        })
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
                                    res.status(400);
                                    result.error = "Username or Password invalid"
                                    res.json(result);
                                    return false;
                                }
                            })
                        }else{
                            // This user does not exist
                            res.status(400);
                            result.error = "Username or Password invalid"
                            res.json(result);
                            return false;
                        }            
                })
            })
        } catch (error) {
            console.log(error);
            res.status(500);
            result.error = "A DB Error has occured"
            res.json(result);
        }
    }
        // Check to see if passwrod is a text value and not null
        // We are safe to just insert the value into the database

    /*
        JSON Body

        username
        password

    */

        // Validate the inputs

        // Fetch the hashed password for THIS user fron the database

        //Compair the hash password provided

        // Put that JWT into a cookie

        //
})

router.get("/logout", (req, res)=>{
    var result = {}
    if(_.has(req.cookies, 'bootcamp')){
        var jwtVarifyOptions = {
            algorithm: 'RS256'
        }
        jwt.verify(req.cookies.bootcamp, config.keys.public, jwtVarifyOptions, (err, decoded)=>{
            if (!!err) {
                res.clearCookie("bootcamp");
                console.log(err)
                result.error="Unable to Verify JWT"
                res.status(200)
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
                            `DELETE FROM auth.tokens WHERE id = $1::UUID
                            OR added_on < (CURRENT_TIMESTAMP - '14 days'::INTERVAL)`, 
                            [tokenID],
                            (err, pgResult) =>{
                                done();
                                if (err) {
                                    res.clearCookie("bootcamp");
                                    // It failed
                                    console.log(err);
                                    res.status(500);
                                    result.error = "A DB Error has occured"
                                    res.json(result);
                                }else{
                                    // It was successful
                                    res.status(204);
                                    res.clearCookie("bootcamp");
                                    res.send();
                                    return true;
                                }
                            }
                        )
                    })
                } catch (error) {
                    console.log(error);
                    res.clearCookie("bootcamp");
                    res.status(500);
                    result.error = "A DB Error has occured"
                    res.json(result);
                }
            } else {
                res.clearCookie("bootcamp")
                console.log('Decoded was Undefined')
                res.status(200)
                res.send();
                return false;
            }
        })
    } else {
        res.status(200);
        result = {
            logout: "No Cookie"
        }
        res.json(result);
    }
})

router.get("/status", checkAuth, (req, res) => {
    // If we run this function, the user has a valid login
    res.sendStatus(200);
})
/* 
    Todo:
    - Create Login Endpoint
        - Include creation of cookies
        - Include JWT in cookie
            - Create JWT
        - Implement middleware for JWT cookie check
    - Create every other endpoint
        - Create new Todo list
        - Create new Todo item
        - Update Todo item
*/

module.exports = router;
