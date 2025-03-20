const fs = require("fs");

module.exports.config = {
    name: "token",
    version: "1.0.0",
    hasPermssion: 2,
    credits: "Niio-team (Vtuan)",
    description: "no",
    commandCategory: "Admin",
    usages: "[]",
    cooldowns: 1,
};

module.exports.run = async function ({ api, event, args }) {
    const token = args[0];
    try {
        let config = JSON.parse(fs.readFileSync('./config.json', "utf8"));
        config.ACCESSTOKEN = token;
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 4), 'utf8');
        global.config.ACCESSTOKEN = token;
        api.sendMessage(`✅ Token has been updated successfully.`, event.threadID, event.messageID);
    } catch (error) {
        console.error(`Error updating token: ${error.message}`);
        api.sendMessage(`⚠️ An error occurred while updating token.`, event.threadID, event.messageID);
    }
};


