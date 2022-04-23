/*
Database operations for messages
*/

"use strict";

const root = require("rootrequire");
const knex = require(root + "/database/knex/setup");
const s = require(root + "/resource/statics/sql");
const h = require(root + "/database/methods/support/helpers");

module.exports = {
  selectAll,
  selectAllIds,
  selectById,
  selectWithUserIds,
  selectThreadParticipant,
  selectThreadParticipantIds,
  insertNewThread,
  insertThreadParticipantIds
};

// Select all threadIds including their userIds where userId is a participant
// ordered by latest message sent in each thread, descending
function selectAll(userId) {
  
  const parameters = [
    // SELECT 
    "*", 
    s.col_userId, 
    s.col_readAt, 
    // FROM 
    s.table_Message,
    // JOIN 
    s.table_MessageReadState,
    // ON 
    s.col_messageId,
    // = 
    s.col_id,
    // JOIN (SELECT 
    s.col_threadId, 
    // MAX(
    s.col_sentAt,
    // ) AS MaxSentAt FROM 
    s.table_Message,
    // JOIN 
    s.table_MessageReadState,
    // ON 
    s.col_messageId,
    // = 
    s.col_id,
    // WHERE 
    s.col_deletedAt,
    // IS NULL AND 
    s.col_userId,
    // = 
    userId,
    // GROUP BY 
    s.col_threadId,
    // ) grouped ON grouped.MaxSentAt = 
    s.col_sentAt,
    // ORDER BY 
    s.col_sentAt
    // DESC
  ];
  
  const query = `SELECT m.??, mrs.??, mrs.?? FROM ?? m
    JOIN ?? mrs ON mrs.?? = m.??
    JOIN (SELECT m2.??, MAX(m2.??) AS MaxSentAt FROM ?? m2
    JOIN ?? mrs2 ON mrs2.?? = m2.??
    WHERE mrs2.?? IS NULL
    AND mrs2.?? = ?
    GROUP BY m2.??) grouped
    ON grouped.MaxSentAt = m.??
    ORDER BY m.?? DESC`;
    
  return knex.raw(query, parameters)
  .then(processThreadRows);
  // 
  // SELECT m.*, mrs.userId, mrs.readAt, mrs.deletedAt FROM Message m
  // JOIN MessageReadState mrs ON mrs.messageId = m.id
  // JOIN (
  //    SELECT m2.threadId, MAX(m2.sentAt) AS MaxSentAt FROM Message m2
  //    JOIN MessageReadState mrs2 ON mrs2.messageId = m2.id
  //    WHERE mrs2.deletedAt IS NULL
  //    AND mrs2.userId = 2
  //    GROUP BY m2.threadId
  // ) grouped
  // ON grouped.MaxSentAt = m.sentAt
  // ORDER BY m.sentAt DESC;
}

function processThreadRows(rows) {
  // Keep track of row order - it's by date DESC
  let orderedIds = [...new Set(rows.map(r => r[s.col_threadId]))];
  let threads = {};
  let threadIds = [];
  rows.forEach(row => {
    const threadId = row[s.col_threadId];
    if(!threadIds.includes(threadId)) {
      threadIds.push(threadId);
      threads[threadId] = {
        threadId : threadId,
        userIds : [],
        latestMessage : {
          id : row[s.col_id],
          senderId : row[s.col_senderId],
          threadId : threadId,
          body : row[s.col_body],
          sentAt : row[s.col_sentAt],
          readStates : []
        }
      }
    }
    
    threads[threadId].userIds.push(row[s.col_userId]);
    
    let readState = {
      messageId : row[s.col_id],
      userId : row[s.col_userId],
      readAt : row[s.col_readAt]
    };
    threads[threadId].latestMessage.readStates.push(readState);
  })
  
  return orderedIds.map(id => threads[id]);
  // return Object.keys(threads).map(key => threads[key] )
}

// Select all threadIds that contain userId
function selectAllIds(userId) {
  return knex.select(s.col_threadId + " AS " + s.col_id)
  .from(s.table_ThreadParticipant)
  .where(s.col_userId, userId)
  .then(h.pluckId);
}

/* Select thread where id = id */
function selectById(userId, threadId) {
  
  const parameters = [
    // SELECT 
    "*", 
    s.col_userId, 
    s.col_readAt, 
    // FROM 
    s.table_Message,
    // JOIN 
    s.table_MessageReadState,
    // ON 
    s.col_messageId,
    // = 
    s.col_id,
    // JOIN (SELECT 
    s.col_threadId, 
    // MAX(
    s.col_sentAt,
    // ) AS MaxSentAt FROM 
    s.table_Message,
    // JOIN 
    s.table_MessageReadState,
    // ON 
    s.col_messageId,
    // = 
    s.col_id,
    // WHERE 
    s.col_deletedAt,
    // IS NULL AND 
    s.col_userId,
    // = 
    userId,
    // GROUP BY 
    s.col_threadId,
    // ) grouped ON grouped.MaxSentAt = 
    s.col_sentAt,
    // WHERE
    s.col_threadId,
    // = 
    threadId
  ];
  
  const query = `SELECT m.??, mrs.??, mrs.?? FROM ?? m
  JOIN ?? mrs ON mrs.?? = m.??
  JOIN (SELECT m2.??, MAX(m2.??) AS MaxSentAt FROM ?? m2
  JOIN ?? mrs2 ON mrs2.?? = m2.??
  WHERE mrs2.?? IS NULL
  AND mrs2.?? = ?
  GROUP BY m2.??) grouped
  ON grouped.MaxSentAt = m.??
  WHERE m.?? = ?`;
  
  return knex.raw(query, parameters)
  .then(processThreadRows)
  .then(h.first);
    
  // SELECT m.*, mrs.userId, mrs.readAt, mrs.deletedAt FROM Message m
  // JOIN MessageReadState mrs ON mrs.messageId = m.id
  // JOIN (
  //    SELECT m2.threadId, MAX(m2.sentAt) AS MaxSentAt FROM Message m2
  //    JOIN MessageReadState mrs2 ON mrs2.messageId = m2.id
  //    WHERE mrs2.deletedAt IS NULL
  //    AND mrs2.userId = 2
  //    GROUP BY m2.threadId
  // ) grouped
  // ON grouped.MaxSentAt = m.sentAt
  // WHERE m.threadId=threadId;
  // 
  // return knex.select("*")
  // .from(s.table_Thread)
  // .where(s.col_id, id)
  // .then(h.first);
}

// Return boolean for whether or not a thread exists with *all* and *only* the provided userIds
function selectWithUserIds(userIds) {
  
  const parameters = [
    // SELECT
    s.col_threadId,
    // AS
    s.col_id,
    // FROM
    s.table_ThreadParticipant,
    // WHERE
    s.col_userId,
    // IN
    ...userIds,
    // GROUP BY
    s.col_threadId,
    // HAVING COUNT
    '*',
    // = 
    userIds.length,
    // AND COUNT(
    '*',
    // ) = (SELECT COUNT(
    '*',
    // ) FROM
    s.table_ThreadParticipant,
    // WHERE tp1.
    s.col_threadId,
    // = tp2.
    s.col_threadId,
    // GROUP BY tp2.
    s.col_threadId
    // )
  ]
  
  // SELECT tp.threadId
  // FROM dbo.ThreadParticipant tp
  // WHERE tp.userId IN (2, 25, 48)
  // GROUP BY tp.threadId
  // HAVING COUNT(*)=3
  // AND COUNT(*)=(
  //   SELECT COUNT(*)
  //   FROM ThreadParticipant tp2
  //   WHERE tp.threadId = tp2.threadId
  //   GROUP BY tp2.threadId
  // )
  const inClause = h.getKnexInParamStringFromArray(userIds);
  const query = `SELECT ?? AS ?? FROM ?? tp WHERE ?? IN ${inClause} GROUP BY ?? \
  HAVING COUNT(??)=? AND COUNT(??)=(\
    SELECT COUNT(??) FROM ?? tp2 WHERE \
    tp.?? = tp2.?? GROUP BY tp2.??
  )`;
  
  return knex.raw(query, parameters)
  .then(h.pluckId);
  // Query explanation below:
  
  // SELECT tp.threadId
  // FROM dbo.ThreadParticipant tp
  // WHERE tp.userId IN (2, 25, 48)
  // // /*
  // //  * We SELECT all the threadIds that have a userId
  // //  * equal to 2, 25, or 48.
  // //  */
  // GROUP BY tp.threadId
  // // /*
  // //  * The query without this line results in duplicates.
  // //  * If threadId 1 contained both users 2 and 25, it
  // //  * was listed twice. If threadId 2 contained users 2, 25,
  // //  * and 48, it was listed three times. Using GROUP BY 
  // //  * causes the result to display each threadId once.
  // //  */
  // HAVING COUNT(*)=3
  // // /*
  // //  * Even though each threadId is only being *displayed* once,
  // //  * COUNT(*) adds up the number of times each threadId appears
  // //  * in the SELECT query. COUNT(*)=3 filters for the threadIds
  // //  * that appeared exactly 3 times in the original result set
  // //  * We use 3 because each threadId that is listed 3 times is 
  // //  * a thread that contains all 3 of our WHERE clause userIds.
  // //  */
  // AND COUNT(*)=(
  //   SELECT COUNT(*)
  //   FROM ThreadParticipant tp2
  //   WHERE tp.threadId = tp2.threadId
  //   GROUP BY tp2.threadId
  // )
  // // /*
  // //  * This section adds another filter requiring that
  // //  * the COUNT(*) of each group in the original SELECT
  // //  * (which represents the number of users in the WHERE clause
  // //  * that appear in the Thread) equal the total number of users
  // //  * in that Thread. If the HAVING COUNT(*)=3 clause was not present and
  // //  * this clause alone was used, the results would display threadIds that
  // //  * only include subsets of userIds in the WHERE clause. In other words,
  // //  * this clause demands that the number userIds in the WHERE clause that
  // //  * are in the Thread be equal to the number of users in the Thread.
  // //  * 
  // //  * Finally, if each threadIds does map to a unique set of users, by 
  // //  * combining both HAVING clauses, we end up with the sole threadId that
  // //  * contains only the userIds we want, and exactly as many userIds in it
  // //  * as userIds in our WHERE clause. Huzzah.
  // //  */
}

function selectThreadParticipant(userId, threadId) {
  return knex(s.table_ThreadParticipant)
  .count("*" + " AS " + "count")
  .where({
    [s.col_userId] : userId,
    [s.col_threadId] : threadId
  })
  .then(h.first);
}

function selectThreadParticipantIds(threadId) {
  
  return knex.select(s.col_userId + " AS " + s.col_id)
  .from(s.table_ThreadParticipant)
  .where(s.col_threadId, threadId)
  .then(h.pluckId);
}

// Create a new row in Thread table
function insertNewThread() {
  const now = h.getTimestamp();
  const newThread = {
    [s.col_createdAt] : now
  };
  return knex.insert(newThread)
  .into(s.table_Thread)
  .returning(s.col_id)
  .then(h.first);
}

function insertThreadParticipantIds(threadId, userIds) {
  const objects = userIds.map(userId => getThreadParticipantObjFromUserId(threadId, userId));
  
  return knex.insert(objects)
  .into(s.table_ThreadParticipant)
  .returning("*");
}


/* ------------------- */
/* ------------------- */
/* ----- Helpers ----- */
/* ------------------- */
/* ------------------- */

function getThreadParticipantObjFromUserId(threadId, userId) {
  return {
    [s.col_threadId] : threadId,
    [s.col_userId] : userId
  };
}

// Given data from selectAll query above, return
// array of threads with their respective userIds
function processThreadParticipants(tpData) {
  const threadIds = [];
  const threads = {};
  
  tpData.forEach(d => {
    const threadId = d[s.col_threadId];
    const userId = d[s.col_userId];
    
    // Ensure threads object exists
    if(!threadIds.includes(threadId)) {
      threadIds.push(threadId);
      threads[threadId] = {   
        threadId,
        userIds : []
      }
    }
    
    threads[threadId].userIds.push(userId);
  })
  
  // Preserves date ordering
  const threadObjects = threadIds.map(threadId => {
    return threads[threadId];
  })
  
  return {
    threads : threadObjects,
    threadIds : threadIds
  };
}
