/*
Mounts routes at api/v1/user
*/

const root = require("rootrequire");
const express = require("express");
const router = express.Router();

// Middleware
const user = require(root + "/resource/api/user");
// Routing input validation
const validate = require(root + "/resource/routing/validate");
// Caching middleware
// Permission middleware for content routes
const u = require(root + "/resource/routing/permissions").user;

module.exports = router;

// Permissions mounting
router.post("/*", u.profile);
router.get("/*", u.profile);
router.put("/*", u.profile);
router.delete("/*", u.profile);

router.put("/profile", validate.updateProfile, user.updateProfile);
router.get("/info", user.getUserInfo);
