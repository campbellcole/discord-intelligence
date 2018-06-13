// 'require's

const WebSocket = require('ws');
const Discord = require('discord.js');
const fs = require('fs');
const PythonShell = require('python-shell');

// init

const wss = new WebSocket.Server({
  port: 3000,
  clientTracking: true
});

const client = new Discord.Client();
const TOKEN = fs.readFileSync('common/discord-token.txt', 'utf8').trim();
client.login(TOKEN);

console.log("Developed by Campbell Cole");
console.log("If you do not have a tensorflow anaconda environment set up, this will not work.");

// vars

var socketConnected = false;
var discordConnected = false;
var owner = null;
var channel = null; // single channel bot only
var pending = false; // one command at a time

// discord

function sendDiscordMessage(text) {
  if (!discordConnected) return;
  if (channel != null) {
    channel.send(text);
  }
}

client.on('ready', () => {
  discordConnected = true;
  console.log('logged in to discord: ' + client.user.tag);
  client.user.setActivity("hentai", {
    type: "WATCHING"
  });
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
  socketConnected = true;
  sendDiscordMessage('Network started successfully.');
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
      if (args[0] != key) return;
      key = newKey();
      if (message.channel == null) break;
      channel = message.channel;
      sendDiscordMessage("Linked to current channel. (If you DM me commands, the outputs will appear here)");
      break;
    case "status":
      if (args[0] != key) return;
      key = newKey();
      sendDiscordMessage("Status:" +
        "\nsocketConnected = " + socketConnected +
        "\npending = " + pending +
        "\nmessage.content = " + message.content +
        "\ncmd = " + cmd +
        "\nargs = " + args +
        "\nchannel = " + channel +
        "\nmessage.author = " + message.author);
      break;
    case "forcepending":
      if (args[1] != key) return;
      key = newKey();
      var willBePending = args[0] == 'true';
      pending = willBePending;
      sendDiscordMessage("Forced 'pending' to " + pending);
      break;
    case "startnet":
      if (args[0] != key) return;
      key = newKey();
      startNet();
      break;
    case "stopnet":
      if (args[0] != key) return;
      key = newKey();
      stopNet();
      break;
    case "trainnet":
      if (args[2] != key) return;
      key = newKey();
      var epochs = 50,
        retrain = false;
      if (args[0] != null && args[0] != "") epochs = parseInt(args[0]);
      if (args[1] != null && args[1] != "") retrain = (args[1] == 'true');
      trainNet(epochs, retrain);
      break;
    case "setowner":
      if (owner == null) {
        owner = message.author;
      } else {
        message.author.send("Nice try.");
      }
      break;
    case "generate":
      if (parseInt(args[0]) > 200 && args[2] != key) {
        sendDiscordMessage("Too many characters. That's gonna take too long.");
      } else {
        if (args[2] == key) {
          key = newKey();
        }
        sendSocketMessage(msg);
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
  owner.send(text);
  return text;
}

// commandline input

process.stdin.resume();
process.stdin.setEncoding('utf8');
var util = require('util');
process.stdin.on('data', function(text) {
  if (channel == null) return;
  handleCommand({
    content: "det:" + text.trim(),
    channel: null,
    author: "console"
  });
});

// neural network (python script)

//TODO: control the script from here instead of manually

var pyshell = null;

function startNet() {
  var genArgs = ["--data_dir=common/study-data.txt", "--alphabet_dir=common/alphabet.txt", "--mode=gen", "--model=common/network.hdf5"];
  if (!fs.existsSync("common/network.hdf5")) {
    sendDiscordMessage("Could not start neural network. Checkpoint does not exist. Train the network.");
    return;
  }
  sendDiscordMessage("Starting neural network...");
  pyshell = new PythonShell('python/main.py', {
    args: genArgs
  });
  pyshell.on('error', () => {});
  pyshell.on('message', () => {});
  pyshell.on('close', () => {
    sendDiscordMessage('Neural network stopped.');
  });
}

function stopNet() {
  if (pyshell == null) return;
  if (!pyshell.terminated) pyshell.terminate();
}

function trainNet(epochs = 50, reset = false) {
  var trainArgs = ["--data_dir=common/study-data.txt", "--alphabet_dir=common/alphabet.txt", "--mode=train", "--model=common/network.hdf5"];
  stopNet();
  trainArgs.push("--epochs=" + epochs);
  if (reset) trainArgs.push('--retrain=True');
  pyshell = new PythonShell('python/main.py', {
    args: trainArgs
  });
  pending = true;
  pyshell.on('error', () => {});
  pyshell.on('message', () => {});
  pyshell.on('close', () => {
    sendDiscordMessage('Training completed. Ran ' + epochs + ' epochs.');
    pending = false;
  });
}