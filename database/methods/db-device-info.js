/*
Database operations for DeviceInstall table
*/

"use strict";

const root = require("rootrequire");
const knex = require(root + "/database/knex/setup");
const s = require(root + "/resource/statics/sql");
const h = require(root + "/database/methods/support/helpers");

module.exports = {
  getByVendorUUID,
  insert,
  update,
  updateAPNSToken,
  updateFCMToken,
  updateDeviceUserId,
  selectFCMTokensForUserIds,
  // selectFCMTokenForUserId
}

function getByVendorUUID(vendorUUID) {
  return knex(s.table_DeviceInfo)
  .select("*")
  .where(s.col_vendorUUID, vendorUUID)
  .then(h.first);
}

function insert(obj) {
  return knex(s.table_DeviceInfo)
  .insert(obj)
  .returning("*")
  .then(h.first);
}

function update(row) {
  const vendorUUID = row[s.col_vendorUUID];
  
  return knex(s.table_DeviceInfo)
  .update(row)
  .where({
    [s.col_vendorUUID] : vendorUUID
  })
  .returning("*")
  .then(h.first);
}

// Set APNS token for the device with the given vendorUUID and flags device as
// active for push notifications
function updateAPNSToken(token, vendorUUID) {
  return knex(s.table_DeviceInfo)
  .update({
    [s.col_apnsToken] : token,
    [s.col_apnsActive]: true
  })
  .where(s.col_vendorUUID, vendorUUID)
  .returning("*")
  .then(h.first);
}

// Set FCM token for the device with the given vendorUUID
function updateFCMToken(token, vendorUUID) {
  return knex(s.table_DeviceInfo)
  .update({
    [s.col_fcmToken] : token
  })
  .where(s.col_vendorUUID, vendorUUID)
  .returning("*")
  .then(h.first);
}

// Update the userId for the device with the given vendorUUID
function updateDeviceUserId(userId, vendorUUID) {
  return knex(s.table_DeviceInfo)
  .update({
    [s.col_userId] : userId
  })
  .where(s.col_vendorUUID, vendorUUID)
  .returning("*")
  .then(h.first);
}

// SELECT fcmToken field from userIds
function selectFCMTokensForUserIds(userIds) {
  
  userIds = h.forceArray(userIds);
  
  return knex.select(s.col_fcmToken)
  .from(s.table_DeviceInfo)
  .where({
    [s.col_apnsActive] : true
  })
  .whereIn(s.col_userId, userIds)
  .then(results => {
    return h.pluckId(results, s.col_fcmToken);
  });
}

// SELECT a fcmToken for userId
// function selectFCMTokenForUserId(userId) {
//   return knex.select(s.col_fcmToken)
//   .from(s.table_DeviceInfo)
//   .where({
//     [s.col_apnsActive] : true
//   })
//   .where(s.col_userId, userId)
//   .then(results => {
//     return h.pluckId(results, s.col_fcmToken);
//   });
// }
