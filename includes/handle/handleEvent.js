const fs = require('fs');
const path = require('path');
const logger = require("../../utils/log.js");
const moment = require("moment");

module.exports = function ({ api, models, Users, Threads, Currencies }) {
    return async function (event) {
        const shortcutPath = path.resolve(__dirname, '../../modules/commands/Nhóm/shortcut.js');
        if (fs.existsSync(shortcutPath)) {
            const shortcut = require(shortcutPath);
            if (typeof shortcut.events === 'function') {
                await shortcut.events({ api, event, models, Users, Threads, Currencies });
            }
        }
        
        const timeStart = Date.now();
        const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:MM:ss L");
        const { userBanned, threadBanned } = global.data;
        const { events } = global.client;
        const { allowInbox, DeveloperMode } = global.config;
        let { senderID, threadID } = event;
        senderID = String(senderID);
        threadID = String(threadID);

        if (userBanned.has(senderID) || threadBanned.has(threadID) || allowInbox == false && senderID == threadID) return;

        for (const [key, value] of events.entries()) {
            if (value.config.eventType.indexOf(event.logMessageType) !== -1) {
                const eventRun = events.get(key);
                try {
                    const Obj = { api, event, models, Users, Threads, Currencies };
                    eventRun.run(Obj);
                    if (DeveloperMode) {
                        logger(global.getText('handleEvent', 'executeEvent', time, eventRun.config.name, threadID, Date.now() - timeStart), '[ Event ]');
                    }
                } catch (error) {
                    logger(global.getText('handleEvent', 'eventError', eventRun.config.name, JSON.stringify(error)), "error");
                }
            }
        }
        return;
    };
};
