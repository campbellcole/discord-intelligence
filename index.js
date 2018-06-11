// 'require's

const WebSocket = require('ws');
const Discord = require('discord.js');
const fs = require('fs');

// init

const wss = new WebSocket.Server({ port: 3000, clientTracking: true });

const client = new Discord.Client();
const TOKEN = fs.readFileSync('common/discord-token.txt', 'utf8').trim();
client.login(TOKEN);

console.log("Developed by Campbell Cole");
console.log("If you do not have a tensorflow anaconda environment set up, this will not work.");

// vars

var socketConnected = false;
var channel = null; // single channel bot only
var pending = false; // one command at a time

// discord

function sendDiscordMessage(text) {
  if (channel != null) {
    channel.send(text);
  }
}

client.on('ready', () => { console.log('logged in to discord: ' + client.user.tag); });

client.on('message', message => {
  if (message.content.startsWith('det:')) {
    if (channel == null) channel = message.channel;
    handleCommand(message);
  } else { // no newlines will probably make it funnier
    if (message.author != client.user && message.content != "") fs.appendFile("common/study-data.txt", " " + message.content, () => {});
  }
});

// websocket

function sendSocketMessage(text) {
  if (!socketConnected) {
    sendDiscordMessage("The Neural Network is not running!\n"
                      + "socketConnected = false");
    return;
  }
  if (!pending) {
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(text);
      }
    }); // maybe i could hook up multiple neural networks with this
    pending = true;
  } else {
    sendDiscordMessage("Operation currently pending. Please wait.");
  }
}

wss.on('connection', ws => {
  console.log('connected to neural network')
  socketConnected = true;
  ws.on('message', function incoming(message) {
    sendDiscordMessage(message);
    pending = false;
  });
});

// command handling

function handleCommand(message) {
  var msg = message.content.substr(4);
  var args = msg.split(" ");
  var cmd = args.splice(0,1)[0];
  switch (cmd) {
    case "help":
      sendDiscordMessage("no lmao");
      break;
    case "link":
      channel = message.channel;
      sendDiscordMessage("Linked to current channel. (If you DM me commands, the outputs will appear here)");
      break;
    case "status":
      sendDiscordMessage("Status:"
                        + "\nsocketConnected = " + socketConnected
                        + "\npending = " + pending
                        + "\nmessage.content = " + message.content
                        + "\ncmd = " + cmd
                        + "\nargs = " + args
                        + "\nchannel = " + channel
                        + "\nmessage.author = " + message.author);
      break;
    case "generate":
      if (parseInt(args[0]) > 200) {
        sendDiscordMessage("That's too many lmao don't crash my shit.");
      } else {
        sendSocketMessage(msg);
      }
      break;
    default:
      sendDiscordMessage("Invalid command. Don't ask me for help.");
  }
}

// neural network (python script)

//TODO: control the script from here instead of manually

//const shell = require('shelljs');

function startNet() {

}

function stopNet() {

}

function trainNet(epochs = 50) {

}
