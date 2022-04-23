/*
Authorization middleware to interact with database and handle HTTP responses
*/

"use strict";

const root = require("rootrequire");
const db = require(root + "/authorization/db-auth");
const handlers = require(root + "/resource/api/http-handlers");
const tokens = require(root + "/authorization/tokens");
const errors = require(root + "/shared/error-handling");
const CustomError = require(root + "/shared/CustomError");
const s = require(root + "/resource/statics/sql");
const { bcrypt } = require(root + "/authorization/crypto");
const Email = require("email-templates");
const nodemailer = require("nodemailer");
const { promisify } = require("es6-promisify");
const request = require("request");
const rp = promisify(request);


module.exports = {
  signUp,
  getToken,
  refreshAccessToken,
  logOut,
  verifyEmail,
  getClientSecret,
  forgotPassword,
  serveResetPassword,
  resetPassword
}


// Create new user in database
async function signUp(req, res, next) {
  const { clientId, clientSecret, username, email, password } = req.body;

  if (clientId !== process.env.IOS_CLIENT_ID || clientSecret !== process.env.IOS_CLIENT_SECRET) {
    const err = new CustomError("invalid_credentials", "Invalid credentials for signup.")
    return res.status(401).json(err);
  }

  let user;
  try {
    const userId = await db.create(username, email, password);
    user = await db.selectUserById(userId);
  } catch (e) {
    errors.processError(e, res, errors.requestError);
  }

  handlers.directPost(user, req, res);

  forwardNewUserToZapierHook(user);
}

// Try to retrieve tokens with user credentials
async function getToken(req, res, next) {
  const { user, password, grantType } = req.body;
  const { useragent: userAgent } = req;

  let userRow;
  try {
    userRow = await authenticateUser(user, password);
  } catch (e) {
    console.log("Error fetching user: ", e);
    res.sendStatus(500);
    return;
  }

  if (userRow === null) {
    const err = new CustomError("invalid_credentials", "Invalid login credentials.");
    res.status(401).json(err);
    return;
  }

  const userId = userRow[s.col_id];
  const accessRole = userRow[s.col_accessRole];

  let tokenData;
  try {
    tokenData = await tokens.createNewTokensForUser(userId, accessRole, grantType, userAgent);
  } catch (e) {
    console.log("Error creating tokens for user: ", e);
    res.sendStatus(500);
    return;
  }

  if (userAgent.isApp) {
    res.status(200).json(tokenData);
  } else {
    const secure = process.env.NODE_ENV === 'production';
    const options = {
      httpOnly: true,
      secure: secure
      // domain: - no domain defaults to request origin
    };
    res.cookie('barnhilldash_reacttokens', tokenData, options);
    res.status(200).json("Success");
  }
}

// Try using submitted refresh token to issue new access token
async function refreshAccessToken(req, res, next) {
  const { clientId, clientSecret, grantType, refreshToken } = req.body;

  if (clientId !== process.env.IOS_CLIENT_ID || clientSecret !== process.env.IOS_CLIENT_SECRET) {
    const err = new CustomError("invalid_credentials", "Invalid credentials for refreshing access token.")
    return res.status(401).json(err);
  }

  let refreshTokenRow;
  try {
    refreshTokenRow = await db.selectRefreshToken(refreshToken);

    if (refreshTokenRow === null) {
      throw new CustomError("invalid_refresh_token", "Unknown or invalid refresh token.");
    }
  } catch (err) {
    console.log("Error refreshing access token: ", err);
    errors.processError(err, res, errors.requestError)
    return;
  }

  let tokenIsValid;
  try {
    tokenIsValid = await tokens.checkIfRefreshTokenIsValid(refreshTokenRow);
  } catch (err) {
    console.log("Error checking token validity: ", err);
    errors.processError(err, res, errors.requestError);
    return;
  }

  if (!tokenIsValid) {
    const err = new CustomError("invalid_refresh_token", "Invalid refresh token.");
    errors.processError(err, res, errors.requestError);
    return;
  }

  const ownerId = refreshTokenRow[s.col_issuedTo];

  let ownerUser;
  try {
    ownerUser = await db.selectUserByIdJoinRole(ownerId);
  } catch (err) {
    errors.processError(err, res, errors.requestError);
    return;
  }

  const role = ownerUser[s.col_accessRole];
  const userId = ownerUser[s.col_id];

  const newTokens = await tokens.createNewTokensForUser(userId, role, grantType);
  const updated = await db.updateRefreshTokenLastUsed(refreshToken);

  if (updated !== 1) {
    throw new CustomError("database_error", "Updating refresh token use date failed.");
  }

  res.status(200).json(newTokens);
}

async function logOut(req, res, next) {
  res.clearCookie("barnhilldash_reacttokens");
  res.sendStatus(200);
}

// Authenticate user and password, returning user row from DB if valid, null otherwise - throws
async function authenticateUser(user, password) {
  const userRow = await db.selectByEmailOrUsernameJoinRole(user, user);

  // Invalid username
  if (userRow === null) {
    return null;
  }

  const storedHash = userRow[s.col_password];

  const isValidHash = await validateHash(storedHash, password);
  if (isValidHash) {
    return userRow;
  } else {
    // Invalid password
    return null;
  }
}

// Async - return boolean if password matches hash
function validateHash(hashBuffer, password) {
  //Get hash string from buffer
  const hash = hashBuffer.toString("utf8");
  return bcrypt.compare(password, hash);
}

//Mark user's email verified in database
function verifyEmail(req, res, next) {
  const email = req.params.email;

  handlers.tryPost(db.verifyEmail, email, req, res);
}

/** Return encrypted clientSecret for clientId */
function getClientSecret(req, res, next) {
  const { clientId } = req.body;
  if (clientId === process.env.IOS_CLIENT_ID) {
    const iOSClientSecret = process.env.IOS_CLIENT_SECRET;
    res.status(200).json({ clientSecret: iOSClientSecret });
  } else {
    res.sendStatus(403);
  }
}

/** Check if email submitted exists and if so, trigger forgot password process */
async function forgotPassword(req, res, next) {
  const email = req.body.email;

  try {
    const user = await db.selectUserByEmailOrUsername(email, "");

    // If user is found, send password reset email
    if (user !== null) {
      const userId = user[s.col_id];
      await db.deletePasswordReset(userId);
      const token = await db.createPasswordReset(userId);
      const email = user[s.col_email];
      const resetLink = getPasswordResetLink(req, userId, token);
      sendPasswordRecoveryEmail(email, resetLink);
    }

    res.sendStatus(200);
  } catch (err) {
    errors.processError(err, res, errors.requestError)
  }
}

// Create a password reset link for the given request's domain, the user id, and
// the password reset token
function getPasswordResetLink(req, userId, token) {
  return `${req.protocol}://${req.get('host')}/auth/v1/password-reset/${userId}/${token}`;
}

/** Serve reset password page if token is valid */
async function serveResetPassword(req, res, next) {
  const userId = req.params.userId;
  const token = req.params.token;

  try {
    const validResetToken = await db.validatePasswordResetToken(userId, token);
    if (validResetToken) {
      res.render("password-reset.pug");
    } else {
      res.sendStatus(403);
    }
  } catch (err) {
    errors.processError(err, res);
  }
}

async function sendPasswordRecoveryEmail(toAddress, resetLink) {
  const keys = {}

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      type: 'OAuth2',
      user: '', // sender email
      serviceClient: keys.client_id,
      privateKey: keys.private_key
    }
  });

  try {
    await transporter.verify();
  } catch (err) {
    console.log("Error with transporter: ", err);
    return;
  }

  const templateDir = root + "/authorization/emails/password-recovery";

  const email = new Email({
    message: {
      from: '', // sender email
      attachments: [
      ]
    },
    // uncomment below to send emails in development/test env:
    send: true,
    transport: transporter
  });

  email
    .send({
      template: templateDir,
      message: {
        to: toAddress
      },
      locals: {
        resetLink: resetLink
      }
    })
    .catch(console.error);
}

// Set the user's password
async function resetPassword(req, res, next) {
  const { userId, token, password } = req.body;

  try {
    const valid = await db.validatePasswordResetToken(userId, token);
    if (!valid) {
      res.status(403).send("Your password reset token has expired.");
    } else {
      const updated = await db.setPassword(userId, password);
      await db.deletePasswordReset(userId);
      res.sendStatus(200);
    }
  } catch (err) {
    errors.processError(err, res);
  }
}

// Integration with InfusionSoft via zapier hook
async function forwardNewUserToZapierHook(user) {

  const email = user[s.col_email];

  const bodyObj = {
    email
  };

  const options = {
    method: 'POST',
    uri: "https://hooks.zapier.com/hooks/catch/2044726/ofn28qn",
    body: JSON.stringify(bodyObj),
    json: true
  }

  rp(options)
    .catch(console.error);
}
