module.exports.config = {
    name: "rule",
    version: "1.0.1",
    hasPermssion: 0,
    credits: "CatalizCS",
    description: "Tùy biến luật cho từng group",
    commandCategory: "Nhóm",
    usages: "[add/remove/all] [content/ID]",
    cooldowns: 5,
    dependencies: {
        "fs-extra": "",
        "path": ""
    }
};

module.exports.onLoad = () => {
    const { existsSync, writeFileSync } = require('fs-extra');
    const { join } = require('path');
    const pathData = join(__dirname, "data", "rule.json");
    if (!existsSync(pathData)) return writeFileSync(pathData, "[]", "utf-8"); 
}

module.exports.run = async ({ event, api, args, permssion }) => {
    const { threadID, messageID } = event;
    const { readFileSync, writeFileSync } = require('fs-extra');
    const { join } = require('path');

    const pathData = join(__dirname, "data", "rule.json");
    const content = args.slice(1).join(" ");
    const dataJson = JSON.parse(readFileSync(pathData, "utf-8"));
    let thisThread = dataJson.find(item => item.threadID == threadID) || { threadID, listRule: [] };

    switch (args[0]) {
        case "add": {
            if (permssion == 0) {
                return api.sendMessage("❎ Bạn không đủ quyền hạn để sử dụng thêm luật!", threadID, messageID);
            }
            if (!content) {
                return api.sendMessage("⚠️ Phần thông tin không được để trống", threadID, messageID);
            }
            if (content.includes("\n")) {
                const contentSplit = content.split("\n");
                thisThread.listRule.push(...contentSplit);
            } else {
                thisThread.listRule.push(content);
            }
            if (!dataJson.some(item => item.threadID == threadID)) {
                dataJson.push(thisThread);
            } else {
                dataJson = dataJson.map(item => item.threadID == threadID ? thisThread : item);
            }
            writeFileSync(pathData, JSON.stringify(dataJson, null, 4), "utf-8");
            return api.sendMessage('✅ Đã thêm luật mới cho nhóm thành công!', threadID, messageID);
        }

        case "list":
        case "all": {
            let msg = "";
            thisThread.listRule.forEach((item, index) => {
                msg += `${index + 1}. ${item}\n`;
            });
            if (!msg) {
                return api.sendMessage("⚠️ Nhóm của bạn hiện tại chưa có danh sách luật để hiển thị!", threadID, messageID);
            }
            return api.sendMessage(`[ LUẬT CỦA NHÓM ]\n\n${msg}`, threadID, messageID);
        }

        case "rm":
        case "remove":
        case "del": {
            if (!isNaN(content) && parseInt(content) > 0) {
                if (permssion == 0) {
                    return api.sendMessage("❎ Bạn không đủ quyền hạn để có thể sử dụng xóa luật!", threadID, messageID);
                }
                if (thisThread.listRule.length === 0) {
                    return api.sendMessage("⚠️ Nhóm của bạn chưa có danh sách luật để có thể xóa!", threadID, messageID);
                }
                thisThread.listRule.splice(parseInt(content) - 1, 1);
                dataJson = dataJson.map(item => item.threadID == threadID ? thisThread : item);
                writeFileSync(pathData, JSON.stringify(dataJson, null, 4), "utf-8");
                return api.sendMessage(`✅ Đã xóa thành công luật có số thứ tự thứ ${content}`, threadID, messageID);
            } else if (content === "all") {
                if (permssion == 0) {
                    return api.sendMessage("❎ Bạn không đủ quyền hạn để có thể sử dụng xóa luật!", threadID, messageID);
                }
                if (thisThread.listRule.length === 0) {
                    return api.sendMessage("⚠️ Nhóm của bạn chưa có danh sách luật để có thể xóa!", threadID, messageID);
                }
                thisThread.listRule = [];
                dataJson = dataJson.map(item => item.threadID == threadID ? thisThread : item);
                writeFileSync(pathData, JSON.stringify(dataJson, null, 4), "utf-8");
                return api.sendMessage(`✅ Đã xóa thành công toàn bộ luật của nhóm!`, threadID, messageID);
            }
            return api.sendMessage("⚠️ Lệnh xóa không hợp lệ! Sử dụng số luật hợp lệ hoặc 'all'.", threadID, messageID);
        }

        default: {
            let msg = "";
            thisThread.listRule.forEach((item, index) => {
                msg += `${index + 1}. ${item}\n`;
            });
            if (msg) {
                return api.sendMessage(`[ LUẬT CỦA NHÓM ]\n\n${msg}`, threadID, messageID);
            } else {
                return api.sendMessage("⚠️ Nhóm của bạn chưa có luật nào để hiển thị!", threadID, messageID);
            }
        }
    }
}
