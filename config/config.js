const fs = require('fs');
const _ =  require('underscore');
const path = require('path')


var config = {
    keys: {}
};



function getConfig() {
    var hasErrors = false;
    var envKeys = _.keys(process.env)
    
    const expectEnvKeys = [  
        { keyName: "PG_HOST", expectedValue: "A url or IP of the Postgres server" },
        { keyName: "PG_AUTH_USERNAME", expectedValue: "The postgres username of the api authentication user" },
        { keyName: "PG_AUTH_PASSWORD", expectedValue: "The password for the postgres user sepcified in PG_AUTH_USERNAME" },
        { keyName: "PG_DATA_USERNAME", expectedValue: "The postgres username of the api data user" },
        { keyName: "PG_DATA_PASSWORD", expectedValue: "The password for the postgres user sepcified in PG_DATA_PASSWORD" },
        { keyName: "COOKIE_DOMAIN", expectedValue: "The url of the api server, used when setting JWT Cookie Domain" },
    ];
    
    expectEnvKeys.forEach((expectedObj)=>{
        var found = _.find(envKeys, (key)=>{ return key == expectedObj.keyName; });
        if(found == undefined){
            console.error(`Expected Environmental Variable: ${expectedObj.keyName} - Expected: ${expectedObj.expectedValue}`)
            hasErrors = true;
        }else{
            config[expectedObj.keyName] = process.env[expectedObj.keyName];
        }
    })
    
    // Check if the private and public keys exist
    // __dirname is this files directory
    var keysFolderPath = path.join(__dirname, 'keys')
    // Expect output of: ABSOLUTE PATH TO THIS DIRECTORY ROOT/config/keys *No way to trick the key*
    var privKeyPath = path.join(keysFolderPath, 'privkeyBlake.pem')
    var pubKeyPath = path.join(keysFolderPath, "pubkeyBlake.pem")
    
    if(fs.existsSync(privKeyPath)){
        config.keys['private'] = fs.readFileSync(privKeyPath);
    }else{
        // Private Key does not exist
        console.error(`Expected JWT Signing key (RSA 4096 Private key - PEM Format) at Path: ${privKeyPath}`)
        hasErrors = true;
    }
    
    if(fs.existsSync(pubKeyPath)){
        config.keys['public'] = fs.readFileSync(pubKeyPath);
    }else{
        // Public Key does not exist
        console.error(`Expected JWT Signing key (RSA 4096 Privcate key - PEM Format) at Path: ${pubKeyPath}`)
        hasErrors = true;
    }

    if(hasErrors){
        throw newError("Incomplete Config");
    }
}

getConfig();

module.exports = config;