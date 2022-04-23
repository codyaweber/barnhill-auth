
/*
Methods for interacting with local redis
*/

"use strict";


const RedisServer = require("redis-server");
const redis = require("redis");
const cluster = require("cluster");
//If REDIS_URL, use that, else default port configuration
const client = redis.createClient(process.env.REDIS_URL);
// To distinguish between environments, but avoid having to host multiple
// redis instances, all keys are prefixed:
// 'd-' for development
// 's-' for staging
// 'p-' for production
const redisKeyPrefix = process.env.REDIS_KEY_PREFIX;

module.exports = {
  get,
  set,
  del
}

//Worker clusters init connection to shared redis client
connectToRedisClient();

function connectToRedisClient() {

  client.on("connect", (err)=>{
    if (err) {
      console.log("Error: " + err.stack);
    }
    console.log(cluster.worker.id + ": Connected to redis client.");
  });

  client.on("error", (err)=>{
    console.log("Redis error: " + err.stack);
  });
}

//Promisified redis client.get
function get(key) {
  const prefixedKey = `${redisKeyPrefix}${key}`
  return new Promise( (resolve,reject) => {
    client.get(prefixedKey, (err, result) => {
      if (err) reject(err);
      resolve(result);
    })
  })
}

//Promisified redis client.set with optional expires (in sec) variable
function set(key, value, expires = null) {
  const prefixedKey = `${redisKeyPrefix}${key}`
  return new Promise( (resolve,reject) => {
    if(typeof expires === "number"){
      client.set(prefixedKey, value, "EX", expires, (err, result) => {
        if (err) reject(err);
        resolve(result);
      })
    } else {
      client.set(prefixedKey, value, (err, result) => {
        if (err) reject(err);
        resolve(result);
      })
    }

  })
}

//Delete provided key
function del(key) {
  const prefixedKey = `${redisKeyPrefix}${key}`
  return new Promise( (resolve, reject) => {
     client.del(prefixedKey, (err, result) => {
       if (err) reject(err);
       resolve(result);
     })
  })
}


//For starting redis server from within node...
// const server = new RedisServer({
//   port: 6379,
//   bin: "./redis-server"
// });
//
// server.open( (err) => {
//   if (err) {
//     console.log("Error starting redis server: " + err.stack);
//     return;
//   }
//
//   console.log("Redis server running...");
// });
