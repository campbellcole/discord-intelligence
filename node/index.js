// 'require's

const WebSocket = require('ws');
const Discord = require('discord.js');
const fs = require('fs');
const PythonShell = require('python-shell');

const config_module = require('./config');

// preinit

var config = config_module.getConfig();
config.AUTOGENDELAY = parseInt(config.AUTOGENDELAY);
config.MAXGEN = parseInt(config.MAXGEN);

const wss = new WebSocket.Server({
  port: 3000,
  clientTracking: true
});

const client = new Discord.Client();
const TOKEN = config.TOKEN;
client.login(TOKEN);

const VERSION = "1.5";

// vars

var socketConnected = false;
var discordConnected = false;
var channel = null; // single channel bot only
var pending = false; // one command at a time

// init

clearTimeout();
nextInterval();
if (config.AUTOSTART) startNet();

// discord

function sendDiscordMessage(text, overrideSilent = false) {
  if (!discordConnected) return;
  if (config.SILENT && !overrideSilent) return;
  if (channel != null) {
    channel.send(text);
  }
}

client.on('ready', () => {
  discordConnected = true;
  client.user.setActivity(config.ACTIVITY, {
    type: config.ACTTYPE
  });
});

client.on('message', message => {
  if (message.content.startsWith(config.PREFIX)) {
    if (channel == null) channel = message.channel;
    handleCommand(message);
  } else { // no newlines will probably make it funnier
    if (message.author != client.user && message.content != "") fs.appendFile("common/study-data.txt", " " + message.content, () => {});
  }
});

// websocket

function sendSocketMessage(text) {
  if (!socketConnected) {
    sendDiscordMessage("The Neural Network is not running!", true);
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
    sendDiscordMessage("Operation currently pending. Please wait.", true);
  }
}

wss.on('connection', ws => {
  socketConnected = true;
  sendDiscordMessage('Network started successfully.');
  ws.on('message', function incoming(message) {
    sendDiscordMessage(message, true);
    pending = false;
  });
});

// command handling

var key = "";

function handleCommand(message) {
  var msg = message.content.substr(config.PREFIX.length);
  var args = msg.split(" ");
  var cmd = args.splice(0, 1)[0];
  if (channel == null) channel = message.channel;
  switch (cmd) {
    case "help":
      var helpstring_builder = "";
      var n = "\n";
      helpstring_builder += "**Format:** \"" + config.PREFIX + "<command> [args]\"" + n;
      helpstring_builder += "__Commands:__" + n;
      helpstring_builder += "**help:** displays this message" + n;
      helpstring_builder += "**generate <length> [seed]:** generates text" + n;
      if (isOwner(message)) {
        helpstring_builder += "**link:** sets \"channel\" to current channel" + n;
        helpstring_builder += "**status:** displays variables currently set" + n;
        helpstring_builder += "**forcepending <true/false>:** forces the \"pending\" variable in case it's stuck" + n;
        helpstring_builder += "**startnet:** starts the neural network" + n;
        helpstring_builder += "**stopnet:** stops the neural network" + n;
        helpstring_builder += "**trainnet <epochs> [retrain]:** trains the neural network" + n;
        helpstring_builder += "__***WARNING: if [retrain] is set to \"true\", the network will be erased and restarted!***__" + n;
        helpstring_builder += "**resetautogenerate:** restarts the timer for auto generation" + n;
        helpstring_builder += "**config <get> <key>:** gets variables in the configuration file" + n;
        helpstring_builder += "**config <set> <key> <value...>:** sets variables in the configuration file" + n;
        helpstring_builder += "**restart:** restarts the wolfram-bot" + n;
      }
      sendDiscordMessage(helpstring_builder);
      break;
    case "link":
      if (!isOwner(message)) return;
      channel = message.channel;
      sendDiscordMessage("Linked to current channel.");
      break;
    case "status":
      if (!isOwner(message)) return;
      var dataset = fs.readFileSync("common/study-data.txt").toString();
      sendDiscordMessage("Status:" +
        "\nsocketConnected = " + socketConnected +
        "\npending = " + pending +
        "\nmessage.content = " + message.content +
        "\ncmd = " + cmd +
        "\nargs = " + args +
        "\nchannel = " + channel +
        "\nmessage.author = " + message.author +
        "\nautogenerate = " + config.AUTOGEN +
        "\nautogeneratedelay = " + config.AUTOGENDELAY +
        "\ndataset.length (characters) = " + dataset.length +
        "\ndataset.length (words) = " + dataset.split(" ").length, true);
      break;
    case "forcepending":
      if (!isOwner(message)) return;
      pending = args[0] == 'true';
      sendDiscordMessage("Forced 'pending' to " + pending);
      break;
    case "startnet":
      if (!isOwner(message)) return;
      if (pending) return;
      startNet();
      break;
    case "stopnet":
      if (!isOwner(message)) return;
      if (pending) return;
      stopNet();
      break;
    case "trainnet":
      if (!isOwner(message)) return;
      if (pending) return;
      var epochs = 50,
        retrain = false;
      if (parseInt(args[0]) == NaN) {
        sendDiscordMessage("Invalid number.", true);
        return;
      }
      if (args[0] != null && args[0] != "") epochs = parseInt(args[0]);
      if (args[1] != null && args[1] != "") retrain = (args[1] == 'true');
      discordConnected = false;
      trainNet(epochs, retrain);
      break;
    case "generate":
      if (parseInt(args[0]) > config.MAXGEN && !isOwner(message)) {
        sendDiscordMessage("Too many characters. That's gonna take too long.", true);
      } else {
        if (parseInt(args[0]) == NaN || parseInt(args[0]) < 1) {
          sendDiscordMessage("Invalid number.", true);
          return;
        }
        sendSocketMessage(msg);
      }
      break;
    case "resetautogenerate":
      if (!isOwner(message)) return;
      clearTimeout();
      nextInterval();
      break;
    case "config":
      if (args[0] == 'set') {
        if (config[args[1]] != null) {
          var key = args[1];
          args.splice(0, 2);
          config[key] = args.join(" ").toString();
          config_module.saveConfig(config);
        }
      } else if (args[0] == 'get') {
        if (config[args[1]] != null) {
          sendDiscordMessage(args[1] + ": " + config[args[1]], true);
        }
      }
      break;
    case "version":
      sendDiscordMessage("v" + VERSION, true);
      break;
    case "restart":
      if (!isOwner(message)) return;
      process.exit();
      break;
    default:
      sendDiscordMessage("Invalid command. Type \"" + config.PREFIX + "help\" for help.", true);
  }
}

function isOwner(message) {
  return (message.author == channel.guild.owner.user);
}

// neural network (python script)

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
    discordConnected = true;
    sendDiscordMessage('Training completed. Ran ' + epochs + ' epochs.', true);
    pending = false;
    startNet();
  });
}

function nextInterval() {
  setTimeout(function() {
    if (config.AUTOGEN) {
      handleCommand({
        content: config.PREFIX + "generate 100",
        channel: null,
        author: "console"
      });
    }
    nextInterval();
  }, config.AUTOGENDELAY);
}