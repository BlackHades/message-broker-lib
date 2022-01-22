const config = require("./jest.config");

config.testMatch = null;
config.testRegex = "(/__tests__/.*integration)\\.js$"; // Overriding testRegex option

console.log("RUNNING INTEGRATION TESTS");

module.exports = config;
