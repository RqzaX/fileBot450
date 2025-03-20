module.exports = function ({ Users, Threads, Currencies }) {
    return async function (event) {
        // const chalk = require('chalk');
        // const brightGreen = chalk.bold.hex('#00ff7f');

        // const logger = (prefix, message) => {
        //     const msg = `${prefix}: ${message}`;
        //     console.log(brightGreen(msg));
        // };

        const { allUserID, allCurrenciesID, allThreadID, userName, threadInfo } = global.data;
        const { autoCreateDB } = global.config;
        if (autoCreateDB == ![]) return;
        let { senderID, threadID } = event;
        senderID = String(senderID);
        threadID = String(threadID);

        try {
            if (!allThreadID.includes(threadID) && event.isGroup == !![]) {
                const threadIn4 = await Threads.getInfo(threadID);
                const dataThread = {
                    threadID: threadIn4.threadID,
                    threadName: threadIn4.threadName,
                    participantIDs: threadIn4.participantIDs,
                    userInfo: threadIn4.userInfo,
                    timestamp: Date.now().toString(),
                    isGroup: threadIn4.isGroup,
                    isSubscribed: true,
                    isArchived: false,
                    emoji: threadIn4.emoji,
                    color: threadIn4.color,
                    threadTheme: threadIn4.threadTheme,
                    nicknames: threadIn4.nicknames,
                    adminIDs: threadIn4.adminIDs,
                    approvalMode: threadIn4.approvalMode,
                    approvalQueue: [],
                    imageSrc: threadIn4.imageSrc || "",
                    inviteLink: threadIn4.inviteLink
                };

                allThreadID.push(threadID);
                threadInfo.set(threadID, dataThread);
                await Threads.setData(threadID, { threadInfo: dataThread, data: {} });

                for (const singleData of threadIn4.userInfo) {
                    if (singleData.gender !== undefined) {
                        userName.set(String(singleData.id), singleData.name);
                        try {
                            if (!global.data.allUserID.includes(String(singleData.id))) {
                                await Users.createData(singleData.id, {
                                    'name': singleData.name,
                                    'gender': singleData.gender,
                                    'data': {}
                                });
                                global.data.allUserID.push(String(singleData.id));
                                // logger('USER', `New user added: ${singleData.name} (ID: ${singleData.id})`);
                            } else {
                                await Users.setData(String(singleData.id), {
                                    'name': singleData.name
                                });
                            }
                        } catch (e) {
                            console.log(e);
                        }
                    }
                }
                // logger('THREAD', `New thread added: ${threadIn4.threadName} (ID: ${threadID})`);
            }

            if (!allUserID.includes(senderID) || !userName.has(senderID)) {
                const infoUsers = await Users.getInfo(senderID);
                const setting3 = {
                    name: infoUsers?.name,
                    gender: infoUsers?.gender
                };
                await Users.createData(senderID, setting3);
                allUserID.push(senderID);
                userName.set(senderID, infoUsers?.name);
                // logger('USER', `New user added: ${infoUsers?.name} (ID: ${senderID})`);
            }
            if (!allCurrenciesID.includes(senderID)) {
                const setting4 = {
                    data: {}
                };
                await Currencies.createData(senderID, setting4);
                allCurrenciesID.push(senderID);
            }

            return;
        } catch (err) {
            return console.log(err);
        }
    };
};
