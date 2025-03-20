const fs = require('fs');
const path = require('path');
const axios = require('axios');
const request = require('request');

module.exports.config = {
    name: "tinder",
    version: "1.0.0",
    hasPermssion: 0,
    Rent: 2,
    credits: "Vtuan đẹp try số mụt thế giới:3",
    description: "hỏng có bít=))",
    commandCategory: "Nhóm",
    usages: "tinder+ghép/info/trống để tạo info",
    cooldowns: 0
};
const filePath = path.join(__dirname, '/Game/tinder.json');

module.exports.run = async function ({ api, event, args }) {
    let read = fs.readFileSync(filePath, 'utf-8');
    let dt = read ? JSON.parse(read) : [];
    let find = dt.find(entry => entry.senderID === event.senderID);
    if (find) {
        if (args[0] == "info" || args[0] == "check") {
            const msg = `
🔎 Thông tin của bạn:
👤 Tên: ${find.name}
📅 Tuổi: ${find.age}
🔀 Giới tính: ${find.gender}
🌟 Sở thích: ${find.hobbies}
🏡 Quê quán: ${find.hometown}
`
            if (find.photoUrl) {
                const callbackInfo = () => api.sendMessage({ body: msg, attachment: fs.createReadStream(__dirname + '/cache/1.png') }, event.threadID, () => fs.unlinkSync(__dirname + '/cache/1.png'), event.messageID);
                request(encodeURI(find.photoUrl)).pipe(fs.createWriteStream(__dirname + '/cache/1.png')).on('close', callbackInfo);
            } else {
                api.sendMessage(msg, event.threadID, event.messageID);
            }
        } else if (args[0] == "ghép" || args[0] == "ghep") {
            const randomIndex = Math.floor(Math.random() * dt.length);
            let otherUser = dt[randomIndex];
            while (otherUser.senderID === event.senderID) {
                const newIndex = Math.floor(Math.random() * dt.length);
                otherUser = dt[newIndex];
            }

            const msg1 = `
🔎 Thông tin của bạn:
👤 Tên: ${find.name}
📅 Tuổi: ${find.age}
🔀 Giới tính: ${find.gender}
🌟 Sở thích: ${find.hobbies}
🏡 Quê quán: ${find.hometown}
`
            const msg2 = `
🔎 Thông tin của người ghép:
👤 Tên: ${otherUser.name}
📅 Tuổi: ${otherUser.age}
🔀 Giới tính: ${otherUser.gender}
🌟 Sở thích: ${otherUser.hobbies}
🏡 Quê quán: ${otherUser.hometown}
FB: https://www.facebook.com/${otherUser.senderID}`

            if (find.photoUrl || otherUser.photoUrl) {
                const attachments = [];

                try {
                    if (find.photoUrl) {
                        const userResponse = await axios({
                            url: find.photoUrl,
                            method: 'GET',
                            responseType: 'stream'
                        });
                        const userPhotoPath = path.join(__dirname, 'userTemp.jpg');
                        userResponse.data.pipe(fs.createWriteStream(userPhotoPath))
                            .on('finish', () => {
                                attachments.push(fs.createReadStream(userPhotoPath));
                            });
                    }

                    if (otherUser.photoUrl) {
                        const otherUserResponse = await axios({
                            url: otherUser.photoUrl,
                            method: 'GET',
                            responseType: 'stream'
                        });
                        const otherUserPhotoPath = path.join(__dirname, 'otherUserTemp.jpg');
                        otherUserResponse.data.pipe(fs.createWriteStream(otherUserPhotoPath))
                            .on('finish', () => {
                                attachments.push(fs.createReadStream(otherUserPhotoPath));
                            });
                    }

                    setTimeout(() => {
                        api.sendMessage({
                            body: `${msg1}\n${msg2}`,
                            attachment: attachments
                        }, event.threadID, () => {
                            if (find.photoUrl) fs.unlinkSync(path.join(__dirname, 'userTemp.jpg'));
                            if (otherUser.photoUrl) fs.unlinkSync(path.join(__dirname, 'otherUserTemp.jpg'));
                        });
                    }, 1000); // Đợi để hoàn tất việc tải ảnh

                } catch (error) {
                    console.error(error);
                    api.sendMessage(`${msg1}\n${msg2}`, event.threadID);
                }
            } else {
                api.sendMessage(`${msg1}\n${msg2}`, event.threadID);
            }
        } else if (args[0] == "clear" || args[0] == "xóa") {
            dt = dt.filter(entry => entry.senderID !== event.senderID);
            fs.writeFileSync(filePath, JSON.stringify(dt, null, 4), 'utf-8');
            api.sendMessage("✅ Đã data của người dùng!", event.threadID);
        } else {
            api.sendMessage('❌ Bạn đã nhập thông tin rồi, dùng tinder info để xem thông tin của mình\ntinder clear để xóa thông tin đã cài\nHoặc dùng tinder ghép để ghép đôi với người lạ', event.threadID);
            return;
        }
    } else {
        api.sendMessage(`👤 Trả lời tin nhắn này bằng tên của bạn`, event.threadID, (err, info) => {
            if (err) return console.error(err);
            global.client.handleReply.push({
                step: 1,
                name: module.exports.config.name,
                author: event.senderID,
                messageID: info.messageID,
                threadID: event.threadID,
                data: { senderID: event.senderID }
            });
        });
    }
}

module.exports.handleReply = async function ({ api, event, handleReply, Users, Threads }) {
    if (event.senderID !== handleReply.data.senderID) return;

    let data = handleReply.data;
    api.unsendMessage(handleReply.messageID, (err) => {
        if (err) console.error(err);
    });

    switch (handleReply.step) {
        case 1:
            data.name = event.body.trim();
            api.sendMessage(`📅 Trả lời tin nhắn này bằng tuổi của bạn`, event.threadID, (err, info) => {
                if (err) return console.error(err);
                global.client.handleReply.push({
                    step: 2,
                    name: module.exports.config.name,
                    author: event.senderID,
                    messageID: info.messageID,
                    threadID: event.threadID,
                    data: data
                });
            });
            break;
        case 2:
            data.age = event.body.trim();
            api.sendMessage(`🔀 Trả lời tin nhắn này bằng giới tính của bạn (1: Nam, 2: Nữ, 3: LGBT)`, event.threadID, (err, info) => {
                if (err) return console.error(err);
                global.client.handleReply.push({
                    step: 3,
                    name: module.exports.config.name,
                    author: event.senderID,
                    messageID: info.messageID,
                    threadID: event.threadID,
                    data: data
                });
            });
            break;
        case 3:
            const genderOptions = {
                "1": "Nam",
                "2": "Nữ",
                "3": "LGBT"
            };
            if (!genderOptions[event.body.trim()]) {
                return api.sendMessage(`❌ Lựa chọn không hợp lệ. Vui lòng trả lời bằng số 1 (Nam), 2 (Nữ), hoặc 3 (LGBT)`, event.threadID, (err, info) => {
                    if (err) return console.error(err);
                    global.client.handleReply.push({
                        step: 3,
                        name: module.exports.config.name,
                        author: event.senderID,
                        messageID: info.messageID,
                        threadID: event.threadID,
                        data: data
                    });
                });
            }
            data.gender = genderOptions[event.body.trim()];
            api.sendMessage(`🌟 Trả lời tin nhắn này bằng sở thích của bạn`, event.threadID, (err, info) => {
                if (err) return console.error(err);
                global.client.handleReply.push({
                    step: 4,
                    name: module.exports.config.name,
                    author: event.senderID,
                    messageID: info.messageID,
                    threadID: event.threadID,
                    data: data
                });
            });
            break;
        case 4:
            data.hobbies = event.body.trim();
            api.sendMessage(`🏡 Trả lời tin nhắn này bằng quê quán của bạn`, event.threadID, (err, info) => {
                if (err) return console.error(err);
                global.client.handleReply.push({
                    step: 5,
                    name: module.exports.config.name,
                    author: event.senderID,
                    messageID: info.messageID,
                    threadID: event.threadID,
                    data: data
                });
            });
            break;
        case 5:
            data.hometown = event.body.trim();
            api.sendMessage(`📷 Bạn có muốn tải lên ảnh không? Trả lời "có" hoặc "không".`, event.threadID, (err, info) => {
                if (err) return console.error(err);
                global.client.handleReply.push({
                    step: 6,
                    name: module.exports.config.name,
                    author: event.senderID,
                    messageID: info.messageID,
                    threadID: event.threadID,
                    data: data
                });
            });
            break;
        case 6:
            if (event.body.trim().toLowerCase() === 'có') {
                api.sendMessage(`📸 Vui lòng tải lên ảnh của bạn.`, event.threadID, (err, info) => {
                    if (err) return console.error(err);
                    global.client.handleReply.push({
                        step: 7,
                        name: module.exports.config.name,
                        author: event.senderID,
                        messageID: info.messageID,
                        threadID: event.threadID,
                        data: data
                    });
                });
            } else {
                saveUserData(data, api, event);
            }
            break;
        case 7:
            if (event.attachments.length > 0 && event.attachments[0].type === 'photo') {
                data.photoUrl = event.attachments[0].url;
            }
            saveUserData(data, api, event);
            break;
        default:
            break;
    }
};

function saveUserData(data, api, event) {
    const filePath = path.join(__dirname, '/Game/tinder.json');
    fs.readFile(filePath, (err, fileData) => {
        let json = [];
        if (!err) json = JSON.parse(fileData);
        json.push(data);
        fs.writeFile(filePath, JSON.stringify(json, null, 4), (err) => {
            if (err) return console.error(err);
            api.sendMessage('✔️ Thông tin của bạn đã được lưu!', event.threadID);
        });
    });
}