"use strict";
//Did we need this many global variables? No. But here we are anyway
const socket = io();
let userList = [];
let user = "";
let userId = -1;
let round = 30;
let score = 0;
let deck = [];
let usedDeck = [];
let voting = [];
let cons = "points";
let thisGameId = "";
let socketId = "";
let consequence = 1;
let roundsNumber = 0;
let voteButtons = $('.voteBtn');  
let timer = 0;
const sidePanel = $(".sidepanel")
const valueSpan = $('.valueSpan');
const rounds = $('#rounds');
const consVal = $('#cons')
const userDisp = $('#userDisp');
const scoreDisp = $('#scoreDisp');
const startButton = $('#startGame');
const lobbyDisp = $('#lobbyDisp');
const topCard = $('.bg-card-3');
const timerDisp = $('#countdown');
const winnerDisp = $('#winnerDisp');
let color = '#563d7c';

//TODO
//add disconnect check and remove from userlist
//refactor majority of code
  //reduce global variables
  //get rid of local storage uses for joining (probably replace with mySQL post/get)
  //move more functionality to server side (and try not to overwelm heroku)
  //use destructuring in topCard.html() methods
  //clean up join game functions, add functions where necessary (overlap)
  //fix score storage in DB
  //find a way to redo updateUser without nesting queries
//Roadmap:
  //mid-game QOL (pause, edit settings)
  //more cards, import cards


//new Lobby set up with
function createGameLobby() {
  // Create a unique Socket.IO Room
  const idArr = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  do {
    let i = Math.floor(Math.random() * idArr.length);
    thisGameId += idArr[i];
  } while (thisGameId.length < 8);
  let data = {
    gameId: thisGameId
  }
  socket.emit('newGameLobby', data);
  let users = JSON.stringify(userList);
  $.post(`/api/gameroom/`, {
    lobbyCode: thisGameId,
    user: users,
    cons: cons,
    rounds: round
  }, function(data, status) {
    console.log("game room creation status: " + status)
  })
  lobbyDisp.html(thisGameId);
  renderUser();
};

//add start button for host
function createButton() {
  if (userId === 0) {
    startButton.attr("style", "display:inline-block");
  }
}

//updates the userlist sidebar
function renderUser() {
  sidePanel.text("");
  for (let i = 0; i < userList.length; i++) {
    let placeholderHtml = `<p><img width="50px" height="50px" src='./images/avatar-icons/${userList[i].avatar}.png'>${userList[i].name} - Score: ${userList[i].score}
        <button type="button" id="${i}" class="voteBtn btn-danger">Vote</button></p>`
    sidePanel.append(placeholderHtml);
  }
}

//creates the deck, this is stored locally but is the same array for every client
function createDeck() {
  $.get("/api/cards/1").then(data => {
    for (let i = 0; i < data.length; i++) {
      deck.push(data[i])
    }
  })
}

//draws a new card, checks to make sure all the cards are used before you get duplicates
function drawCard() {
  let card = Math.floor(Math.random() * deck.length);
  if (usedDeck.indexOf(card) === -1) {
    usedDeck.push(card);
    return card;
  } else {
    if (usedDeck.length !== deck.length) {
      return drawCard();
    }
  }
}
//starts the game on start button click
startButton.click(() => {
    startTrue();
    startGameHost();
})
//host-specific start game function that emits to other lobby users to start the game
function startGameHost() {
  let card = drawCard();
  socket.emit("startGame", {
    code: thisGameId,
    card: card
  });
}
//receive start game instructions from server
socket.on('startGameReturn', (i) => {
  roundCheck(i);
});

//client-side round checker, no server call need :) 
//the paramater here is so I can pass it to startGame lmao
function roundCheck(i) {
  if (roundsNumber < round) {
    roundsNumber++;
    startGame(i);
  } else {
    endGame();
  }
}
//populates the card on the screen with the current card data

function startGame(i){
    consequence = deck[i].consequence;
    let html = `<p class="game-question-text">${deck[i]?.body}</p><p class="in-game-cons">${deck[i]?.consequence} ${cons}</p>`;
    topCard.html(html);
    startVoting();

}
//redefines voteButtons, then makes them visible
function startVoting() {
  voteButtons = $('.voteBtn');
  voteButtons.attr("style", "display:inline-block");
  timer = 30;
  countdownStart();
}
//starts 30 sec countdown timer, round ends once everyone had voted or the timer runs out
function countdownStart() {
  let countdown = setInterval(function() {
    timerDisp.html(timer + " sec left");
    timer--;
    if (timer < 0 || voting.length === userList.length) {
      timerDisp.html("");
      clearInterval(countdown);
      endVoting();
    }
  }, 1000);

}
//scrapes your vote based on the id of the vote button you used
$(document).on("click", '.voteBtn', (function() {
  console.log("vote cast");
  var id = $(this).attr('id');
  voteButtons.attr("style", "display:none");
  sendVote(id);
}));
//sends your vote to the server 
function sendVote(id) {
  socket.emit('sendVote', {
    user: userId,
    vote: id,
    code: thisGameId
  });
}

//accepts other users votes and stores them
//stored in plain text so feel free to found out how your friends really feel about you :P
socket.on('userVoted', input => {
  voting.push([input.user, parseInt(input.vote)])
})
//ends the voting, clears the timer again (just in case), and tabulates the voting
function endVoting() {
  clearInterval(countdown);
  let result = Array(userList.length).fill(0);
  voting.forEach(e => {
    result[e[1]]++;
  })
  voting = [];
  announceWinner(result);
}
//displays the winner based on highest score
//tie breaker goes to whoever is earliest in the index (sorry host)
function announceWinner(result) {
  let i = result.indexOf(Math.max(...result));
  userList[i].score += consequence;
  if (i === userId) {
    scoreDisp.html(userList[i].score)
  }
  if (usedDeck.length === deck.length) {
    usedDeck = [];
  }
  renderUser();
  topCard.html(`<h4 class="round-winner">${userList[i].name} receives </h4> <h4 class="in-game-cons">${consequence} ${cons}</h4>`)
  setTimeout(() => {
    if (userId === 0) {
      startGameHost();
    }
  }, 7000);
}
//called if round number is equal to rounds played
//displays the final winner

function endGame() { 
    let i = Math.max.apply(Math, userList.map(function(e) { return e.score }));
    let x = userList.findIndex(e => e.score === i);
    topCard.html(`<h4 class="gameover">Game Over</h4><br>
    <h3 class="winner"><p>${userList[x].name}</p> is the "grand winner" with ${i} ${cons}</h3>`)    

}
//a mostly useless function that displays the inital score on player joining
function updateUserScore() {
  scoreDisp.html(score)
}
//populates the user list from the database
function getUserList() {
  $.get(`/api/gameroom/${thisGameId}`, function(data, status) {
    userList = JSON.parse(data[0].user_list);
    if (status === "success") {
      renderUser();
      if (userList.length > 1) {
        createButton();
      }
    }
  });
}
//updates user list when any user after the host joins; should probably be two functions
function updateUser(newUser) {
  $.get(`/api/gameroom/${thisGameId}`, function(data, status) {
    userList = JSON.parse(data[0].user_list);
    round = data[0].rounds;
    cons = data[0].cons_name;
    let start = data[0].start;
    let userReturn = usernameCheck(newUser, userList);
    user = userReturn.name;
    color = userReturn.color;
    userDisp.html(user);
    lobbyDisp.html(thisGameId);
    //refactor into one if and statemnet
    if(!start){
        if (status === "success") {
            if (userList.length <= 8) {              
                socket.emit('joinLobby', thisGameId);
                userList.push(userReturn);
                userId = userList.length - 1;
                let input = JSON.stringify(userList);
                $.ajax({
                  url: `/api/gameroom/user/${thisGameId}`,
                  type: 'PUT',
                  data: {
                      users: input
                  },
                  success: function(data, status) {
                      socket.emit('renderUser', thisGameId);
                  }
                });
            } else {
                errorJoin();
                };
            }
        } else{
            errorJoin();
        }
  });
}
//tells the user to GTFO because they can't join that game
function errorJoin(){
    topCard.html(`<h4 class="sorry">SORRY!</h4>
    <p class="lobby-full">This game is either full or your friends have started without you.</p> 
    <h4 class="text-center"><a href="/" class="go-back">Go Back</a></h4>`)
}

//checks to make sure usernames are unique
function usernameCheck(user, userList) {
  if (userList.some(e => {
      return e.name === user.name
    })) {
    user.name += "_";
    return usernameCheck(user, userList);
  } else {
    return user;
  }
}
//updates gameroom started value to stop new players from joining
function startTrue(){
    $.ajax({
        url: `/api/gameroom/start/${thisGameId}`,
        type: 'PUT',
        data: {
        start: true
        },
        success: function(data, status) {
            console.log("Game status updated: " + status)
        }
    }
)}
//tells uses to repull the user list for sidebar population
socket.on('renderUserReturn', () => getUserList())
//the start function
socket.on('connect', () => {
  //host user game set up
  if (localStorage.getItem("newLobby")) {
    userList = [];
    let userArr = JSON.parse(localStorage.getItem("newLobby"));
    userList = userArr;
    localStorage.removeItem("newLobby");
    myModal.show();
    user = userArr[0].name;    
    color = userArr[0].color;
    userId = 0;
    userDisp.html(user);
    socketId = socket.id;
    userArr[0].socket = socketId;
    updateUserScore();
    createDeck();
  }
  //modal submit button with preferences
  $("#lobbycreate").click(() => {
    myModal.hide()
    round = rounds.val();
    if (consVal.val().trim()) {
      cons = consVal.val().trim();
    }
    createGameLobby();
  })
  //non-host user set up
  if (localStorage.getItem("joinLobby")) {
    let newUser = JSON.parse(localStorage.getItem("joinLobby"))[0];
    let lobbyCode = JSON.parse(localStorage.getItem("joinLobby"))[1];
    localStorage.removeItem("joinLobby");
    thisGameId = lobbyCode;
    socketId = socket.id
    newUser.socket = socketId;
    updateUserScore();
    updateUser(newUser);
    createDeck();
  }
})

//game setup modal definition and functionality
var myModal = new bootstrap.Modal(document.getElementById('staticBackdrop'), {
  backdrop: 'static',
  keyboard: false
})
$(document).ready(function() {
  valueSpan.html(rounds.val());
  rounds.on('input change', () => {
    valueSpan.html(rounds.val());
  });
});

//chat functionality
$(function () {
  $('#chat').submit(function(e){
    e.preventDefault(); // prevents page reloading
    if($('#m').val()){      
      socket.emit('chatMessage', $('#m').val(), user, color, thisGameId);
      $('#m').val('');
    }
    return false;
  });
});
//incoming chat messages
socket.on('chatMessageReturn', function(msg, user, col){
  let html = `<li><span style="color:${col}; font-weight: 700">${user}</span>: ${msg}</li>`;
  $('#chatmessages').append(html);  
  $('.chatContents').scrollTop($('.chatContents')[0].scrollHeight);
});

