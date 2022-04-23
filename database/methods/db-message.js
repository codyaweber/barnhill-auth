/*
Database operations for messages
*/

"use strict";

const root = require("rootrequire");
const knex = require(root + "/database/knex/setup");
const s = require(root + "/resource/statics/sql");
const h = require(root + "/database/methods/support/helpers");

module.exports = {
  selectById,
  // selectAllIdsInThread,
  // selectLatestMessageInThread,
  selectLatestMessagesInThread,
  selectReadStates,
  bulkSelectReadState,
  selectUnread,
  bulkInsertMessageReadStates,
  insertMessage,
  insertMessageRead,
  // updateMessage,
  updateReadAt,
  deleteMessage
};

/* Select message where id = id */
function selectById(id) {

  return knex.select("*")
  .from(s.table_Message)
  .where(s.col_id, id)
  .then(h.first)
}


// Return the latest message for the given userId. The userId is 
// necessary because users can delete messages for themselves, so the
// most recent *existing* message between users varies
function selectLatestMessagesInThread(threadId, userId, offset, limit) {
  
  const parameters = [
    // SELECT
    s.col_id,
    // FROM
    s.table_Message,
    // JOIN
    s.table_MessageReadState,
    // ON
    s.col_messageId,
    // =
    s.col_id,
    // WHERE
    s.col_threadId,
    // =
    threadId,
    // AND
    s.col_deletedAt,
    // IS NULL AND
    s.col_userId,
    // =
    userId,
    // ORDER BY
    s.col_sentAt,
    // DESC OFFSET
    parseInt(offset),
    // ROWS FETCH NEXT
    parseInt(limit)
    // ROWS ONLY
  ];
  
  const query = `SELECT m.?? FROM ?? m 
  JOIN ?? mrs ON mrs.?? = m.??
  WHERE m.?? = ? 
  AND mrs.?? IS NULL
  AND mrs.?? = ?
  ORDER BY m.?? DESC 
  OFFSET ? ROWS FETCH NEXT ? ROWS ONLY;`;
  
  return knex.raw(query, parameters)
  .then(h.pluckId);
  
  // SELECT m.id FROM Message m 
  // JOIN MessageReadState mrs ON mrs.messageId = m.id
  // WHERE m.threadId = 38 
  // AND mrs.deletedAt IS NULL
  // AND mrs.userId = 2
  // ORDER BY m.sentAt DESC 
  // OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY;
}

function selectReadStates(messageId) {
  
  return knex.select([s.col_messageId, s.col_userId, s.col_readAt])
  .from(s.table_MessageReadState)
  .where({
    [s.col_messageId] : messageId
  })
}

function bulkSelectReadState(messageIds) {
  const parameters = [
    // SELECT 
    s.col_messageId,
    s.col_userId,
    s.col_readAt,
    // FROM 
    s.table_MessageReadState,
    // WHERE 
    s.col_messageId,
    // IN 
    ...messageIds
  ];
  
  
  const inClause = h.getKnexInParamStringFromArray(messageIds);
  const query = `SELECT mrs.??, mrs.??, mrs.?? FROM ?? mrs
  WHERE mrs.?? IN ${inClause};`;
  return knex.raw(query, parameters);
  
  // SELECT mrs.* FROM Message m
  // LEFT JOIN MessageReadState mrs ON m.id = mrs.messageId
  // WHERE m.id IN (80,81,82,83);
}

// Return ids of all unread messages for userId in threadId
function selectUnread(threadId, userId) {
  
  const parameters = [
    // SELECT
    s.col_messageId,
    // AS
    s.col_id,
    // FROM
    s.table_Message,
    // JOIN
    s.table_MessageReadState,
    // ON
    s.col_messageId,
    // =
    s.col_id,
    // WHERE 
    s.col_userId,
    // =
    userId,
    // AND 
    s.col_threadId,
    // =
    threadId,
    // AND
    s.col_readAt
    // IS NULL
  ]
  
  const query = `SELECT mrs.?? AS ?? FROM ?? m
  JOIN ?? mrs ON mrs.?? = m.??
  WHERE mrs.?? = ? AND m.?? = ? AND mrs.?? IS NULL;`
  
  return knex.raw(query, parameters)
  .then(h.pluckId);
  
  // SELECT mrs.* FROM Message m
  // JOIN MessageReadState mrs ON mrs.messageId = m.id
  // WHERE mrs.userId = 2 AND m.threadId = 45 AND mrs.readAt IS NULL;
}

function bulkInsertMessageReadStates(rows) {
  return knex(s.table_MessageReadState)
  .insert(rows)
  .returning("*");
}

/* Create new Message row */
function insertMessage(messageObj) {

  const now = h.getTimestamp();

  messageObj[s.col_sentAt] = now;
  // const parameters = into.concat(columns, values);
  // const query = "INSERT INTO ?? (??,??,??,??,??) VALUES (?,?,?,?,?);";
  // return knex.raw(query, parameters);

  return knex.insert(messageObj)
  .into(s.table_Message)
  .returning("*")
  .then(h.first);
}

// Mark messageId as read for userId
function insertMessageRead(messageId, userId) {
  
  const now = h.getTimestamp();
  
  const parameters = [
    // INSERT INTO
    s.table_MessageReadState,
    // (
    s.col_messageId,
    s.col_userId,
    s.col_readAt,
    // ) VALUES (
    messageId,
    userId,
    now
    // )
  ]
  
  const query = "INSERT INTO ??(??, ??, ??) VALUES(?, ?, ?)";
  
  return knex.raw(query, parameters);
}

// Update all MessageReadState rows with readAt value where messageIds
// and userId
function updateReadAt(messageIds, userId, readAt) {
    
  const parameters = [
    // UPDATE
    s.table_MessageReadState,
    // SET
    s.col_readAt,
    // =
    readAt,
    // WHERE
    s.col_messageId,
    // IN
    ...messageIds,
    // AND
    s.col_userId,
    // =
    userId
  ]

  const inClause = h.getKnexInParamStringFromArray(messageIds);
  const query = `UPDATE ?? SET ?? = ?
  WHERE ?? IN ${inClause} AND ?? = ?;`
  
  return knex.raw(query, parameters);
  
  // UPDATE MessageReadState SET readAt = GETDATE()
  // WHERE messageId IN (179, 181) AND userId = 2;
}

/* Update messageId with newMessage */
// async function updateMessage(newMessage) {
// 
//   const id = h.pop(s.col_id, newMessage);
//   const now = h.getTimestamp();
// 
//   //Only update text and updatedAt fields
//   const message = {
//     [s.col_text] : newMessage[s.col_text],
//     [s.col_updatedAt] : now
//   };
// 
//   return knex(s.table_Message)
//   .update(message)
//   .where({[s.col_id] : id})
//   .returning("*")
//   .then(h.first);
// }

/* Delete messageId */
function deleteMessage(messageId) {
  return knex(s.table_Message)
  .where({[s.col_id] : messageId})
  .del();
}
