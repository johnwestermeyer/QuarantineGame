var express = require("express");

// Sets up the Express App
// =============================================================
var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var PORT = process.env.PORT || 8080;

// Requiring our models for syncing
var db = require("./models");

// Sets up the Express app to handle data parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static directory
app.use(express.static("public"));

// Routes
// =============================================================
require("./routes/api-routes.js")(app);
require("./routes/html-routes.js")(app);

// Syncing our sequelize models and then starting our Express app
// =============================================================

db.sequelize.sync({ force: false, alter: true }).then(function() {
  http.listen(PORT, function() {
    console.log("App listening on PORT " + PORT);    
  });
});

io.on('connection', function(socket){
  //create new lobby     
  socket.on('newGameLobby', data => {
    let lobbyCode = data.gameId;
    if(lobbyCode.length > 0){
      socket.join(lobbyCode);  
    }
  });
  //join existing lobby
  socket.on('joinLobby', code => {
      socket.join(code);    
  });
  //tell all players to render users
  socket.on('renderUser', code => {
    io.to(code).emit('renderUserReturn');
  });
  //placeholder start game
  socket.on('startGame', input => {
    io.to(input.code).emit('startGameReturn', input.card);
  })
  //chat message handling
  socket.on('chatMessage', function(msg, user, col, code){
    io.to(code).emit('chatMessageReturn', msg, user, col);
  });
  //send vote
  socket.on('sendVote', input => {
    io.to(input.code).emit('userVoted', {user: input.user, vote:input.vote})
  })
});