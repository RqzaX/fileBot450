const stringSimilarity = require('string-similarity');
const logger = require("../../utils/log.js");
const fs = require('fs-extra');
global.prefixTO = {};
module.exports = function ({ api, models, Users, Threads, Currencies }) {
    return async function (event) {
        const { ADMINBOT, MAINTENANCE, FACEBOOK_ADMIN, NDH } = global.config;
        const { commandBanned } = global.data;
        const { commands, cooldowns, NPF_commands } = global.client;
        var { body, senderID, threadID, messageID } = event;
        senderID = String(senderID);
        threadID = String(threadID);
        const firstChar =body.trim().split(/\s+/)[0] // Lấy phần tử đầu tiên của body
        const notCMD = NPF_commands.has(firstChar) ? firstChar : null;

        if (!notCMD || senderID === api.getCurrentUserID()) return;

        let form_mm_dd_yyyy = (input = '', split = input.split('/')) => `${split[1]}/${split[0]}/${split[2]}`;

        if (event.senderID != api.getCurrentUserID() && !ADMINBOT.includes(senderID)) {
            let thuebot;
            try {
                thuebot = JSON.parse(require('fs-extra').readFileSync(process.cwd() + '/modules/data/thuebot.json'));
            } catch {
                thuebot = [];
            }

            let find_thuebot = thuebot.find($ => $.t_id == threadID);

            // Kiểm tra nếu nhóm chưa thuê bot
            if (!find_thuebot) {
                return api.sendMessage(`❎ Nhóm của bạn chưa thuê bot, vui lòng reply tin nhắn này và nhập key thuê bot hoặc liên hệ Admin để lấy key thuê bot\nfb: ${(!global.config.FACEBOOK_ADMIN) ? "Exclude Admin if not configured!" : global.config.FACEBOOK_ADMIN}`, event.threadID, (e, i) => {
                    global.client.handleReply.push({
                        name: 'rent',
                        messageID: i.messageID,
                        threadID: event.threadID,
                        type: 'RentKey'
                    });
                });
            }

            // Kiểm tra thời gian thuê bot đã hết hạn chưa
            if (new Date(form_mm_dd_yyyy(find_thuebot.time_end)).getTime() <= Date.now() + 25200000) {
                return api.sendMessage(`⚠️ Thời hạn sử dụng bot của nhóm bạn đã hết. Vui lòng reply tin nhắn này và nhập mã key mới, hoặc liên hệ Admin để được hỗ trợ.\nfb: ${(!global.config.FACEBOOK_ADMIN) ? "Exclude Admin if not configured!" : global.config.FACEBOOK_ADMIN}`, event.threadID, (e, i) => {
                    global.client.handleReply.push({
                        name: 'rent',
                        messageID: i.messageID,
                        threadID: event.threadID,
                        type: 'RentKey'
                    });
                });
            }
        }


        const dateNow = Date.now()
        if (!ADMINBOT.includes(senderID) && MAINTENANCE) {
            return api.sendMessage('⚠️ Bot đang được bảo trì, vui lòng sử dụng sau', threadID, messageID);
        }

        const DT = "./modules/data/data.json";
        const threadInf = await Threads.getData(event.threadID);
        const findd = threadInf?.threadInfo?.adminIDs?.find(el => el.id == senderID);
        const readData = async (path) => JSON.parse(await fs.readFile(path, 'utf-8'));
        const Dataqtv = await readData(DT);

        if (Dataqtv) {
            const threadEntry = Dataqtv?.find(entry => entry.threadID === threadID);
            if (threadEntry && !findd && !ADMINBOT.includes(senderID)) {
                return api.sendMessage('Chỉ quản trị viên nhóm mới có thể sử dụng bot ⚠️', event.threadID, event.messageID);
            }
        }

        const userBanned = (await Users.getData(event.senderID)).data;
        const threadBanned = (await Threads.getData(event.threadID)).data;
        const bannedData = userBanned?.banned ? userBanned : threadBanned?.banned ? threadBanned : null;
        if (bannedData && !global.config.ADMINBOT.includes(event.senderID) && !global.config.NDH.includes(event.senderID)) {
            const reason = bannedData.reason || "admin thích=))";
            const message = userBanned?.banned
                ? `⛔ Hiện tại bạn đang bị ban\nLý do: ${reason}\nAdmin: ${FACEBOOK_ADMIN}`
                : `⛔ Hiện tại nhóm của bạn đang bị ban\nLý do: ${reason}\nAdmin: ${FACEBOOK_ADMIN}`;

            return api.sendMessage(message, threadID, async (err, info) => {
                await new Promise(resolve => setTimeout(resolve, 5 * 1000));
                return api.unsendMessage(info.messageID);
            }, messageID);
        }

        const args = body.trim().split(/\s+/);
        let commandName = args?.shift().toLowerCase();
        var command = NPF_commands.get(commandName);
        // if (!command) return;
        let path = __dirname + '/../../modules/data/commands-banned.json';
        let data = {};
        if (fs.existsSync(path)) data = JSON.parse(fs.readFileSync(path));

        let is_qtv_box = async (id) => {
            let threadData = await Threads.getData(event.threadID);
            return threadData?.threadInfo?.adminIDs?.some($ => $.id == id);
        };

        let name = id => global.data.userName.get(id);
        let cmd = command?.config.name;

        if (data[threadID]) {
            if (ban = data[threadID].cmds.find($ => $.cmd == cmd)) {
                if (ADMINBOT.includes(ban.author) && ban.author != senderID) {
                    return api.sendMessage(`❎ ${ban.time} admin bot: ${name(ban.author)}\nĐã cấm nhóm sử dụng lệnh ${cmd}`, threadID, messageID);
                }
                if (await is_qtv_box(ban.author) && ban.author != senderID) {
                    return api.sendMessage(`❎ ${ban.time} qtv nhóm: ${name(ban.author)}\nĐã cấm thành viên sử dụng lệnh ${cmd}`, threadID, messageID);
                }
            }
            if (all = (data[threadID].users[senderID] || {}).all) {
                if (all.status == true && ADMINBOT.includes(all.author) && !ADMINBOT.includes(senderID)) {
                    return api.sendMessage(`❎ ${all.time} bạn đã bị admin bot: ${name(all.author)} cấm`, threadID, messageID);
                }
                if (all.status == true && await is_qtv_box(all.author) && !await is_qtv_box(senderID) && !ADMINBOT.includes(senderID)) {
                    return api.sendMessage(`❎ ${all.time} bạn đã bị qtv box: ${name(all.author)} cấm`, threadID, messageID);
                }
            }
            if (user_ban = (data[threadID].users[senderID] || {
                cmds: []
            }).cmds.find($ => $.cmd == cmd)) {
                if (ADMINBOT.includes(user_ban.author) && !ADMINBOT.includes(senderID)) {
                    return api.sendMessage(`❎ ${user_ban.time} admin bot: ${name(user_ban.author)}\nĐã cấm bạn sử dụng lệnh ${cmd}`, threadID, messageID);
                }
                if (await is_qtv_box(user_ban.author) && !await is_qtv_box(senderID) && !ADMINBOT.includes(senderID)) {
                    return api.sendMessage(`❎ ${user_ban.time} qtv nhóm: ${name(user_ban.author)}\nĐã cấm bạn sử dụng lệnh ${cmd}`, threadID, messageID);
                }
            }
        }

        if ((_kJe82Q = process.cwd() + '/modules/data/disable-command.json', fs.existsSync(_kJe82Q))) if (!ADMINBOT.includes(senderID) && JSON.parse(fs.readFileSync(_kJe82Q))[threadID]?.[command.config.commandCategory] == true) return api.sendMessage(`❎ Box không được phép sử dụng các lệnh thuộc nhóm '${command.config.commandCategory}'`, threadID);
        if (commandBanned.get(threadID) || commandBanned.get(senderID)) {
            if (!ADMINBOT.includes(senderID)) {
                const banThreads = commandBanned.get(threadID) || [],
                    banUsers = commandBanned.get(senderID) || [];
                if (banThreads.includes(command.config.name))
                    return api.sendMessage(global.getText("handleCommand", "commandThreadBanned", command.config.name), threadID, async (err, info) => {
                        await new Promise(resolve => setTimeout(resolve, 5 * 1000))
                        return api.unsendMessage(info.messageID);
                    }, messageID);
                if (banUsers.includes(command.config.name))
                    return api.sendMessage(global.getText("handleCommand", "commandUserBanned", command.config.name), threadID, async (err, info) => {
                        await new Promise(resolve => setTimeout(resolve, 5 * 1000));
                        return api.unsendMessage(info.messageID);
                    }, messageID);
            }
        }
        var threadInfo2;
        if (event.isGroup == !![])
            try {
                threadInfo2 = (await Threads.getData(event.threadID)).threadInfo
                if (Object.keys(threadInfo2).length == 0) throw new Error();
            } catch (err) {

                logger(`Không thể lấy thông tin của nhóm, lỗi: ${err}`, "error");
            }
        const find = threadInfo2?.adminIDs?.find(el => el.id == senderID);
        let permssion = 0;
        if (ADMINBOT.includes(senderID.toString())) permssion = 3;
        else if (NDH.includes(senderID.toString())) permssion = 2;
        else if (!ADMINBOT.includes(senderID) && find) permssion = 1;
        var quyenhan = ""
        if (command?.config.hasPermssion == 1) {
            quyenhan = "Quản Trị Viên"
        } else if (command?.config.hasPermssion == 2) {
            quyenhan = "SUPPORTBOT"
        } else if (command?.config.hasPermssion == 3) {
            quyenhan = "ADMINBOT"
        }
        if (command?.config.hasPermssion > permssion) {
            // return api.sendMessage(`Quyền hạn của lệnh: ${command.config.name} là ${quyenhan}`, event.threadID, event.messageID);
            return api.sendMessage(global.getText("handleCommand", "permssionNotEnough", command.config.name, quyenhan), event.threadID, event.messageID);

        }
        let slow = {};

        if (!cooldowns.has(command.config.name)) cooldowns.set(command.config.name, new Map());
        const timestamps = cooldowns.get(command.config.name);
        const expirationTime = (command.config.cooldowns || 1) * 1000;

        if (timestamps.has(senderID)) {
            const expiration = timestamps.get(senderID) + expirationTime;
            if (dateNow < expiration) {
                const timeLeft = ((expiration - dateNow) / 1000).toFixed(1);
                return api.sendMessage(`🔄 Vui lòng quay lại sau ${timeLeft} giây`, threadID, messageID);
            }
        }
        slow[senderID] = dateNow;
        timestamps.set(senderID, dateNow);


        var getText2;
        if (command.languages && typeof command.languages == 'object' && command.languages.hasOwnProperty(global.config.language)) {
            getText2 = (...values) => {
                var lang = command.languages[global.config.language][values[0]] || '';
                for (var i = 1; i < values.length; i++) {
                    const expReg = RegExp('%' + i, 'g');
                    lang = lang.replace(expReg, values[i]);
                }
                return lang;
            };
        }
        else getText2 = () => { };
        try {
            const Obj = {};
            Obj.api = api;
            Obj.event = event;
            Obj.args = args;
            Obj.models = models;
            Obj.Users = Users;
            Obj.Threads = Threads;
            Obj.Currencies = Currencies;
            Obj.permssion = permssion;
            Obj.getText = getText2;
            await command.run(Obj);
            return;
        } catch (e) {
            return api.sendMessage(`${e}`, threadID, (err) => {
                if (err) console.error(err);
            }, messageID);
        }
    }
}