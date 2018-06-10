// 'require's
const WebSocket = require('ws');
const Discord = require('discord.js');
const fs = require('fs');

// init

console.log("Developed by Campbell Cole");
console.log("If you do not have a tensorflow anaconda environment set up, this will not work.");

const ws = new WebSocket.Server({ port: 3000 });

const client = new Discord.Client();
const TOKEN = fs.readFileSync('common/discord-token.txt', 'utf8');
client.login(TOKEN);

// vars

var discordConnected = false;
var socketConnected = false;

// discord

client.on('ready', () => { discordConnected=true; });

client.on('message', message => {
  if (msg.content.startsWith('det:')) {
    if (socketConnected) {
      
    } else {
      message.channel.send("The Neural Network is not running!\n"
      + "(socket not connected)");
    }
  }
});
