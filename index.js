// 'require's

const WebSocket = require('ws');
const Discord = require('discord.js');
const fs = require('fs');
const PythonShell = require('python-shell');

// init

const wss = new WebSocket.Server({ port: 3000, clientTracking: true });

const client = new Discord.Client();
const TOKEN = fs.readFileSync('common/discord-token.txt', 'utf8').trim();
client.login(TOKEN);

console.log("Developed by Campbell Cole");
console.log("If you do not have a tensorflow anaconda environment set up, this will not work.");

startNet();

// vars

var socketConnected = false;
var discordConnected = false;
var channel = null; // single channel bot only
var pending = false; // one command at a time

// discord

function sendDiscordMessage(text) {
  if (channel != null) {
    channel.send(text);
  }
}

client.on('ready', () => {
  discordConnected = true;
  console.log('logged in to discord: ' + client.user.tag);
  client.user.setActivity("hentai", {type:"WATCHING"});
  key = newKey();
});

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
    sendDiscordMessage("The Neural Network is not running!");
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
  if (discordConnected) sendDiscordMessage('Socket connected successfully.');
  ws.on('message', function incoming(message) {
    sendDiscordMessage(message);
    pending = false;
  });
});

// command handling

var key = "";

function handleCommand(message) {
  var msg = message.content.substr(4);
  var args = msg.split(" ");
  var cmd = args.splice(0, 1)[0];
  switch (cmd) {
    case "help":
      sendDiscordMessage("no lmao");
      break;
    case "link":
      if (message.channel == null) {
        console.log('cannot be run from console');
        break;
      }
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
    case "forcepending":
      var willBePending = args[0]=='true';
      if (args[1] == key) {
        pending = willBePending;
        sendDiscordMessage("Forced 'pending' to " + pending);
        key = newKey();
      }
      break;
    case "generate":
      if (parseInt(args[0]) > 200 && args[2] != key) {
        sendDiscordMessage("That's too many lmao don't crash my shit.");
      } else {
        sendSocketMessage(msg);
        key = newKey();
      }
      break;
    default:
      sendDiscordMessage("Invalid command. Don't ask me for help.");
  }
}

function newKey() {
  var text = "";
  var possible = "abcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 5; i++) text += possible.charAt(Math.floor(Math.random() * possible.length));
  console.log('new key: ' + text);
  return text;
}

// commandline input

process.stdin.resume();
process.stdin.setEncoding('utf8');
var util = require('util');
process.stdin.on('data', function (text) {
  if (channel == null) {
    console.log('channel not set, link to a channel in client');
    return;
  }
  handleCommand({content:"det:"+text.trim(), channel:null, author:"console"});
});

// neural network (python script)

//TODO: control the script from here instead of manually

var pyshell = null;

// -data_dir=common/study-data.txt -alphabet_dir=common/alphabet.txt -mode=gen -model=common/network.hdf5

// -data_dir=common/study-data.txt -alphabet_dir=common/alphabet.txt -mode=train -model=common/network.hdf5 -epochs=x -retrain=y
var trainArgs = ["--data_dir=common/study-data.txt", "--alphabet_dir=common/alphabet.txt", "--mode=train", "--model=common/network.hdf5"];

function startNet() {
  var genArgs = ["--data_dir=common/study-data.txt", "--alphabet_dir=common/alphabet.txt", "--mode=gen", "--model=common/network.hdf5"];
  /*if (!fs.existsSync("common/network.hdf5")) {
    console.log("network save file does not exist, you must begin training first");
    if (discordConnected) sendDiscordMessage("Could not start neural network. Checkpoint does not exist. Train the network.");
    return;
  }*/
  console.log('starting neural network with web socket');
  pyshell = new PythonShell('python/main.py', { pythonOptions: ["-u"], args: genArgs });
  pyshell.on('error', function (message) {
    console.log(message);
  });

}

function stopNet() {
  if (!pyshell.terminated) pyshell.terminate();
  else console.log("network already terminated");
}

function trainNet(epochs = 50, reset = false) {
  console.log('training network with ' + epochs + " epochs.");
  stopNet();
  trainArgs.push("-epochs="+epochs);
  if (reset) trainArgs.push('-retrain=True');
  pyshell = new PythonShell('python/main.py', trainArgs);
}
