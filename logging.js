/*
Middleware for app logging
*/

// Logging middleware
const morgan = require("morgan");
const cluster = require("cluster");
const moment = require("moment-timezone");
const fs = require("fs")
const path = require("path")

module.exports = logging()

// Return logging middlewares
function logging() {
  return [
    // workerAndIPLogging(),
    upCounter(),
    receivedLogging(),
    cacheLogging(),
    accessLogging(),
    errorLogging(),
    logResponseBodyOnError()
  ]
}

//Log worker id
// "Dev" mode prints - :method :url :status (colored) :response-time ms - :res[content-length]

// Log worker and IP address for each request
function workerAndIPLogging() {
  // const requestLogStream = fs.createWriteStream(path.join(__dirname + "/logs", "request.log"), { flags: "a" });

  return (req, res, next) => {
    const id = cluster.worker.id;
    const addr = req.ip;

    console.log("Worker " + id + " " + addr);

    next();
  }
}


let counter = 1;

// Bump request counter value
function upCounter() {

  return (req, res, next) => {
    req.morganId = counter;
    counter++;
    next();
  }
}


// Add custom date token for morgan logging
morgan.token('date', function() {
  return moment().tz('America/New_York').format("ddd M/D/YY, h:mm:ssa zz");
});

morgan.token('morganId', function (req) {
  return req.morganId
})

morgan.token('userAgent', (req) => {
  const { useragent : userAgent } = req;
  let userAgentStr;
  switch(true) {
  case userAgent.isDesktop:
    userAgentStr = `Desktop ${userAgent.browser}`;
    break;
  case userAgent.isMobile:
    userAgentStr = `Mobile ${userAgent.browser}`;
    break;
  default:
    userAgentStr = `Other ${userAgent.browser}`;
    break;
  }
  return userAgentStr;
})

morgan.token('origin', (req) => {
  return req.get('origin');
})

morgan.token('cookies', req => {
  return JSON.stringify(req.cookies, null,2);
});



// Have morgan log request on reception
function receivedLogging() {
  return morgan(':morganId :date :remote-addr :userAgent :remote-user :method :url', {
    immediate: true
  });
}

// Log requests with status 300-399
function cacheLogging() {
  // const cacheLogStream = fs.createWriteStream(path.join(__dirname + "/logs", "cache.log"), { flags: "a" });

  return morgan("dev", {
    skip: function (req, res) {
      return res.statusCode < 300 || res.statusCode >= 400
    }
    // stream: cacheLogStream
  });
}

// Log requests with status 200-299
function accessLogging() {
  // const accessLogStream = fs.createWriteStream(path.join(__dirname + "/logs", "access.log"), { flags: "a" });

  return morgan("dev", {
      skip: function (req, res) {
        return res.statusCode > 300
      }
      // stream: accessLogStream
  });
}

// Log requests with status 400+
function errorLogging() {
  // const errorLogStream = fs.createWriteStream(path.join(__dirname + "/logs", "error.log"), { flags: "a" });

  return morgan("dev", {
    skip: function (req, res) {
      return res.statusCode < 400;
    }
    // stream: errorLogStream
  });
};

function logResponseBodyOnError() {
  // const errorLogStream = fs.createWriteStream(path.join(__dirname + "/logs", "error.log"), { flags: "a" });
  return (req, res, next) => {

    const oldJSON = res.json;

    res.json = function (body) {

      // Only log body when it's a string and there's an error
      if(typeof body !== "string" || res.statusCode < 400) {
        oldJSON(body);
        return;
      }

      // No custom logging for 404 Not Found
      if(res.statusCode == 404) {
        return;
      }

      // errorLogStream.write(body);
      console.log("JSON body on error response:\n");
      console.log(req.path, body);

      oldJSON(body);

      return;
    };

    next();
  }
}
