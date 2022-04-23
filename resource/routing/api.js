
/*
Mounts private API routes with respective middleware handlers
Mounted at domain/api/v1
*/

"use strict";

const root = require("rootrequire");
const express = require("express");
const router = express.Router();

//Authorization middleware
const quotesRouter = require(root + "/resource/routing/api-routers/quotes");
const userRouter = require(root + "/resource/routing/api-routers/user");

module.exports = router;

router.use("/quotes", quotesRouter);
router.use("/user", userRouter);
