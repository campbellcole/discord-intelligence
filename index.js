// 'require's
const WebSocket = require('ws');
const ws = new WebSocket.Server({ port: 3000 });

const Discord = require('discord.js');
const client = new Discord.Client();

const fs = require('fs');

// init

console.log("Developed by Campbell Cole");
console.log("If you do not have a tensorflow anaconda environment set up, this will not work.");

const TOKEN = fs.readFileSync('common/discord-token.txt', 'utf8');
