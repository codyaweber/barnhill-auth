
/*
Database operations for connections
*/

"use strict";

const root = require("rootrequire");
const h = require(root + "/database/methods/support/helpers");
const s = require(root + "/resource/statics/sql");
const knex = require(root + "/database/knex/setup");


module.exports = {
  create,
  update,
  selectConnection,
  selectConnections,
  selectPendingConnections,
  selectSentConnections,
  selectReceivedConnections,
  selectMutual,
  upsertConnection,
  deleteConnection,
  selectIds
};

// Insert connection object
function create(senderId, recipientId) {

  const {userOneId, userTwoId} = sortUsers(senderId, recipientId);
  let relationship = senderId < recipientId ? s.val_pendingFirstSecond : s.val_pendingSecondFirst;

  const obj = {
    [s.col_userOneId] : userOneId,
    [s.col_userTwoId] : userTwoId,
    [s.col_relationship] : relationship
  };

  return insert(obj);
}

function insert(connectionObj) {
  const now = h.getTimestamp();
  
  const obj = {
    ...connectionObj,
    [s.col_createdAt] : now,
    [s.col_updatedAt] : now
  };
  
  return knex.insert(obj)
  .into(s.table_Connection)
  .returning("*")
  .then(h.first);
}

// Update existing relationship between two users
function update(connection) {

  const now = h.getTimestamp();
  connection[s.col_updatedAt] = now;

  return knex(s.table_Connection)
  .where({
    [s.col_userOneId] : connection[s.col_userOneId],
    [s.col_userTwoId] : connection[s.col_userTwoId]
  })
  .update(connection);
}

// Return connection between two user ids, else null
function selectConnection(senderId, recipientId) {

  const {userOneId, userTwoId} = sortUsers(senderId, recipientId);

  const select = [s.col_userOneId, s.col_userTwoId, s.col_relationship, s.col_createdAt, s.col_updatedAt];
  const from = [s.table_Connection];
  const where = [
    s.col_userOneId,
    userOneId
  ];
  const and = [
      s.col_userTwoId,
    userTwoId
  ];
  const parameters = select.concat(from, where, and);
  const query = "SELECT ??, ??, ??, ??, ?? FROM ?? WHERE ?? = ? AND ?? = ?;";

  return knex.raw(query, parameters)
  .then(h.first);
}

// Select all connections for user id
function selectConnections(userId) {

  const select = ["*"];
  const from = [s.table_Connection];
  const where = [
    s.col_relationship,
    s.val_friends
  ];
  const and = [
    s.col_userOneId,
    userId
  ];
  const or = [
    s.col_userTwoId,
    userId
  ];

  const parameters = select.concat(from, where, and, or);
  const query = "SELECT ?? FROM ?? WHERE ??=? AND (??=? OR ??=?);"

  return knex.raw(query, parameters)
  .then(connections => {
    return filterUserConnections(userId, connections);
  });
}

// Select all pending connections for userId
async function selectPendingConnections(userId) {


  const sent = await selectSentConnections(userId);
  const received = await selectReceivedConnections(userId);
  return {
    "sent" : sent,
    "received" : received
  };
}

// Select pending connections sent by userId
function selectSentConnections(userId) {
  // SELECT * FROM dbo.[Connection] WHERE ((userOneId = 48 AND relationship = 'pending_first_second') OR
  // (userTwoId = 48 AND relationship = 'pending_second_first'));
  const parameters = [
    //select
    "*",
    //from
    s.table_Connection,
    //where
    s.col_userOneId,
    //=
    userId,
    //and
    s.col_relationship,
    //=
    s.val_pendingFirstSecond,
    //or
    s.col_userTwoId,
    //=
    userId,
    //and
    s.col_relationship,
    //equals
    s.val_pendingSecondFirst
  ];

  const query = `SELECT ?? FROM ?? WHERE ((?? = ? AND ?? = ?) OR (?? = ? AND ?? = ?))`;
  return knex.raw(query, parameters)
  .then( connectionRows => {
    var sentConnections = [];
    for(let row of connectionRows) {
      let otherUserId = getOtherUserId(userId, row);
      let connection = {
        userId : otherUserId,
        status : "sent",
        date : row[s.col_updatedAt],
      };

      sentConnections.push(connection);
    }

    return sentConnections;
  })
}

// Select pending connections received by userId
function selectReceivedConnections(userId) {
  // SELECT * FROM dbo.[Connection] WHERE ((userOneId = 2 AND relationship = 'pending_second_first') OR
  // (userTwoId = 2 AND relationship = 'pending_first_second'));
  const parameters = [
    //select
    "*",
    //from
    s.table_Connection,
    //where
    s.col_userOneId,
    //=
    userId,
    //and
    s.col_relationship,
    //=
    s.val_pendingSecondFirst,
    //or
    s.col_userTwoId,
    //=
    userId,
    //and
    s.col_relationship,
    //equals
    s.val_pendingFirstSecond
  ];

  const query = `SELECT ?? FROM ?? WHERE ((?? = ? AND ?? = ?) OR (?? = ? AND ?? = ?))`;
  return knex.raw(query, parameters)
  .then( connectionRows => {
    let receivedConnections = [];
    for(let row of connectionRows) {
      let otherUserId = getOtherUserId(userId, row);
      let connection = {
        userId : otherUserId,
        status : "received",
        date : row[s.col_updatedAt],
      };

      receivedConnections.push(connection);
    }

    return receivedConnections;
  })
}


function filterSentConnections(userId, connectionRows) {
  return connectionRows.filter( c => {
    return (
      c[s.col_relationship] == s.val_pendingFirstSecond &&
      c[s.col_userOneId] == userId
    ) || (
      c[s.col_relationship] == s.val_pendingSecondFirst &&
      c[s.col_userTwoId] == userId
    );
  });
}

function filterReceivedConnections(userId, connectionRows) {
  return connectionRows.filter( c => {
    return (
      c[s.col_relationship] == s.val_pendingFirstSecond &&
      c[s.col_userTwoId] == userId
    ) || (
      c[s.col_relationship] == s.val_pendingSecondFirst &&
      c[s.col_userOneId] == userId
    );
  })
}


function sortUsers(userOne, userTwo) {
  if(userOne < userTwo) {
    return {
      userOneId : userOne,
      userTwoId : userTwo
    };
  } else {
    return {
      userOneId : userTwo,
      userTwoId : userOne
    };
  }
}


/* Select all mutual connections between two user ids */
function selectMutual(currentUserId, otherUserId) {

  const select = [s.col_userOneId, s.col_userTwoId];
  const from = [s.table_Connection];
  const where = [
    s.col_relationship,
    s.val_friends
  ];
  const and = [
    s.col_userOneId,
    currentUserId,
    otherUserId,
    s.col_userTwoId,
    currentUserId,
    otherUserId
  ];
  const parameters = select.concat(from, where, and);
  const query = "SELECT ??, ?? FROM ?? WHERE ??=? AND (?? IN (?,?) OR ?? IN (?,?));"

  return knex.raw(query, parameters)
  .then(results => {
    const userOneFriends = filterUserConnections(currentUserId, results);
    const userTwoFriends = filterUserConnections(otherUserId, results);

    const mutualConnections = findMatches(userOneFriends, userTwoFriends);
    return mutualConnections;

    //
    // const mutualConnectionsArray = [];
    //
    // for(let x=0; x<mutualFriends.length; x++) {
    //
    //   let mutualFriendId = mutualFriends[x];
    //   const mutualConnection = {};
    //   mutualConnection.relationship = "friends";
    //   if(mutualFriendId > currentUserId) {
    //     mutualConnection.userOneId = currentUserId;
    //     mutualConnection.userTwoId = mutualFriendId;
    //   } else {
    //     mutualConnection.userOneId = mutualFriendId;
    //     mutualConnection.userTwoId = currentUserId;
    //   }
    //
    //   mutualConnectionsArray.push(mutualConnection);
    // }

    // return mutualConnectionsArray;
  })
}


/* Create a row in Connection table, representing a sent or received connection */
function upsertConnection(connectionObject) {

  const userOneId = connectionObject.userOneId;
  const userTwoId = connectionObject.userTwoId;
  
  return knex.select("*")
  .from(s.table_Connection)
  .where({
    [s.col_userOneId] : userOneId,
    [s.col_userTwoId] : userTwoId
  })
  .then(h.first)
  .then( row => {
    if(row) {
      return update(connectionObject);
    } else {
      return create(connectionObject);
    }
  })
}

/* Delete connection between two users */
function deleteConnection(currentUserId, otherUserId) {
  const {userOneId, userTwoId} = sortUsers(currentUserId, otherUserId);

  const from = [s.table_Connection];
  const where = [
    s.col_userOneId,
    userOneId
  ];
  const and = [
    s.col_userTwoId,
    userTwoId
  ];
  const parameters = from.concat(where, and)
  const query = "DELETE FROM ?? WHERE ?? = ? AND ?? = ?;";

  return knex.raw(query, parameters);
}


/* Select ids of all connections for userId */
function selectIds(userId) {

  return knex.select("*")
  .from(s.table_Connection)
  .where(s.col_userOneId, userId)
  .orWhere(s.col_userTwoId, userId)
  .then(results => {
    //Filter data to find connections
    return filterConnections(userId, results);
  })
}

/* Given rows from Connection table query, return all mutual
(i.e. non-pending) requests. Returns array of ids representing
connections the currentUserId has */
function filterConnections(currentUserId, connectionData) {
  const userOneIds = [];
  const userTwoIds = [];

  for(let i=0;i<connectionData.length;i++) {
    //Current row
    const connectionRow = connectionData[i];
    //Get ids in connection
    const userIdOne = connectionRow[s.col_userOneId];
    const userIdTwo = connectionRow[s.col_userTwoId];

    //Leave out current user id - doesn't tell us anything
    if(userIdOne != currentUserId) {
      userOneIds.push(userIdOne);
    }
    if(userIdTwo != currentUserId) {
      userTwoIds.push(userIdTwo);
    }
  }

  //Connections are where there is a mutual relationship - e.g.
  //userOneId = 3, userTwoId = 40
  //userOneId = 40, userTwoId = 3
  //One row was created on connection request, the other
  //was created on connection reception
  //Return array of ids that match between userOneIds and userTwoIds.
  return findMatches(userOneIds, userTwoIds);
}

/* Returns new array of items that were present in arrOne and arrTwo */
function findMatches(arrOne, arrTwo) {

  const newArray = [];

  for(let i=0; i<arrOne.length; i++) {
    //Check if arrOne element is present in arrTwo
    if(arrTwo.indexOf(arrOne[i]) > -1){
      //It is - push into newArray
      newArray.push(arrOne[i]);
    }
  }

  return newArray;
}



/* Given rows from Connection table, returns list of ids that have some level
  of connection with the userId - pending/connected */
function filterUserConnections(userId, connections) {

  const connectionIds = [];

  for(let i=0; i<connections.length; i++) {
    const connection = connections[i];

    const userOne = connection[s.col_userOneId];
    const userTwo = connection[s.col_userTwoId];

    //Make sure connection includes userId
    if(userOne == userId || userTwo == userId) {
      //Assign the id that ISN'T equal to userId to connectionId
      const connectionId = userOne == userId ? userTwo : userOne;
      connectionIds.push(connectionId);
    }
  }

  return connectionIds;
}

// Return the userId that isn't currentUserId from a connectionRow.
// If neither id is the current user, null is returned
function getOtherUserId(currentUserId, connectionRow) {
  if (connectionRow[s.col_userOneId] == currentUserId) {
    return connectionRow[s.col_userTwoId];
  } else if (connectionRow[s.col_userTwoId] == currentUserId) {
    return connectionRow[s.col_userOneId];
  }

  return null;
}
