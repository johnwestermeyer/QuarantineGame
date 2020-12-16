var socket = io();
var userList = [];
var user = "";
var userId = -1;
var round = 10;
var score = 0;
var deck = [];
var usedDeck = [];
var cons = "points";
var sidePanel = $(".sidepanel")
var thisGameId = "";
var socketId = "";
var allVoted = false;
const valueSpan = $('.valueSpan');
const rounds = $('#rounds');
const consVal = $('#cons')
const userDisp = $('#userDisp');
const scoreDisp = $('#scoreDisp');
const startButton = $('#startGame');
const lobbyDisp = $('#lobbyDisp');
const topCard = $('.bg-card-3');
const voteButtons = $('.voteBtn');
const timerDisp = $('#countdown');
let roundsNumber = 0;

//add socket id to userlist array
//add disconnect check and remove from userlist

function createGameLobby() {
    // Create a unique Socket.IO Room
    const idArr = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z',
    'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
    '0','1','2','3','4','5','6','7','8','9'];
    do{
        let i = Math.floor(Math.random() * idArr.length);
        thisGameId += idArr[i];
    }while(thisGameId.length<8);
    let data = {gameId: thisGameId}
    socket.emit('newGameLobby', data);
    let users = JSON.stringify(userList);
    $.post(`/api/gameroom/`, {
        lobbyCode: thisGameId,
        user: users,
        cons: cons,
        rounds: roundsNumber
    }, function(data, status){
        console.log("game room creation status: " + status)
    })
    lobbyDisp.html(thisGameId);
    renderUser();
};

function createButton(){
    startButton.attr("style","display:inline-block")
}

function renderUser() {
    sidePanel.text("");
    for (let i = 0; i < userList.length; i++){    
        let placeholderHtml = `<p><img src='./images/avatar-icons/${userList[i].avatar}.png'>${userList[i].name} - Score: ${userList[i].score}</p>
        <button type="button" id="${i}" class="voteBtn">Vote</button>`
        sidePanel.append(placeholderHtml);
    }
}

function createDeck() {
    $.get("/api/cards/1", function(data) {       
        if (data.length !== 0) {      
          for (var i = 0; i < data.length; i++) {
            deck.push(data[i]);
          }      
        }
        if(deck.length > 0){
        }   
      });
}


async function drawCard(){
    let card = Math.floor(Math.random() * deck.length);
    if(usedDeck.indexOf(card) === -1){
        usedDeck.push(card);
        return card;
    }else if(deck.length === usedDeck.length){
        usedDeck = [];
    }else{
        drawCard();
    }
}

startButton.click(() => startGame())

async function startGame() {
    let card = await drawCard();
    socket.emit("startGame", {code: thisGameId, card: card});
}

socket.on("startGameReturn", (i) => {        
    startButton.attr("style","display:none");
    let html = `<h3>Most Likely To</h3><p>${deck[i].body}</p><p>${deck[i].consequence} ${cons}</p>`;
    topCard.html(html);
    startVoting();
})

function startVoting(){
    voteButtons.attr("style","display:inline-block");
    let timer = 30;
    let countdown = setInterval(function(){
        timerDisp.html(timer);  
         timer--;
         if(timer <= 0 || allVoted){
             clearInterval(countdown);
         }
        }, 1000);
}

voteButtons.click(() => {
    voteButtons.this.id.attr("style","display:none");
    
})

function endGame() {    
    
}

function updateUserScore(){
    scoreDisp.html(score)
}

function getUserList(){
    $.get(`/api/gameroom/${thisGameId}`, function(data, status) {    
        userList = JSON.parse(data[0].user_list);
        if(status==="success"){

            renderUser();
            if(userList.length > 1){                 
                createButton();
            }
        }
      });      
}



function updateUser(user){
    $.get(`/api/gameroom/${thisGameId}`, function(data, status) {
        userList = JSON.parse(data[0].user_list);
        if(status==="success"){
            if(userList.length<8){
                userList.push(user);
                let input = JSON.stringify(userList);
                $.ajax({
                    url: `/api/gameroom/${thisGameId}`,
                    type: 'PUT',
                    data: {
                        users: input
                    },
                    success: function(data, status) {
                        socket.emit('renderUser', thisGameId);
                    }
                });           
            };
        }
    });     
}

socket.on('renderUserReturn', () => getUserList())

socket.on('connect', () => {
    if(localStorage.getItem("newLobby")){ 
        userList = [];
        let userArr = JSON.parse(localStorage.getItem("newLobby"));
        userList = userArr;
        localStorage.removeItem("newLobby");
        myModal.show();
        user = userArr[0].name;
        userId = 0;
        userDisp.html(user);
        socketId = socket.id;
        userArr[0].socket = socketId;
        updateUserScore();
        createDeck();
    }
    $("#lobbycreate").click(() => {
        myModal.hide()
        roundsNumber = rounds.val();
        if(consVal.val()){
            cons = consVal.val();
        }        
        createGameLobby();
    })
    if(localStorage.getItem("joinLobby")){
        let newUser = JSON.parse(localStorage.getItem("joinLobby"))[0];
        let lobbyCode = JSON.parse(localStorage.getItem("joinLobby"))[1];
        localStorage.removeItem("joinLobby");       
        user = newUser.name;       
        thisGameId = lobbyCode;  
        socketId = socket.id
        newUser.socket = socketId;
        socket.emit('joinLobby', thisGameId);
        userDisp.html(user);
        lobbyDisp.html(thisGameId);
        updateUserScore();
        updateUser(newUser);        
        createDeck();
        //needs to be revisted, name and avatar check
        // for(let i = 0; i < userArr.length; i++){
        //     if(newUser.name === userArr[i].name){
        //         newUser.name = newUser.name + "_";
        //     }            
        // }
        // joinGameLobby(lobbyCode);
    }
})

socket.on('disconnect', () => {
    //TBD
})


// let cardArr = [];
// const testFunction = () => {    
//     $.get("/api/cards/1", function(data) {       
//         if (data.length !== 0) {      
//           for (var i = 0; i < data.length; i++) {
//             cardArr.push(data[i]);
//           }      
//         }
//         if(cardArr.length > 0){
//         }   
//       });

      
// }
// const testFunction2 = () => {
//     let html = `<h3>Most Likely To</h3><p>${cardArr[2].body}</p><p>${cardArr[2].consequence} ${cons}</p>`
//     socket.emit('newGameLobby', {gameId: `12345678`, socketId: socket.id});
//     socket.emit('drawCard', html);
//     // $('.bg-card-3').append(html)
// }

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

socket.on('drawCardReturn', (html) => {
    console.log("test");
    $('.bg-card-3').text("");
    $('.bg-card-3').append(html);
})



