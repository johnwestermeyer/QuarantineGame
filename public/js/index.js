const userInput = $('#username');
const imageInput = $('#inputGroupSelect04');
const lobbyInput = $('#lobby');

//create a Lobby button click
$('.create').click(() => {
    let avatar = imageInput.val();
    if(avatar === "Choose Your Avatar"){
        avatar = "trash";
    }
    let name = userInput.val().trim();
    let color = $('#color').val();
    let userArr = [];
    //make sure there is name value
    if(name){
        userArr = [{name: name, avatar: avatar, score: 0, color}];
        localStorage.setItem("newLobby", JSON.stringify(userArr));
        window.location.href = "/game";
    } else {
        alert("Username Required to Join a Lobby");  
    }
})

//join a Lobby button click
$('.join').click(() => {
    let name = userInput.val().trim();
    let avatar = imageInput.val();    
    let color = $('#color').val();
    if(avatar === "Choose Your Avatar"){
        avatar = "trash";
    }
    let sentData = [];
    let lobbyCode = lobbyInput.val().trim();
    //making sure there is a lobby value
    if(!lobbyCode){
        alert("Lobby Code Required to Join a Lobby");       
    }else{ 
        if(name){
        sentData = [{name: name, avatar: avatar, score: 0, color},lobbyCode];
        localStorage.setItem("joinLobby", JSON.stringify(sentData));
        window.location.href = "/game";
    } else {
        alert("Username Required to Join a Lobby");  
    }}
})

//avatar image preview
$(document).ready(function() {
    const valueSpan = $('.valueSpan');
    const value = imageInput;
    value.change(function() {
        if($(this).val() !== "Choose Your Avatar"){
            valueSpan.html(`<img src="/images/avatar-icons/${$(this).val()}.png">`);
        }
    }).change();
  });

  