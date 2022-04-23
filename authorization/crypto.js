/*
Crypto methods
*/

"use strict";

const crypto = require("crypto");
const bcrypt = require("bcrypt");


//Set default parameter for salt rounds
bcrypt.defaultHash = bcrypt.hash;
bcrypt.hash = (str, saltRounds = 12) => {
  return bcrypt.defaultHash(str, saltRounds);
}

module.exports = {
  bcrypt,
  sha256,
  randomStringOfLength
};

//Return SHA256 hash of string in hex format
function sha256(str) {
  return crypto.createHash("sha256").update(str).digest("hex");
}

//Return cryptographically secure random string of length n
function randomStringOfLength(n) {
    if (n <= 0) {
        return "";
    }
    let randomString = "";
    try {
      randomString = crypto.randomBytes(Math.ceil(n/2)).toString('hex').slice(0,n);
    }
    catch(exception) {
        /* known exception cause: depletion of entropy info for randomBytes */
        console.error('Exception generating random string: ' + exception);
        /* weaker random fallback */
        randomString = '';
        const r = n % 8;
        const q = (n-r)/8;
        for(let i = 0; i < q; i++) {
            randomString += Math.random().toString(16).slice(2);
        }
        if(r > 0){
            randomString += Math.random().toString(16).slice(2,i);
        }
    }
    return randomString;
}
