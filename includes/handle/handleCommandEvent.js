module.exports = function ({ api, models, Users, Threads, Currencies }) {
    const logger = require("../../utils/log.js");
    return async function (event) {
        let { senderID, threadID } = event;
        const { userBanned, threadBanned } = global.data;
        const { allowInbox } = global.config;
        if (userBanned.has(senderID) || threadBanned.has(threadID) || (allowInbox && senderID === threadID)) return;
        for (const module of global.client.commands.values()) {
            try {
                if (module && module.handleEvent) {
                    await module.handleEvent({ api, event, models, Users, Threads, Currencies });
                }
            } catch (error) {
                logger(`Lỗi trong module ${module.config.name}: ${error.message}`, 'error');
            }
        }
    };
};
