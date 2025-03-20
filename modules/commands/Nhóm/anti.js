const e = require('cors');
const fs = require('fs-extra');
const path = require('path');
module.exports.config = {
    name: "anti",
    version: "5.0.0",
    hasPermssion: 1,
    Rent: 2,
    credits: "Niio-team (Vtuan)",
    description: "Quản Lí Box",
    commandCategory: "Nhóm",
    usages: "No",
    cooldowns: 0
};

const a_ = "./modules/data/anti";
const bd = "./modules/data/anti/antiBietDanh";
const fileAnti = path.join(a_, "antiFile.json");
if (!fs.existsSync(a_)) fs.mkdirSync(a_, { recursive: true });
if (!fs.existsSync(bd)) fs.mkdirSync(bd, { recursive: true });
if (!fs.existsSync(fileAnti)) fs.writeFileSync(fileAnti, JSON.stringify({}));
let D_;


//////////////// HÀM CHẠY ////////////////////////////////////////////////////////

module.exports.run = async ({ api, event, args, Threads }) => {
    D_ = JSON.parse(fs.readFileSync(fileAnti, 'utf-8'));
    const { threadID, senderID, messageID } = event;
    if (!D_[threadID]) D_[threadID] = {};
    let x_ = args[0];
    const settings = ['namebox', 'avtbox', 'bietdanh', 'out', 'join', 'qtv', 'emoji', 'spam', 'theme', 'resend', 'bban', 'spamb'];
    if (settings.includes(x_)) {
        start(x_, threadID, messageID, api, Threads)
    } else {
        const prefix = global.data?.threadData?.get(threadID)?.PREFIX || global.config.PREFIX;
        const settings = {
            namebox: 'Chống đổi tên nhóm',
            avtbox: 'Chống đổi ảnh nhóm',
            bietdanh: 'Chống đổi biệt danh',
            out: 'Chống thành viên thoát chùa',
            join: 'Cấm thành viên mới vào nhóm',
            qtv: 'Chống cướp key qtv',
            emoji: 'Chống đổi emoji nhóm',
            spam: 'Chống tin nhắn spam',
            theme: 'Chống đổi chủ đề nhóm',
            resend: 'Chống gỡ tin nhắn',
            bban: 'Cấm thành viên sử dụng bot',
            spamb: 'chống thành viên spam bot'
        };
        const NNFile = path.resolve(bd, `${threadID}.json`);
        const nicknamesData = await fs.pathExists(NNFile) ? await fs.readJson(NNFile) : {};

        let msg = `🛡️ [ CONFIG ANTI ] 🛡️\n\n`;
        Object.entries(settings).forEach(([setting, description], index) => {
            const status = (setting === 'bietdanh' ? nicknamesData[setting] : D_[threadID][setting]) ? "bật" : "tắt";
            msg += `${index + 1}. ${prefix}anti ${setting}: ${description} (${status})\n`;
        });
        msg += `\n💬 Reply tin nhắn này kèm số thứ tự hoặc dùng lệnh anti + tên anti để bật hoặc tắt chế độ.`;

        return api.sendMessage(msg, threadID, (err, info) => {
            if (err) return console.error(err);
            global.client.handleReply.push({
                name: module.exports.config.name,
                author: senderID,
                messageID: info.messageID,
                threadID: event.threadID
            });
        });
    }
}
module.exports.handleReply = async ({ api, event, handleReply, Threads }) => {
    const { threadID, author } = handleReply;
    const { body } = event;
    const { messageID } = event;
    if (author !== event.senderID) return;
    const st_ = ['namebox', 'avtbox', 'bietdanh', 'out', 'join', 'qtv', 'emoji', 'spam', 'theme', 'resend', 'bban', 'spamb'];
    const s_ = parseInt(body.split(' ')[0]);
    if (!Number.isInteger(s_) || s_ < 1 || s_ > st_.length) return;
    const x_ = st_[s_ - 1];
    start(x_, threadID, messageID, api, Threads)
}

let usersSpam = {};
module.exports.handleEvent = async function ({ api, event, Threads, Users }) {
    const { threadID, senderID } = event;
    D_ = JSON.parse(fs.readFileSync(fileAnti, 'utf-8'));
    if (D_[threadID] && D_[threadID].spam && D_[threadID].resend) {
        antiSpam(api, event, Threads, Users);
        reSend({ event, api, client: Threads, Users });
    } else if (D_[threadID] && D_[threadID].spam) {
        antiSpam(api, event, Threads, Users);
    } else if (D_[threadID] && D_[threadID].resend) {
        reSend({ event, api, client: Threads, Users });
    }
    else if (D_[threadID] && D_[threadID].spamb) {
        antiSpamBot(event, Threads, api) // hủy cm của dòng này
    }
};

////////////////    FUNCITSON  ////////////////////////////////////////////////////////

async function start(x_, threadID, messageID, api, Threads) {
    if (['join', 'qtv', 'out', 'spam', 'resend', 'bban', 'spamb'].includes(x_)) {
        if (['join', 'qtv', 'spam'].includes(x_)) {
            const result = await checkAdmin(Threads, api, threadID);
            if (result !== true) return api.sendMessage(result, threadID, messageID);
        }
        const mode = anti1(x_, threadID);
        api.sendMessage(mode, threadID);
    } else if (['namebox', 'avtbox', 'emoji', 'theme'].includes(x_)) {
        const mode = anti2(x_, Threads, threadID);
        api.sendMessage(await mode, threadID);
    } else if (x_ == "bietdanh") {
        const mode = anti3(x_, threadID, Threads)
        api.sendMessage(await mode, threadID);
    }
}

function anti1(x_, threadID) {
    if (D_[threadID] && D_[threadID][x_]) {
        delete D_[threadID][x_];
        saveToFile()
        return `✅ Đã tắt thành công chế độ anti '${x_}'.`;
    } else {
        D_[threadID][x_] = true;
        saveToFile()
        return `✅ Đã bật thành công chế độ anti '${x_}'.`;
    }
}

async function anti2(x_, Threads, threadID) {
    const t_ = (await Threads.getData(threadID)).threadInfo
    if (!D_[threadID]) {
        D_[threadID] = {};
    }
    if (!D_[threadID][x_]) {
        let model;
        if (x_ === "namebox") {
            model = (t_ && t_.threadName && t_.threadName.length > 0) ? t_.threadName : null;
        } else if (x_ === "avtbox") {
            model = (t_ && t_.imageSrc) ? t_.imageSrc : null;
        } else if (x_ === "emoji") {
            model = (t_ && t_.emoji) ? t_.emoji : null;
        } else if (x_ === "theme") {
            model = (t_ && t_.threadTheme && t_.threadTheme.id) ? t_.threadTheme.id : 3259963564026002;
        } else {
            model = null;
        }

        if (model == null) {
            return checkNull(x_)
        } else {
            D_[threadID][x_] = model;
            saveToFile();
            return `✅ Đã bật thành công chế độ anti '${x_}'.`;
        }
    } else {
        delete D_[threadID][x_];
        saveToFile();
        return `✅ Đã tắt thành công chế độ anti '${x_}'.`;
    }
}

async function anti3(x_, threadID, Threads) {
    const NNFile = path.resolve(bd, `${threadID}.json`);
    const read = fs.existsSync(NNFile) ? JSON.parse(fs.readFileSync(NNFile, 'utf-8') || '{}') : {};
    if (read.bietdanh) {
        fs.unlinkSync(NNFile);
        return `✅ Chế độ anti '${x_}' đã tắt.`;
    }
    read.bietdanh = (await Threads.getData(threadID)).threadInfo.nicknames;
    await fs.writeJson(NNFile, read, { spaces: 2 });
    return `✅ Chế độ anti '${x_}' đã bật.`;
}
function checkNull(x_) {
    const E_ = {
        "namebox": "🚫 Lỗi: Nhóm của bạn không có tên nhóm.",
        "avtbox": "🚫 Lỗi: Nhóm của bạn không có ảnh nhóm.",
        "emoji": "🚫 Lỗi: Nhóm của bạn không có emoji.",
        "theme": "🚫 Lỗi: Không lấy được theme."
    };
    return E_[x_] || `❓ Lỗi: Không xác định'.`;
}

function saveToFile() { fs.writeFileSync(fileAnti, JSON.stringify(D_, null, 4)) }

async function checkAdmin(Threads, api, threadID) {
    const { adminIDs } = (await Threads.getData(threadID)).threadInfo;
    return adminIDs.some(item => item.id === api.getCurrentUserID()) ? true : '⚠️ Bot cần quyền quản trị viên nhóm';
}


async function antiSpam(api, event, Threads, Users) {
    const { threadID, senderID } = event;
    const adminIDs = (await Threads.getData(threadID)).threadInfo.adminIDs.map(admin => admin.id);
    const adminBot = global.config.ADMINBOT || [];
    if (adminBot.includes(senderID) || adminIDs.includes(senderID)) return;
    if (!usersSpam[senderID]) {
        usersSpam[senderID] = {
            count1: 0,
            count2: 0,
            start1: Date.now(),
            start2: Date.now(),
            lastMessage: event.body
        };
    }
    const currentTime = Date.now();
    if (currentTime - usersSpam[senderID].start1 > 8000) {
        usersSpam[senderID].count1 = 0;
        usersSpam[senderID].start1 = currentTime;
    }
    if (currentTime - usersSpam[senderID].start2 > 2500) {
        usersSpam[senderID].count2 = 0;
        usersSpam[senderID].start2 = currentTime;
    }
    if (event.body === usersSpam[senderID].lastMessage) {
        usersSpam[senderID].count1++;
        if (usersSpam[senderID].count1 > 6 && currentTime - usersSpam[senderID].start1 < 7500) {
            const userInfo = await Users.getData(senderID);
            const userName = userInfo.name;
            api.removeUserFromGroup(senderID, threadID);
            api.sendMessage({ body: `Đã tự động kick ${userName} do spam` }, threadID);
            usersSpam[senderID] = {
                count1: 0,
                count2: 0,
                start1: currentTime,
                start2: currentTime,
                lastMessage: ""
            };
        }
    } else {
        usersSpam[senderID].count2++;
        usersSpam[senderID].start2 = currentTime;
        usersSpam[senderID].lastMessage = event.body;
        if (usersSpam[senderID].count2 > 9 && currentTime - usersSpam[senderID].start2 <= 2500) {
            const userInfo = await Users.getData(senderID);
            const userName = userInfo.name;
            api.removeUserFromGroup(senderID, threadID);
            api.sendMessage({ body: `Đã tự động kick ${userName} do spam` }, threadID);
            usersSpam[senderID] = {
                count1: 0,
                count2: 0,
                start1: currentTime,
                start2: currentTime,
                lastMessage: ""
            };
        }
    }
}

async function reSend({ event: e, api: a, client: t, Users: s }) {
    if (e.senderID == (global.botID || a.getCurrentUserID())) return;
    const n = require('request'), o = require('axios'), { writeFileSync: d, createReadStream: r } = require("fs-extra")
    let { messageID: g, senderID: l, threadID: u, body: c } = e;
    global.logMessage || (global.logMessage = new Map), global.data.botID || (global.data.botID = a.getCurrentUserID());
    const i = global.data.threadData.get(u) || {};
    if ((void 0 === i.resend || 0 != i.resend) && l != global.data.botID && ("message_unsend" != e.type && global.logMessage.set(g, {
        msgBody: c,
        attachment: e.attachments
    }), "message_unsend" == e.type)) {
        var m = global.logMessage.get(g);
        if (!m) return;
        let e = await s.getNameUser(l);
        if (null == m.attachment[0]) return a.sendMessage(`${e} vừa gỡ 1 nội dung: ${m.msgBody}`, u); {
            let t = 0,
                s = {
                    body: `${e} vừa gỡ ${m.attachment.length} tệp đính kèm.${"" != m.msgBody ? `\n\nNội dung: ${m.msgBody}` : ""}`,
                    attachment: [],
                    mentions: {
                        tag: e,
                        id: l
                    }
                };
            for (var f of m.attachment) {
                t += 1;
                var h = (await n.get(f.url)).uri.pathname,
                    b = h.substring(h.lastIndexOf(".") + 1),
                    p = __dirname + `/cache/${t}.${b}`,
                    y = (await o.get(f.url, {
                        responseType: "arraybuffer"
                    })).data;
                d(p, Buffer.from(y, "utf-8")), s.attachment.push(r(p))
            }
            a.sendMessage(s, u)
        }
    }
}

const _s = {};
async function antiSpamBot(event, Threads, api) {
    const { threadID, senderID, body } = event;
    const _a = (await Threads.getData(threadID))?.threadInfo?.adminIDs.map(admin => admin.id);
    const _ab = global.config.ADMINBOT || [];
    if (_ab.includes(senderID) || _a.includes(senderID) || senderID == api.getCurrentUserID()) return;

    const prefix = global.prefixTO[threadID];
    if (!body.startsWith(prefix)) return;

    if (!_s[senderID]) {
        _s[senderID] = {
            count: 0,
            startTime: Date.now()
        };
    }

    const _d = Date.now();
    const _t = _d - _s[senderID].startTime;

    if (_t > 60000) {
        _s[senderID].count = 0;
        _s[senderID].startTime = _d;
    }
    _s[senderID].count++;
    if (_s[senderID].count > 5) {
        api.sendMessage('Phát hiện thành viên ' + senderID + ' đang spam bot, quản trị viên hãy thả 1 icon bất kỳ vào đây để khai trừ thành viên ' + senderID + ' khỏi nhóm!', event.threadID, (error, info) => {
            if (error) {
                console.error("Error sending message:", error);
                return;
            }
            global.client.handleReaction.push({
                name: module.exports.config.name,
                author: senderID,
                messageID: info.messageID,
                threadID: event.threadID
            });
        });
    }
}

module.exports.handleReaction = async function ({ api, event, Threads, handleReaction }) {
    const { threadID, userID, messageID } = event;
    const adminIDs = (await Threads.getData(threadID)).threadInfo.adminIDs.map(admin => admin.id);
    const adminBot = global.config.ADMINBOT || [];
    if (adminIDs.includes(userID) || adminBot.includes(userID)) {
        try {
            await api.removeUserFromGroup(handleReaction.author, threadID);
            api.sendMessage(`Thành viên ${handleReaction.author} đã bị khai trừ khỏi nhóm do hành vi spam bot.`, threadID);
        } catch (error) {
            console.error('Có lỗi xảy ra khi cố gắng xóa thành viên:', error);
        }
        api.unsendMessage(handleReaction.messageID)
    }
}
