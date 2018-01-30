//functions
const crypto = require('crypto');
const hash = crypto;
var base32 = require('base32');

/**
 * Generates a random uid from a charset
 * @param len Length of the uid
 * @returns {string} uid
 * @exports
 */

function uid(len) {
    //char is a subset of VSCHAR = %x20-7E
    var buf = [],
        chars = 'ABCDEFGHIJKLMNOPQRSTUWXYZabcdefghijklmnopqerstuwxyz0123456789!*@',
        charlen = chars.length;

    for (var i=0; i < len; ++i){
        buf.push(chars[getRandomInt(0,charlen-1)]);
    }

    return buf.join('');
}


/**
 * Generates a random Integer between min and max
 * Uses Math library
 * @param min
 * @param max
 * @returns {*} random Integer
 * @exports
 */

    function getRandomInt(min,max){
           return Math.floor(Math.random()*(max-min+1))+min;
    }

/**
 * Generated Random Bytes of length len
 * Uses Crypto library
 * @param len
 * @returns {*} random Bytes in base64 encoding
 * @exports
 */

function getRandomBytes_base64(len){
    return crypto.randomBytes(len).toString('base64');
}


/**
 * Generated Random Bytes of length len
 * Uses Crypto library
 * @param len
 * @returns {*} random Bytes in base32 encoding
 * @exports
 */

function getRandomBytes_base32(len){
    return base32.encode(crypto.randomBytes(len));
}

function digest(message, alg){
 return hash.createHash(alg).update(message).digest('base64')
}

function digestWithKey(message,key,alg){
    return hash.createHash(alg,key).update(message).digest('base64');
}




exports.uid= uid;
exports.getRandomInt=getRandomInt;
exports.getRandomBytes_base64=getRandomBytes_base64;
exports.getRandomBytes_base32=getRandomBytes_base32;
exports.digest=digest;
exports.digestWithKey = digestWithKey;