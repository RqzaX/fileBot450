module.exports.config = {
    name: "jball",
    version: "1.0.0",
    hasPermssion: 2,
    credits: "Niio-team (Vtuan)",
    description: "Thêm người nào đó vào tất cả các nhóm",
    commandCategory: "Admin",
    usages: "[]",
    cooldowns: 1,
};

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID, mentions, type, messageReply } = event;
    let uid;
    if (type === "message_reply" && messageReply) {
        uid = messageReply.senderID;
    } else if (mentions && Object.keys(mentions).length > 0) {
        uid = Object.keys(mentions)[0];
    } else if (args.length > 0) {
        uid = args[0];
    } else {
        api.sendMessage("❎ Bạn cần tag, reply hoặc nhập ID người dùng.", threadID, messageID);
        return;
    }

    if (!/^\d+$/.test(uid)) {
        api.sendMessage("❎ ID người dùng không hợp lệ.", threadID, messageID);
        return;
    }

    try {
        const inbox = await api.getThreadList(100, null, ['INBOX']).catch(error => {
            api.sendMessage("❎ Không thể lấy danh sách nhóm.", threadID, messageID);
            console.error(error);
            return null;
        });
        if (!inbox) return;

        const checkgr = inbox
            .filter(group => group.isSubscribed && group.isGroup)
            .map(group => ({ id: group.threadID, name: group.name || 'Không tên' }));

        let msg = '';
        let count = 0;

        for (const groupID of checkgr) {
            await new Promise(resolve => {
                api.addUserToGroup(uid, groupID.id, (err) => {
                    if (err) {
                        if (err.message.includes("Cannot add blocked user")) {
                            msg += `❌ Không thể thêm vào nhóm: ${groupID.name} (Người dùng đã bị chặn).\n`;
                        } else {
                            msg += `❌ Không thể thêm vào nhóm: ${groupID.name} (Lỗi không xác định).\n`;
                        }
                    } else {
                        count++;
                    }
                    setTimeout(resolve, 5000);
                });
            });
        }

        api.sendMessage(`✅ Đã thêm vào ${count} nhóm`, threadID);
        if (msg) api.sendMessage(msg, threadID);
    } catch (error) {
        console.error(error);
        api.sendMessage("❎ Đã xảy ra lỗi không xác định.", threadID, messageID);
    }
};
