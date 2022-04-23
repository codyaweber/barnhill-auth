
/*
Authentication and authorization middleware
*/

"use strict";

const root = require("rootrequire");
const cluster = require("cluster");
const jwt = require("jsonwebtoken");
const CustomError = require(root + "/shared/CustomError");


module.exports = {
  // setAuthentication,
  authenticate,
  unauthorized
}

//Set authentication status on router based on NODE_ENV
// function setAuthentication(router) {
//   switch (process.env.NODE_ENV) {
//     case "production":
//       router.use("/", this.authenticate);
//       router.use(this.unauthorized);
//       break;
//     case "development":
//       router.use("/", this.authenticate);
//       router.use(this.unauthorized);
//       // console.log(cluster.worker.id + ": Authentication for development environment is disabled.");
//       break;
//     default:
//       console.log("Unexpected NODE_ENV value: " + process.env.NODE_ENV);
//       break;
//   }
// }

// Return jwt callback, which handles authorization of api requests
function authenticate(req, res, next) {
  const tokenData = getAuthToken(req);
  if(tokenData === null) {
    const err = new CustomError("missing_credentials", "No authorization was included in the request.");
    next(err);
    return;
  }

  const {token, csrf} = tokenData;
  const { useragent } = req;

  if(token === null) {
    const err = new CustomError("missing_credentials", "No authorization was included in the request.");
    next(err);
    return;
  }
  
  const privateKey = process.env.JWT_SIGNING_KEY;
  
  jwt.verify(token, privateKey, (err, decodedToken) => {
    if(err) {
      console.log("Error: ", err);
      return next(err);
    }

    try {
      verifyJWTPayload(decodedToken, csrf, useragent);
    } catch(error) {
      return next(error);
    }
    
    const scopesArr = decodedToken.scope.split(' ');
    
    req.user = {
      id : decodedToken.sub,
      scope : decodedToken.scope,
      scopes : scopesArr,
      role : decodedToken.role
    };
    
    next();
  });
}

// Retrieve auth token (and optional csrf token) from request if present
function getAuthToken(req) {
  let token = null;
  let csrf = null;

  if(req.get("Authorization") !== undefined) {
    //Get auth from auth header
    const authHeader = req.get("Authorization");
    token = authHeader.split(" ")[1];
  } else if(req.cookies["barnhilldash_reacttokens"] !== undefined) {
    const cookieObj = req.cookies["barnhilldash_reacttokens"];
    token = cookieObj.accessToken;
    csrf = cookieObj.csrfToken;
  }

  if(token === null || token === undefined) {
    return null;
  }

  const tokenData = {
    token : token,
    csrf : csrf
  };
  
  return tokenData;
}

function verifyJWTPayload(payload, csrf, userAgent) {

  // Only check csrf if the jwt includes it
  if(payload.csrf !== undefined && payload.csrf !== csrf) {
    throw new CustomError("invalid_auth", "Invalid csrf token.");
  }

  if(!tokenIsFresh(payload)) {
    throw new CustomError("auth_expired", "The access token expired.");
  }

  if(!tokenClaimsValid(payload, userAgent)) {
    throw new CustomError("invalid_token", "The access token provided is invalid.");
  }
}

//Return true if payload is fresh (unexpired, and issued)
function tokenIsFresh(payload) {
  const date = new Date();
  const now = date.getTime() / 1000;
  //Ensure expiration isn't past, and issued at isn't future
  return payload.exp > now &&
          payload.iat < now;
}

function tokenClaimsValid(payload, userAgent) {
  const azp = process.env.BROWSER_CLIENT_ID;
  const aud = process.env.AUD;
  const iss = process.env.ISS;

  if(payload.aud !== aud ||
    payload.iss !== iss ||
    payload.azp !== azp) {
      return false;
  }

  return true;
}

// Response for unauthorized route call
function unauthorized(err, req, res, next) {
  let errTitle = "auth_error";
  let errMessage = "Invalid authorization.";
  let code = 401;

  // const error = new CustomError("auth_error", "Unknown authorization error.");
  // console.log(typeof err);
  switch(err.constructor.name) {
  case "TokenExpiredError":
    errTitle = "token_expired";
    errMessage = "The submitted authorization token is expired.";
    break;

  case "JsonWebTokenError":
    errTitle = "missing_credentials";
    errMessage = "No authorization was included in the request.";
    break;

  case "CustomError":
    errTitle = err.error;
    errMessage = err.message;
    break;

  default:
    break;
  }

  const jsonError = new CustomError(errTitle, errMessage);
  return res.status(code).json(jsonError);
}
