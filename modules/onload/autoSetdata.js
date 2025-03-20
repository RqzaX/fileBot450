module.exports = async function ({ api, models }) {
    const logger = require("./../../utils/log");
    const thread = require('./../../includes/controllers/threads');
    const Threads = await thread({ api, models });

    const updateData = async () => {
        var inbox = await api.getThreadList(100, null, ['INBOX']);
        let list = [...inbox].filter(group => group.isSubscribed && group.isGroup);
        for (var groupInfo of list) {
            var threadInfo = await api.getThreadInfo(groupInfo.threadID);
            await Threads.setData(groupInfo.threadID, { threadInfo });
        }
        logger(`Tự động cập nhật data của ${list.length} box`, `[ UPDATE ]`);
    };
    setTimeout(updateData, 1000 * 2);
};
