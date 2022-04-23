# Barn Hill Quotes Application
(what are we calling this thing?)

## Permissions overview
---

Most of the authorization and authentication work takes place on the back end in the database
and the server.

The database is MySQL, and is currently just set up for basic auth purposes and a single placeholder table 
for Quotes.

The auth setup is based on OAuth 2.0, and utilizes Role Based Access Control (RBAC). In short, users
sign up and authenticate with the Auth server (authorization/routes.js). Successful authentication results
in the vending of an access token, which represents a set of permissions in the form of 'claims' that an
application (the front end React app) is allowed to perform on behalf of the end user as long as the 
access token is fresh. Access tokens can be refreshed with a (typically long-lived) refresh token.

In the database, RBAC is set up in the following tables and their accompanying junction tables:
AppScope - scopes for the application
UserRole - roles for the application
AppScope_UserRole - assignment of scopes to roles
AppUser_UserRole - assignment of roles to users
AppUser_AppScope - oneoff scope assignments to users if desired (not usually needed)

Applications have scopes, usually in the form of a CRUD verb followed by an entity, or specific strings
defined by the OAuth 2.0 spec:
'create:quote'
'read:quote'
'edit:quote'
'delete:quote'
'email'
'profile'
'offline_access'

etc. A scope represents what an action that a *role* can perform on that entity. Users are then assigned
roles, granting them all the associated permissions for that role.

When a user authenticates with the authorization server, they receive an access token in the form of a JWT
which contains encoded scopes. On the resource server (the Quotes API server in this case), any route can 
be mounted with a custom set of permission checks, ensuring that the incoming request contains a JWT that 
contains the required scopes to perform the operation at that route. If the scopes are not present, a 403 
response is served.


## The App
The front end application is a React app; there is a placeholder React app served at /barnhill/v1/quoter.
The files served are just a build of a React project, located at /web/build/*