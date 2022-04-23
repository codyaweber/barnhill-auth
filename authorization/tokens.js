/*
Methods for generating and updating auth tokens
*/

"use strict";

const root = require("rootrequire");
const dbAuth = require(root + "/authorization/db-auth");
const jwt = require("jsonwebtoken");
const crypto = require(root + "/authorization/crypto");
const CustomError = require(root + "/shared/CustomError");
const s = require(root + "/resource/statics/sql");

module.exports = {
  createNewTokensForUser,
  checkIfRefreshTokenIsValid
}

// Return access token and conditional refresh token with info for userId - throws
async function createNewTokensForUser(userId, role, grantType, userAgent) {
  
  let standardScopes = [];
  let customScopes = [];
  try {
    const standardScopesPr = dbAuth.selectStandardScopesForUserId(userId);
    const customScopesPr = dbAuth.selectCustomScopesForUserId(userId);
    ([standardScopes, customScopes] = await Promise.all([standardScopesPr, customScopesPr]));
  } catch(e) {
    console.log("Error fetching custom scopes: ", e);
    throw e;
  }
  
  const allScopesArr = standardScopes.concat(customScopes);
  const scope = allScopesArr.join(" ");
  
  const expiresIn = userAgent.isApp ? process.env.MOBILE_ACCESS_TOKEN_LIFETIME : process.env.BROWSER_ACCESS_TOKEN_LIFETIME;
  const tokenRes = {
    expiresIn: parseInt(expiresIn),
    scope: scope,
    tokenType: "Bearer"
  }

  const tokenData = await createAccessTokenForUser(userId, role, scope, grantType, userAgent);
  const { accessToken } = tokenData;

  tokenRes.accessToken = accessToken;
  
  // No refresh tokens for browser
  const shouldGenerateRefreshToken = userAgent.isApp && scope.includes("offline_access") && grantType === "password";
  if(shouldGenerateRefreshToken) {
    // If issuing a new refresh token, delete any previous ones
    const del = await dbAuth.deleteRefreshTokensForUser(userId);
    tokenRes.refreshToken = await createRefreshTokenForUser(userId, grantType);
  }

  // Add csrf to response if request is from browser
  if(!userAgent.isApp) {
    tokenRes.csrfToken = tokenData.csrfToken;
  }

  return tokenRes;
}


// Return boolean for whether the refresh token is valid
// (i.e. hash is found, and not expired or blacklisted)
function checkIfRefreshTokenIsValid(tokenRow) {

  const issuedAt = tokenRow[s.col_issuedAt];
  const issuedTo = tokenRow[s.col_issuedTo];
  const lastUsed = tokenRow[s.col_lastUsed];
  const blacklisted = tokenRow[s.col_blacklisted];

  const refreshTokenLifetime = parseInt(process.env.REFRESH_TOKEN_LIFETIME);
  const now = Math.floor(Date.now() / 1000);

  //Refresh tokens have sliding lifetime, so check lastUsed date, or else issuedAt
  const tokenBirth = lastUsed || issuedAt;

  //If tokenBirth plus lifetime is earlier than current moment, it's expired
  if( (tokenBirth + refreshTokenLifetime) < now ) {
    return false;
  }

  if(blacklisted) {
    return false;
  }

  return true;
}













/* ----- Helper functions (not exported)----- */

async function createAccessTokenForUser(userId, role, scope, grantType, userAgent) {

  if(grantType === "refresh_token") {
    grantType = [
      "refresh_token",
      "password"
    ];
  }
  
  const azp = userAgent.isApp ? process.env.IOS_CLIENT_ID : process.env.BROWSER_CLIENT_ID;
  const aud = process.env.AUD;
  const iss = process.env.ISS;

  const now = Math.floor(Date.now() / 1000);

  const expiresIn = userAgent.isApp ? process.env.MOBILE_ACCESS_TOKEN_LIFETIME : process.env.BROWSER_ACCESS_TOKEN_LIFETIME;
  
  let payload = {
    iss: iss,
    sub : userId,
    aud: aud,
    iat: now,
    exp: now + parseInt(expiresIn),
    azp: azp,
    scope: scope,
    role: role,
    gty: grantType
  };

  let csrfToken = null;
  // Only use csrfToken when we're sending auth info in cookie
  if(!userAgent.isApp) {
    csrfToken = crypto.randomStringOfLength(32);
    payload.csrfToken = csrfToken;
  }

  const privateKey = process.env.JWT_SIGNING_KEY;
  const accessToken = jwt.sign(payload, privateKey);

  return {
    accessToken,
    csrfToken
  };
}


// Create, store, and return new refresh token for userId
function createRefreshTokenForUser(userId) {
  // Note - don't change this value. The database depends on 48 character refresh tokens
  const tokenLength = 48;
  const refreshToken = crypto.randomStringOfLength(tokenLength);

  return dbAuth.insertRefreshToken(refreshToken, userId)
  .then(() => { // newTokenRow passed in here, but it's not needed
    return refreshToken;
  })
}
