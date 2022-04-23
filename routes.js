
/*
Primary router - mount global middleware, and forward HTTP requests
to subrouters for response
This router is at https://domain/
*/

"use strict";

const root = require("rootrequire");
const express = require("express");
const router = express.Router();


// Authorization/authentication middleware - checks JWTs
const auth = require(root + "/auth");

// Auth server routes
const authorizationRoutes = require(root + "/authorization/routes");

// Resource server routes
const apiRoutes = require(root + "/resource/routing/api");

// Logging middleware
const logging = require(root + "/logging");

// Routes that are excluded from authentication despite being added after
// authentication is mounted. This keeps logically related routes near each
// other while allowing for exceptions to authentication.
const excludedRoutes = require(root + "/auth-exclude");

module.exports = router;

router.use(logging);

router.use("/assets", express.static(root + '/web/assets'));
router.use("/static", express.static(root + '/web/build/static'));

router.get('/ping', (req, res) => res.status(200).send('pong'));

// Dash manually handles authorization to enable redirects 
// instead of sending HTTP 4** responses
router.use("/barnhill/v1/*", express.static(root + "/web/build/index.html"));
router.all("/barnhill*", (req, res, next) => {
  // Redirect to home page of dash (forwards to login if not authenticated)
  res.redirect('/barnhill/v1/quoter')
});

// For authorizing - no authentication required
router.use("/auth/v1", authorizationRoutes);


// Middleware to skip authentication if route is excluded
router.use("/", (req, res, next) => {
  if(excludedRoutes.includes(req.originalUrl)) {
    next();
  } else {
    auth.authenticate(req, res, next);
  }
});

// Handle unauthorized requests
router.use(auth.unauthorized);

// All routes & subroutes below require authentication, unless explicitly excluded above
router.use("/api/v1", apiRoutes);

//Not found for all requests that fall through
router.use("*", function(req, res, next) {
  res.sendStatus(404);
});
