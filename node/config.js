const yaml = require("js-yaml");
const fs = require('fs');

var config = null;

const DEFAULT = {
  TOKEN: "token here",
  PREFIX: "wolf:",
  VERBOSE: false,
  AUTOSTART: true,
  AUTOGEN: true,
  AUTOGENDELAY: 18000000,
  ACTIVITY: "hentai",
  ACTTYPE: "WATCHING",
  MAXGEN: 200,
  USERS: []
}

function readConfig() {
  try {
    config = yaml.safeLoad(fs.readFileSync("common/config.yml"));
  } catch (e) {
    console.log(e);
  }
}

function saveConfig(newconf) {
  config = newconf;
  var serialized = yaml.safeDump(config);
  fs.writeFileSync("common/config.yml", serialized);
}

function createDefaultConfig() {
  saveConfig(DEFAULT);
}

exports.getConfig = function() {
  if (config == null) readConfig();
  if (config == null) createDefaultConfig();
  return config;
}
exports.initializeConfig = function() {
  readConfig();
}
exports.saveConfig = function(newconf) {
  saveConfig(newconf);
}
