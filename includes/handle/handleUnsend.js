const fs = require('fs-extra');

module.exports = function ({ api, event }) {
    return function (event ) {

        const { senderID, reaction, messageID, threadID } = event;
        const Unsend = "./modules/data/unsend.json";
        const groupData = fs.existsSync(Unsend) ? JSON.parse(fs.readFileSync(Unsend, 'utf-8')).find(entry => entry.threadID === threadID) : null;

        if (senderID == api.getCurrentUserID()) {
            const icon = groupData ? groupData.Icon : "👍";
            if (reaction == icon) return api.unsendMessage(messageID);
        }
    };
}
