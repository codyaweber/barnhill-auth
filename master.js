/*
Master cluster setup
*/

"use strict";

const cluster = require("cluster");
const workers = process.env.WEB_CONCURRENCY || 4;
const numCPUs = require("os").cpus().length;

setUpMaster();

function setUpMaster() {
  for (let i = 0; i < workers; i++) {
  // for (let i=0;i < 1; i++) {
  // console.log("Running on 1 CPU - optimize for production.");
    // Create a worker
    cluster.fork();
  }

  cluster.on("online", function(worker) {
    console.log("Worker " + worker.process.pid + " is online");
  });

  cluster.on("exit", function(worker, code, signal) {
    console.log("Worker " + worker.process.pid + " died with code: " + code + ", and signal: " + signal);
    console.log("Starting a new worker.");
    cluster.fork();
  });  
}
