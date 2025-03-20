module.exports.config = {
    name: "setname",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "TrúcCute mod by Niio-team (Cthinh || Vtuan)",
    description: "Đổi biệt danh trong nhóm của bạn hoặc của người bạn tag",
    commandCategory: "Nhóm",
    usages: "trống/tag/check/all/del/call + name",
    cooldowns: 5
}
const fs = require('fs-extra');

const setn = "./modules/data/setname.json";
if (!fs.existsSync(setn)) {
    fs.writeFileSync(setn, JSON.stringify([]));
}
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports.run = async ({ api, event, args, Users, Threads }) => {
    let { threadID, messageReply, senderID, mentions, type, participantIDs } = event;
    let read = await fs.readFile(setn, 'utf-8');
    let Data = read ? JSON.parse(read) : [];
    let threadEntry = Data.find(entry => entry.threadID === event.threadID);
    switch (args[0]) {
        case 'call':
        case 'Call': {
            const dataThread = (await Threads.getData(threadID)).threadInfo;
            if (!dataThread.adminIDs.some(item => item.id === senderID)) return api.sendMessage('⚠️ Bạn không đủ quyền hạn', threadID);
            const dataNickName = (await Threads.getData(threadID)).threadInfo.nicknames;
            const objKeys = Object.keys(dataNickName);
            const notFoundIds = participantIDs.filter(id => !objKeys.includes(id));
            const mentions = [];

            let tag = '';
            for (let i = 0; i < notFoundIds.length; i++) {
                const id = notFoundIds[i];
                const name = await Users.getNameUser(id);
                mentions.push({ tag: name, id });

                tag += `${i + 1}. @${name}\n`;
            }

            const bd = '📣 Vui lòng setname để mọi người nhận biết bạn dễ dàng hơn';

            const message = {
                body: `${bd}\n\n${tag}`,
                mentions: mentions
            };
            api.sendMessage(message, threadID);
            return;
        }

        case 'del':
        case 'Del': {
            const threadInfo = (await Threads.getData(threadID)).threadInfo;
            if (!threadInfo.adminIDs.some(admin => admin.id === senderID)) {
                return api.sendMessage(`⚠️ Chỉ quản trị viên mới có thể sử dụng`, threadID);
            }
            const dataNickName = threadInfo.nicknames
            var dataNotNN = []
            const objKeys = Object.keys(dataNickName);
            const notFoundIds = participantIDs.filter(id => !objKeys.includes(id));
            await notFoundIds.map(async (id) => {
                try {
                    api.removeUserFromGroup(id, threadID)
                } catch (e) {
                    console.log(e)
                }
            });
            return api.sendMessage(`✅ Đã xóa thành công những thành viên không setname`, threadID)
        }
        case 'check':
        case 'Check': {
            const dataNickName = (await Threads.getData(threadID)).threadInfo.nicknames
            var dataNotNN = []
            const objKeys = Object.keys(dataNickName);
            const notFoundIds = participantIDs.filter(id => !objKeys.includes(id));
            var msg = '📝 Danh sách các người dùng chưa setname\n',
                num = 1;
            await notFoundIds.map(async (id) => {
                const name = await Users.getNameUser(id)
                msg += `\n${num++}. ${name}`
            });
            msg += `\n\n📌 Thả cảm xúc vào tin nhắn này để kick những người không setname ra khỏi nhóm`
            return api.sendMessage(msg, threadID, (error, info) => {
                global.client.handleReaction.push({
                    name: this.config.name,
                    messageID: info.messageID,
                    author: event.senderID,
                    abc: notFoundIds
                })
            })
        }
            break;
        case 'help':
            return api.sendMessage(
                `1. "setname + name" -> Đổi biệt danh của bạn\n` +
                `2. "setname @tag + name" -> Đổi biệt danh của người dùng được đề cập\n` +
                `3. "setname all + name" -> Đổi biệt danh của tất cả thành viên\n` +
                `4. "setname check" -> Hiển thị danh sách người dùng chưa đặt biệt danh\n` +
                `5. "setname del" -> Xóa người dùng chưa setname (chỉ dành cho quản trị viên)\n` +
                `6. "setname add + kí tự" -> thêm kí hiệu của box khi setname (chỉ dành cho quản trị viên)\n` +
                `7. "setname rm" -> xóa kí tự của box (chỉ dành cho quản trị viên)\n` +
                `8. "setname call" -> Yêu cầu người dùng chưa đặt biệt danh đặt biệt danh`, threadID);

        case 'all':
        case 'All': {

            try {
                const name = (event.body).split('all')[1]
                var num = 1;
                for (const i of participantIDs) {
                    num++
                    try {
                        api.changeNickname(name, threadID, i)
                    } catch (e) {
                        console.log(num + " " + e)
                    }
                    delay(2500)

                }
                return api.sendMessage(`✅ Đã đổi biệt danh thành công cho tất cả thành viên`, threadID)
            } catch (e) {
                return console.log(e, threadID)
            }
        }

        case 'add':
        case 'Add': {
            const content = (args.slice(1, args.length)).join(" ");
            if (threadEntry) {
                threadEntry.nameUser = content;
            } else {
                const data = {
                    threadID: event.threadID,
                    nameUser: content
                };
                Data.push(data);
            }
            await fs.writeFile(setn, JSON.stringify(Data, null, 4), 'utf-8');
            return api.sendMessage("🌟 Đã thêm kí hiệu thành công!\nKí hiệu: " + content, event.threadID, event.messageID);
        }

        case 'rm':
        case 'Rm': {
            if (threadEntry) {
                Data = Data.filter(entry => entry.threadID !== event.threadID);
                await fs.writeFile(setn, JSON.stringify(Data, null, 4), 'utf-8');
                return api.sendMessage("✅ Đã xóa kí hiệu nhóm!", event.threadID, event.messageID);
            } else {
                return api.sendMessage("🚫 Nhóm chưa có kí hiệu!", event.threadID, event.messageID);
            }
        }

    }
    const delayUnsend = 60;// tính theo giây
    if (threadEntry) { 
        if (type === "message_reply") {
            const name = args.join(' ');
            if (name.length > 25) return api.sendMessage(`Tên như lồn dài vcl, ngắn thôi`, threadID)
            const name2 = await Users.getNameUser(messageReply.senderID);

            api.changeNickname(threadEntry.nameUser + ' ' + name, threadID, messageReply.senderID, (err) => {
                if (!err) {
                    api.sendMessage(`✅ Đã đổi tên của ${name2} thành ${name || "tên gốc"}`, threadID, (error, info) => {
                        if (!error) {
                            setTimeout(() => {
                                api.unsendMessage(info.messageID);
                            }, delayUnsend * 1000);
                        }
                    });
                } else {
                    api.sendMessage(`❎ Nhóm chưa tắt liên kết mời!!`, threadID);
                }
            });
        } else {
            const mention = Object.keys(mentions)[0];
            const name2 = await Users.getNameUser(mention || senderID);

            if (args.join().indexOf('@') !== -1) {
                const name = args.join(' ').replace(mentions[mention], '');

                api.changeNickname(threadEntry.nameUser + ' ' + name, threadID, mention, (err) => {
                    if (!err) {
                        api.sendMessage(`✅ Đã đổi tên của ${name2} thành ${name || "tên gốc"}`, threadID, (error, info) => {
                            if (!error) {
                                setTimeout(() => {
                                    api.unsendMessage(info.messageID);
                                }, delayUnsend * 1000);
                            }
                        });
                    } else {
                        api.sendMessage(`❎ Nhóm chưa tắt liên kết mời!!`, threadID);
                    }
                });
            } else {
                const name = args.join(" ");
                if (name.length > 25) return api.sendMessage(`Tên như lồn dài vcl, ngắn thôi`, threadID)

                api.changeNickname(threadEntry.nameUser + ' ' + name, threadID, senderID, (err) => {
                    if (!err) {
                        api.sendMessage(`✅ Đã đổi tên của bạn thành ${name || "tên gốc"}`, threadID, (error, info) => {
                            if (!error) {
                                setTimeout(() => {
                                    api.unsendMessage(info.messageID);
                                }, delayUnsend * 1000);
                            }
                        });
                    } else {
                        api.sendMessage(`❎ Nhóm chưa tắt liên kết mời!!`, threadID);
                    }
                });
            }
        }
    } else {
        if (type === "message_reply") {
            const name = args.join(' ');
            if (name.length > 25) return api.sendMessage(`Tên như lồn dài vcl, ngắn thôi`, threadID)
            const name2 = await Users.getNameUser(messageReply.senderID);

            api.changeNickname(name, threadID, messageReply.senderID, (err) => {
                if (!err) {
                    api.sendMessage(`✅ Đã đổi tên của ${name2} thành ${name || "tên gốc"}`, threadID, (error, info) => {
                        if (!error) {
                            setTimeout(() => {
                                api.unsendMessage(info.messageID);
                            }, delayUnsend * 1000);
                        }
                    });
                } else {
                    api.sendMessage(`❎ Nhóm chưa tắt liên kết mời!!`, threadID);
                }
            });
        } else {
            const mention = Object.keys(mentions)[0];
            const name2 = await Users.getNameUser(mention || senderID);

            if (args.join().indexOf('@') !== -1) {
                const name = args.join(' ').replace(mentions[mention], '');

                api.changeNickname(name, threadID, mention, (err) => {
                    if (!err) {
                        api.sendMessage(`✅ Đã đổi tên của ${name2} thành ${name || "tên gốc"}`, threadID, (error, info) => {
                            if (!error) {
                                setTimeout(() => {
                                    api.unsendMessage(info.messageID);
                                }, delayUnsend * 1000);
                            }
                        });
                    } else {
                        api.sendMessage(`❎ Nhóm chưa tắt liên kết mời!!`, threadID);
                    }
                });
            } else {
                const name = args.join(" ");
                if (name.length > 25) return api.sendMessage(`Tên như lồn dài vcl, ngắn thôi`, threadID)

                api.changeNickname(name, threadID, senderID, (err) => {
                    if (!err) {
                        api.sendMessage(`✅ Đã đổi tên của bạn thành ${name || "tên gốc"}`, threadID, (error, info) => {
                            if (!error) {
                                setTimeout(() => {
                                    api.unsendMessage(info.messageID);
                                }, delayUnsend * 1000);
                            }
                        });
                    } else {
                        api.sendMessage(`❎ Nhóm chưa tắt liên kết mời!!`, threadID);
                    }
                });
            }
        }
    }


}

module.exports.handleReaction = async function ({ api, event, Threads, handleReaction, getText }) {
    if (event.userID != handleReaction.author) return;
    if (Array.isArray(handleReaction.abc) && handleReaction.abc.length > 0) {
        let errorMessage = '';
        let successMessage = `✅ Đã xóa thành công ${handleReaction.abc.length} thành viên không set name`;
        let errorOccurred = false;

        for (let i = 0; i < handleReaction.abc.length; i++) {
            const userID = handleReaction.abc[i];
            try {
                await api.removeUserFromGroup(userID, event.threadID);
            } catch (error) {
                errorOccurred = true;
                errorMessage += `⚠️ Lỗi khi xóa ${userID} từ nhóm`;
            }
        }
        api.sendMessage(errorOccurred ? errorMessage : successMessage, event.threadID);
    } else {
        api.sendMessage(`Không có ai!`, event.threadID);
    }
}