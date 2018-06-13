const yaml = require("js-yaml");
const fs = require('fs');

var config = null;

function readConfig() {
  try {
    config = yaml.safeLoad(fs.readFileSync("common/config.yml"));
  } catch (e) {
    console.log(e);
  }
}
// TODO: actually save
function saveConfig(newconf) {
  config = newconf;
}

function createDefaultConfig() {
  var
  default = {
    TOKEN: "token here",
    VERSION: "1.4",
    PREFIX: "det:",
    VERBOSE: false,
    AUTOSTART: true,
    AUTOGEN: true,
    AUTOGENDELAY: 18000000,
    ACTIVITY: "hentai",
    ACTTYPE: "WATCHING",
    MAXGEN: 200
  };
  saveConfig(
    default);
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