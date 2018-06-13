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

const VERSION = "1.3.2";
const PREFIX = "det:";

// vars

var socketConnected = false;
var discordConnected = false;
var silent = false;
var owner = null;
var channel = null; // single channel bot only
var pending = false; // one command at a time
var autogenerate = false;
var autogeneratedelay = 1800000; // milliseconds

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
  client.user.setActivity("hentai", {
    type: "WATCHING"
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
  switch (cmd) {
    case "help":
      var helpstring_builder = "";
      var n = "\n";
      helpstring_builder += "**Format:** \"" + PREFIX + "<command> [args]\"" + n;
      helpstring_builder += "__Commands:__" + n;
      helpstring_builder += "**help:** displays this message" + n;
      helpstring_builder += "**generate <length> [seed]:** generates text" + n;
      if (message.author == owner) {
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
      if (message.author != owner) return;
      if (message.channel == null) return;
      channel = message.channel;
      sendDiscordMessage("Linked to current channel.");
      break;
    case "status":
      if (message.author != owner) return;
      sendDiscordMessage("Status:" +
        "\nsocketConnected = " + socketConnected +
        "\npending = " + pending +
        "\nmessage.content = " + message.content +
        "\ncmd = " + cmd +
        "\nargs = " + args +
        "\nchannel = " + channel +
        "\nmessage.author = " + message.author, true);
      break;
    case "forcepending":
      if (message.author != owner) return;
      pending = args[0] == 'true';
      sendDiscordMessage("Forced 'pending' to " + pending);
      break;
    case "startnet":
      if (message.author != owner) return;
      if (pending) return;
      startNet();
      break;
    case "stopnet":
      if (message.author != owner) return;
      if (pending) return;
      stopNet();
      break;
    case "trainnet":
      if (message.author != owner) return;
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
    case "setowner":
      if (owner == null) {
        owner = message.author;
      } else {
        message.author.send("Nice try.");
      }
      break;
    case "generate":
      if (parseInt(args[0]) > 200 && message.author != owner) {
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
      if (message.author != owner) return;
      if (args[0] != "true" && args[0] != "false") {
        sendDiscordMessage("Set to 'true' or 'false'.", true);
        return;
      }
      var willset = (args[0] == 'true');
      var newdelay = 1800000; // default
      if (parseInt(args[1]) == NaN || parseInt(args[0]) < 1) {
        sendDiscordMessage("Invalid number.", true);
        return;
      }
      if (willset) {
        if (args[1] != null) {
          newdelay = parseInt(args[1]);
        }
      }
      autogenerate = willset;
      autogeneratedelay = newdelay;
      clearTimeout();
      nextInterval();
      break;
    case "initialize":
      silent = !(args[0] == "verbose");
      sendDiscordMessage("wolfram-bot v" + VERSION + " by Campbell Cole", true);
      var willstartnet = !(args[0] == 'false')
      // setowner
      if (owner == null) {
        owner = message.author;
      } else {
        message.author.send("Nice try.");
      }
      // link
      channel = message.channel;
      sendDiscordMessage("Linked to current channel.");
      // setautogenerate
      autogenerate = true;
      autogeneratedelay = 1800000;
      clearTimeout();
      nextInterval();
      // startnet
      if (willstartnet) startNet();
      break;
    case "restart":
      if (message.author != owner) return;
      process.exit();
      break;
    default:
      sendDiscordMessage("Invalid command. Type \"" + PREFIX + "help\" for help.", true);
  }
}

// commandline input

process.stdin.resume();
process.stdin.setEncoding('utf8');
var util = require('util');
process.stdin.on('data', function(text) {
  if (channel == null) return;
  handleCommand({
    content: PREFIX + text.trim(),
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
    discordConnected = true;
    sendDiscordMessage('Training completed. Ran ' + epochs + ' epochs.', true);
    pending = false;
  });
}

// repeating send (every 30 minutes)

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