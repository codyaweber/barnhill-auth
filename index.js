
/*
Application entry point
Clustered express server w/ workers
*/

"use strict";

const root = require("rootrequire");
require("dotenv").config();
const cluster = require("cluster");
// const workers = process.env.WEB_CONCURRENCY || 4;
// const numCPUs = require("os").cpus().length;

if (cluster.isMaster) {
  require(root + "/master");
} else if(cluster.isWorker) {
  require(root + "/worker");
}
