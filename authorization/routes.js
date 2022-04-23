/*
Router for authorization server branches
*/

"use strict";

const root = require("rootrequire");
const express = require("express");
const router = express.Router();
const validate = require(root + "/authorization/auth-validation");
const middleware = require(root + "/authorization/middleware");

module.exports = router;

// router.use("/assets", express.static(root + "/web/assets"));
router.post("/sign-up", validate.signUp, middleware.signUp);
router.post("/token", validate.logIn, middleware.getToken);
router.post("/token/refresh", validate.refreshAccessToken, middleware.refreshAccessToken);
router.post("/logout", middleware.logOut);
router.post("/verify-email/:email", validate.verifyEmail, middleware.verifyEmail);
router.post("/client-secret", middleware.getClientSecret);
router.post("/forgot-password", middleware.forgotPassword);
router.get("/password-reset/:userId(\\d+)/:token", middleware.serveResetPassword);
router.post("/password-reset", middleware.resetPassword);
