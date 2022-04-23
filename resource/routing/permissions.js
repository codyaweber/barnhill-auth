/*
Middleware to handle checking permissions for routes
*/
"use strict";


const root = require("rootrequire");
// List of application scopes
const sc = require(root + "/authorization/rbac/scopes");
const CustomError = require(root + "/shared/CustomError");


// Return a middleware method to compared expectedScopes with request
// authorization scopes
function checkScopes(expectedScopes, options) {

  return (req, res, next) => {

    // No scopes required; next
    if (expectedScopes.length === 0) {
      return next();
    }

    let userScopes = [];
    let scopeKey = "scope";
    if (options &&
      options.customScopeKey !== null &&
      typeof options.customScopeKey === 'string') {
      scopeKey = options.customScopeKey;
    }

    if (!req.user) {
      return scopeError(res, expectedScopes);
    }

    if (typeof req.user[scopeKey] === 'string') {
      userScopes = req.user[scopeKey].split(' ');
    } else if (Array.isArray(req.user[scopeKey])) {
      userScopes = req.user[scopeKey];
    } else {
      return scopeError(res, expectedScopes);
    }


    let allowed;
    if (options && options.checkAllScopes) {
      allowed = expectedScopes.every(scope => userScopes.includes(scope));
    } else {
      allowed = expectedScopes.some(scope => userScopes.includes(scope));
    }

    return allowed ? next() : scopeError(res, expectedScopes);
  };
};

// Handle scope error, sending response with error and WWW-Authenticate header
function scopeError(res, expectedScopes) {
  const err = new CustomError("insufficient_scope", "You do not have permission to access this route.");

  // Header detailing required scopes for route
  res.append(
    "WWW-Authenticate",
    `Bearer scope="${expectedScopes.join(' ')}"`
  );

  res.status(403).json(err);
}


module.exports = {
  quote: {
    create: checkScopes([sc.createQuote]),
    read: checkScopes([sc.readQuote]),
    update: checkScopes([sc.updateQuote]),
    delete: checkScopes([sc.deleteQuote])
  },
  user: {
    profile: checkScopes([sc.profile]),
    email: checkScopes([sc.email])
  },
  developer: {
    be: checkScopes([sc.be_developer])
  },
}
