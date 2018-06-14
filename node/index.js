// 'require's

const WebSocket = require('ws');
const Discord = require('discord.js');
const fs = require('fs');
const PythonShell = require('python-shell');

const config_module = require('./config');

// preinit

var config = config_module.getConfig();

const wss = new WebSocket.Server({
  port: 3000,
  clientTracking: true
});

const client = new Discord.Client();
const TOKEN = config.TOKEN;
client.login(TOKEN);

const VERSION = "1.4.1";
const PREFIX = config.PREFIX;

// vars

var socketConnected = false;
var discordConnected = false;
var silent = !config.VERBOSE;
var channel = null; // single channel bot only
var pending = false; // one command at a time
var autogenerate = config.AUTOGEN;
var autogeneratedelay = config.AUTOGENDELAY; // milliseconds

// init

clearTimeout();
nextInterval();
if (config.AUTOSTART) startNet();

// discord

function sendDiscordMessage(text, overrideSilent = false) {
  if (!discordConnected) return;
  if (silent && !overrideSilent) return;
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
  if (message.content.startsWith(PREFIX)) {
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
  console.log('connected to net')
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
  var msg = message.content.substr(4);
  var args = msg.split(" ");
  var cmd = args.splice(0, 1)[0];
  if (channel == null) channel = message.channel;
  switch (cmd) {
    case "help":
      var helpstring_builder = "";
      var n = "\n";
      helpstring_builder += "**Format:** \"" + PREFIX + "<command> [args]\"" + n;
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
        helpstring_builder += "**setowner:** sets the privileged user" + n;
        helpstring_builder += "**setautogenerate <true/false> <delay>:** sets the timer for automatic generation" + n;
        helpstring_builder += "**initialize [verbose]:** initializes wolfram-bot" + n;
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
      sendDiscordMessage("Status:" +
        "\nsocketConnected = " + socketConnected +
        "\npending = " + pending +
        "\nmessage.content = " + message.content +
        "\ncmd = " + cmd +
        "\nargs = " + args +
        "\nchannel = " + channel +
        "\nmessage.author = " + message.author +
        "\nautogenerate = " + autogenerate +
        "\nautogeneratedelay = " + autogeneratedelay, true);
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
    case "setautogenerate":
      if (!isOwner(message)) return;
      if (args[0] != "true" && args[0] != "false") {
        sendDiscordMessage("Set to 'true' or 'false'.", true);
        return;
      }
      var willset = autogenerate;
      var newdelay = autogeneratedelay;
      if (parseInt(args[1]) == NaN || parseInt(args[0]) < 1) {
        sendDiscordMessage("Invalid number.", true);
        return;
      }
      if (willset) {
        if (args[1] != null) {
          newdelay = parseInt(args[1]);
        }
      }
      config.AUTOGEN = autogenerate = willset;
      config.AUTOGENDELAY = autogeneratedelay = newdelay;
      config_module.saveConfig(config);
      clearTimeout();
      nextInterval();
      break;
    case "config":
      if (args[0] == 'set') {
        if (config[args[1]] != null) {
          config[args[1]] = args[2];
          config_module.saveConfig(config);
        }
      } else if (args[0] == 'get') {
        if (config[args[1]] != null) {
          sendDiscordMessage(args[1] + ": " + config[args[1]], true);
        }
      }
      break;
    case "restart":
      if (!isOwner(message)) return;
      process.exit();
      break;
    default:
      sendDiscordMessage("Invalid command. Type \"" + PREFIX + "help\" for help.", true);
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
  });
}

function nextInterval() {
  setTimeout(function() {
    if (autogenerate) {
      handleCommand({
        content: PREFIX + "generate 100",
        channel: null,
        author: "console"
      });
    }
    nextInterval();
  }, autogeneratedelay);
}