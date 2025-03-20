var bluebird = require("bluebird");
var request = bluebird.promisify(require("request").defaults({ jar: true }));

module.exports = {
    getJar: request.jar,
}