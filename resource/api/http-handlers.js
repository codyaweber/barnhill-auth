/*
Manages execution and response/error-handling for HTTP requests
*/

"use strict";

/*
Generic handler for database get calls.
Takes the promise of a database call and responds with:
200 on non-null success
404 on null success
500 on error
*/

const root = require("rootrequire");
const cache = require(root + "/database/cache");
const catcher = require(root + "/shared/error-handling");
const h = require(root + "/database/methods/support/helpers");

module.exports = {
  // These 4 methods:
  // Run submitted method with parameters, process result, update cache if needed,
  // send result back
  tryGet,
  tryPut,
  tryPost,
  tryDelete,
  // No function arguments to run; just process result for caching purposes and send back
  directPost,
  // These 4 methods:
  // Done for real; just send response back
  get, //Gradually replacing get method
  post,
  put,
  del
}

// Execute the method with its params, and send response/error to GET request
// with the Express res object
async function tryGet(method, params, res) {
  let result = await runRequest(method, params, res);
  if(result === undefined) {
    return;
  }
  get(result, res);
}

// Execute the method with its params, and send response/error to POST request
// with the Express res object
async function tryPost(method, params, req, res, cache = false, requiresUserSpecificCache = false) {
  let result = await runRequest(method, params, res);
  if(result === undefined) {
    return;
  }
  
  directPost(result, req, res, cache, requiresUserSpecificCache);
}

function directPost(result, req, res, cache = false, requiresUserSpecificCache = false) {
  if(cache) {
    if(requiresUserSpecificCache) {
      clearETagForUser(req);
    } else {
      cache.clearETagForRequest(req);
    }
  }
  
  post(result, res);
}

// Execute the method with its params, and send response/error to PUT request
// with the Express res object. On succes, clear etag for the request as well.
async function tryPut(method, params, req, res) {
  let result = await runRequest(method, params, res);
  if(result === undefined) {
    return;
  }
  await cache.clearETagForRequest(req);
  put(result, res);
}

// Execute the method with its params, and send response/error to DELETE request
// with the Express res object
async function tryDelete(method, params, req, res, cache = false, requiresUserSpecificCache = true) {
  let result = await runRequest(method, params, res);
  if(result === undefined) {
    return;
  }
  
  if(cache) {
    if(requiresUserSpecificCache) {
      clearETagForUser(req);
    } else {
      cache.clearETagForRequest(req);
    }
  }
  
  del(result, res);
}


// Ask cache to clear etag for given request
// Strips off the last portion of the url because that is the POST/DELETE
// parameter. GET requests have the exact same format as POST/DELETE except
// they don't have that last parameter. ETags are generated using the GET url,
// so the last parameter in a POST/DELETE request is trimmed so that the url
// matches the GET url and the correct ETag can be wiped.
async function clearETagForUser(req) {
  const cachePerUser = true;
  req.url = req.url.substring(0, req.url.lastIndexOf("/"));
  // Delete stored etag on update
  await cache.clearETagForRequest(req, cachePerUser);
}



/*
Execute the method with its parameters inside a try catch block; if error,
process it, send response, and return undefined. If success, return result.
This method exists to run all requests through the same method to avoid
repeating the same try/catch block all in every middleware file.
*/
async function runRequest(method, params, res) {
  
  params = h.forceArray(params);
  
  try {
    return await method(...params);
  } catch(e) {
    catcher.processError(e, res);
    return;
  }
}



// Handle GET response
function get(result, res) {
  if(result === null) {
    res.sendStatus(404);
    return;
  }

  res.status(200).json(result);
}

function post(result, res) {
  if(result === null) {
    result = "Created";
  }

  res.status(201).json(result);
}

function put(result, res) {
  if(result === null) {
    res.sendStatus(404);
    return;
  }

  res.status(200).json(result);
}

// Send a 204 status. Errors should have been handled before this is called,
// and whether the resource exists or not, 204 is returned.
function del(result, res) {
  res.sendStatus(204);
}


function sendHTTPResponseFromError(error, res) {
  res.setHeader("Content-Type", "application/json");

  //Default error response values
  let httpStatus = 500;
  let httpResponseError = {
    error : "unknown",
    message : "There was an unexpected error with the GET request."
  };

  //Errors intentionally thrown for expected issues don't include a stack trace
  if(error.stack !== undefined) {
    console.log("error.stack !== undefined:\n", error.stack);
  } else {
    if(error.error == "invalid_input") {
      //Request was well-formed, but contained semantically invalid instructions
      httpStatus = 422;
    }
    httpResponseError = error;
  }

  res.status(httpStatus).json(httpResponseError);
}


// Ask cache to clear etag for given request
// Strips off the last portion of the url because that is the POST/DELETE
// parameter. GET requests have the exact same format as POST/DELETE except
// they don't have that last parameter. ETags are generated using the GET url,
// so the last parameter in a POST/DELETE request is trimmed so that the url
// matches the GET url and the correct ETag can be wiped.
async function clearETagForUser(req) {
  const cachePerUser = true;
  req.url = req.url.substring(0, req.url.lastIndexOf("/"));
  // Delete stored etag on update
  await cache.clearETagForRequest(req, cachePerUser);
}
