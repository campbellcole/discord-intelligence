// 'require's
const WebSocket = require('ws');
const Discord = require('discord.js');
const fs = require('fs');

// init

console.log("Developed by Campbell Cole");
console.log("If you do not have a tensorflow anaconda environment set up, this will not work.");

const wss = new WebSocket.Server({ port: 3000 });

const client = new Discord.Client();
const TOKEN = fs.readFileSync('common/discord-token.txt', 'utf8').trim();
client.login(TOKEN);

// vars

var discordConnected = false;
var socketConnected = false;

var channel = null; // single channel bot only

var pending = false; // one command at a time

// discord

function sendDiscordMessage(text) {
  if (channel != null) {
    channel.send(text);
  }
}

client.on('ready', () => { discordConnected=true; });

client.on('message', message => {
  if (message.content.startsWith('det:')) {
    if (channel == null) channel = message.channel;
    if (socketConnected) {
      if (!pending) {
        sendSocketMessage(message.content.substr(4));
        pending = true;
      } else {
        sendDiscordMessage("Operation currently pending. Please wait.")
      }
    } else {
      message.channel.send("The Neural Network is not running!\n"
      + "(socket not connected)");
    }
  }
});

// websocket

function sendSocketMessage(text) {
  wss.clients[0].send(text); // will never be multiple clients
}

wss.on('connection', ws => {
  socketConnected = true;
  ws.on('message', function incoming(message) {
    sendDiscordMessage(message);
    pending = false;
  });
});
