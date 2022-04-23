
"use strict";


const root = require("rootrequire");
const etag = require("etag");
const redis = require(root + "/database/local-redis");
const s = require(root + "/resource/statics/sql");

// Send 304 to fresh requests, else generate response and cache etag value
function cache(maxAge = 86400, requireUserIdInKey = false) {
  return function(req, res, next) {
    return checkFresh(req, requireUserIdInKey)
    .then( result => {
      if (result === true) {
        res.sendStatus(304);
        return;
      } else {
        wrapResponseMethod(req, res, maxAge, requireUserIdInKey);
        next();
      }
    })
    .catch( err => {
      console.log("Error caching: " + err.stack);
      next();
    })
  }
}

// Return boolean for freshness of request based on etag value
const checkFresh = function(req, requireUserIdInKey = false) {
  const key = generateKeyFor(req, requireUserIdInKey);

  return redis.get(key)
  .then( result => {
    const eTagReq = req.header("If-None-Match");

    // If no etag, request is stale
    if (!eTagReq) return false;

    // Request is only fresh if this is true
    return (eTagReq === result);
  })
  .catch( err => {
    console.log("Error fetching key " + key + " from redis:" + err.stack);
    return false;
  })
}


// Wrap HTTP response method to cache before sending
function wrapResponseMethod(req, res, maxAge, requireUserIdInKey = false) {
  res.sendResponse = res.send;
  res.send = (body) => {
    if(res.statusCode === 404) {
      res.sendResponse(body);
      return;
    }
    
    const eTagGenerated = generateEtag(body);

    const key = generateKeyFor(req, requireUserIdInKey);

    return redis.set(key, eTagGenerated)
    .then( () => {
      res.setHeader("Etag", eTagGenerated);
      //Cache is good for maxAge, and only valid for single user (not
      //any intermediate caches)
      res.setHeader("Cache-Control", `max-age=${maxAge}, private`);
      res.sendResponse(body);
    })
    .catch( err => {
      console.log("Error caching response etag value: " + err.stack);
      res.sendStatus(500);
    })
  }
}

// Generate the redis key for given request
function generateKeyFor(req, requireUserIdInKey) {
  let key = "";
  // If requested, prepend the user's id to the key to mark it as unique per user
  if(requireUserIdInKey === true) {
    key += req.user.id.toString();
  }

  key += req.url;

  return key;
}

// Use the given parameters to generate a redis key and clear the etag stored there
function clearETagForRequest(req, requireUserIdInKey = false, trimRoute = false) {
  const key = generateKeyFor(req, requireUserIdInKey, trimRoute);
  return redis.del(key);
}


// Generate etag from object after stringifying. When express generates etags,
// it uses the body object after stringifying, so this method does the same
// for consistency's sake
const generateEtag = function(obj) {
  const str = JSON.stringify(obj);
  return etag(str, { weak: true });
}



module.exports = {
  cache,
  clearETagForRequest
};
