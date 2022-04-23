/*
Mounts routes at /api/v1/
*/

"use strict";

const root = require("rootrequire");
const express = require("express");
const router = express.Router();


// Middleware handlers for requests of each content type
const quote = require(root + "/resource/api/quotes");
// Caching middleware
const { cache } = require(root + "/database/cache");
// Routing input validation
const validate = require(root + "/resource/routing/validate");
// Permission middleware for content routes
const p = require(root + "/resource/routing/permissions").quote;

module.exports = router;

// Permissions mounting
router.post("/*", p.create);
router.get("/*", p.read);
router.put("/*", p.update);
router.delete("/*", p.delete);


router.post("/quotes", validate.postQuote, quote.post);
router.put("/quotes", validate.putQuote, quote.put);
router.get("/quotes", validate.search, quote.getIdsBySearch);
router.get("/quotes/ids", quote.getAllIds);
router.get("/quotes/:id(\\d+)", cache(), quote.getWithId);
