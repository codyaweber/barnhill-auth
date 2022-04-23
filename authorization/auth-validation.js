/*
Authorization input validation middleware
*/

"use strict";

//Route parameter validation
const { param, body, oneOf, validationResult } = require("express-validator");
const root = require('rootrequire');
const CustomError = require(root + "/shared/CustomError");

module.exports = {
  signUp: validateSignUp(),
  logIn: validateLogIn(),
  refreshAccessToken: validateRefreshAccessToken(),
  verifyEmail: validateVerifyEmail()
};

function validateSignUp() {
  return [
    [body("email").isEmail(),
    //exists() required since undefined gets cast to a string, and "undefined"
    //is a valid username
    body("username").exists().custom(validUsername),
    body("password").custom(validPassword)],
    handleValidationErrors
  ];
}

function validateLogIn() {
  return [
    [oneOf([ //user body parameter is valid email or username
      body("user").exists().isEmail().withMessage("invalid_login"),
      body("user").exists().custom(validUsername).withMessage("invalid_login")
    ]),
    body("password").exists(),
    body("grantType").isIn(["password", "refresh_token"])],
    (req, res, next) => {
      const errors = validationResult(req);
      if (errors.isEmpty()) {
        next();
        return;
      }

      let err = errors.array()[0];

      if (err.nestedErrors) {
        if (err.nestedErrors[0].msg === "invalid_login") {
          const errTitle = "invalid_credentials";
          const errMessage = "Invalid login credentials; make sure you entered them correctly.";
          const errorResponse = new CustomError(errTitle, errMessage);

          return res.status(401).json(errorResponse);
        }

        if (err.nestedErrors[0].msg === "Invalid value") {
          err = err.nestedErrors[0];
        }
      }


      const errorType = "invalid_" + err.location;
      let message = `Invalid value for ${err.param}: ${err.value}.`;

      if (err.msg !== "Invalid value") {
        message += " " + err.msg;
      }

      const errorResponse = new CustomError(errorType, message);

      res.status(422).send(errorResponse);
    }
  ];
}

function validateRefreshAccessToken() {
  return [
    [body("clientId").exists(),
    body("clientSecret").exists(),
    body("refreshToken").exists(),
    body("grantType").isIn(["refresh_token"])],
    handleValidationErrors
  ];
}

function validateVerifyEmail(req, res, next) {
  return [
    [param("email").isEmail()],
    handleValidationErrors
  ];
}


/** Generic handler for express-validator validation errors */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    next();
    return;
  }

  const err = errors.array()[0];
  console.dir(err);
  const errorType = "invalid_" + err.location;
  let message = `Invalid value for ${err.param}: ${err.value}.`;

  if (err.msg !== "Invalid value") {
    message += " " + err.msg;
  }

  const errorResponse = {
    error: errorType,
    message
  };

  res.status(422).send(errorResponse);
}

// Return boolean for valid username
function validUsername(str) {
  if (str == null) {
    return false;
  }
  //3-15 lowercase alphanumerics
  return /^[0-9a-z]{3,32}$/.test(str);
}

// Return boolean for valid password
function validPassword(str) {
  //8-64 alphanumerics and symbols
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,64}$/.test(str);
}
