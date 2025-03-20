const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const moment = require('moment-timezone');
const Jimp = require('jimp');
const historyFilePath = path.resolve(__dirname, '../../core/data/taixiu_history.json');
const sessionFilePath = path.resolve(__dirname, '../../core/data/taixiu_sessions.json');
const gameStatusFilePath = path.resolve(__dirname, '../../core/data/taixiu_status.json'); // Tệp lưu trạng thái game (on/off)

const tilethang = 2; // Tỷ lệ thắng
const betTime = 60;  // Thời gian đặt cược (60s)

// Hàm thay thế dấu phẩy cho số tiền
function replace(int) {
    return int.toString().replace(/(.)(?=(\d{3})+$)/g, '$1,');
}

// Hàm lấy ảnh xúc xắc
function getImage(number) {
    const images = [
        "https://i.imgur.com/cmdORaJ.jpg", "https://i.imgur.com/WNFbw4O.jpg",
        "https://i.imgur.com/Xo6xIX2.jpg", "https://i.imgur.com/NJJjlRK.jpg",
        "https://i.imgur.com/QLixtBe.jpg", "https://i.imgur.com/y8gyJYG.jpg"
    ];
    return images[number - 1];
}

// Lưu trạng thái trò chơi (on/off)
function saveGameStatus(status) {
    fs.writeFileSync(gameStatusFilePath, JSON.stringify({ status }, null, 2));
}

// Lấy trạng thái trò chơi (on/off)
function getGameStatus() {
    if (fs.existsSync(gameStatusFilePath)) {
        const gameStatus = JSON.parse(fs.readFileSync(gameStatusFilePath, 'utf8'));
        return gameStatus.status;
    }
    return "on"; // Mặc định là "on" nếu không có trạng thái lưu trữ
}

// Lưu lịch sử cược
function saveHistory(userId, data) {
    let history = fs.existsSync(historyFilePath) ? JSON.parse(fs.readFileSync(historyFilePath, 'utf8')) : {};
    if (!history[userId]) history[userId] = [];
    if (history[userId].length >= 8) history[userId].shift();
    history[userId].push(data);
    fs.writeFileSync(historyFilePath, JSON.stringify(history, null, 2));
}

// Lưu dữ liệu phiên cược
function saveSessionData(sessionId, data) {
    let sessions = fs.existsSync(sessionFilePath) ? JSON.parse(fs.readFileSync(sessionFilePath, 'utf8')) : {};
    sessions[sessionId] = data;
    fs.writeFileSync(sessionFilePath, JSON.stringify(sessions, null, 2));
}

// Hàm khởi tạo khi tải module
this.onLoad = async function () {
    if (!fs.existsSync(historyFilePath)) fs.writeFileSync(historyFilePath, JSON.stringify({}, null, 2));
    if (!fs.existsSync(sessionFilePath)) fs.writeFileSync(sessionFilePath, JSON.stringify({}, null, 2));
    if (!fs.existsSync(gameStatusFilePath)) saveGameStatus("on"); // Mặc định bật trò chơi
};

module.exports = {
    name: "taixiu",
    alias: ["taixiu"],
    version: "1.0.0",
    role: 0,
    author: "DuongKhang",
    info: "Tài xỉu đa dạng nhiều kiểu",
    category: "Game",
    guides: "[tài/xỉu] [số tiền/số %]",
    cd: 5,
    prefix: true,

    // Hướng dẫn sử dụng
    onCall: async function ({ msg, event, api, userData, args, utils }) {
        try {
            const { threadID, messageID, senderID } = event;
            const { addMoney, delMoney } = userData;
            const name = (await userData.get(senderID)).name;
            const money = BigInt(await userData.checkMoney(senderID));

            // Kiểm tra trạng thái trò chơi
            const gameStatus = getGameStatus();
            if (gameStatus === "off") {
                return api.sendMessage("❎ Hiện tại trò chơi Tài Xỉu đã bị tắt. Vui lòng thử lại sau.", threadID, messageID);
            }

            // Nếu người chơi yêu cầu hướng dẫn
            if (args[0] === 'hướng dẫn' || args[0] === 'help') {
                return api.sendMessage(
                    `📚 **Hướng dẫn chơi Tài Xỉu** 📚\n\n
                    - **Cách chơi**: Lựa chọn giữa "Tài" hoặc "Xỉu" và cược số tiền bạn muốn. 
                    - **Lựa chọn Tài/Xỉu**: Tài nếu tổng số điểm xúc xắc từ 11 đến 18, Xỉu nếu từ 3 đến 10.
                    - **Cách đặt cược**: 
                        - **Tài [số tiền]**: Đặt cược số tiền bạn muốn vào "Tài"
                        - **Xỉu [số tiền]**: Đặt cược số tiền bạn muốn vào "Xỉu"
                        - **Tài [số %]**: Đặt cược theo tỷ lệ phần trăm của số dư
                        - **Ví dụ**: Tài 5000 hoặc Xỉu 10%
                    - **Thời gian cược**: Mỗi lần cược có thời gian cược là **60 giây**.
                    - **Tỷ lệ thắng**: **2x** (cược thắng sẽ nhận gấp đôi số tiền cược).

                    Chúc bạn may mắn! 🎲`,
                    event.threadID
                );
            }

            if (!args[1]) return msg.reply("❎ Vui lòng cung cấp tiền cược");

            // Xử lý số tiền cược
            const betMoney = args[1];
            let bet;
            if (/^(allin|all)$/i.test(betMoney)) bet = money;
            else if (/^[0-9]+%$/.test(betMoney)) bet = BigInt(Math.floor((parseInt(betMoney) / 100) * Number(money)));
            else bet = BigInt(betMoney);

            if (bet < 1000n || bet > money) return msg.reply("❎ Vui lòng cược ít nhất 1000$ và không vượt quá số dư");

            const input = args[0].toLowerCase();
            if (!['tài', 'xỉu'].includes(input)) return msg.reply("❎ Vui lòng chọn tài/xỉu");

            // Tạo ID phiên cược
            const sessionId = `session-${Date.now()}`;

            // Lưu trữ phiên cược
            let gameSession = fs.existsSync(sessionFilePath) ? JSON.parse(fs.readFileSync(sessionFilePath, 'utf8')) : {};
            if (!gameSession[sessionId]) {
                gameSession[sessionId] = {
                    players: {},
                    startTime: Date.now(),
                    betTime: betTime * 1000,  // 60s
                    status: 'active' // Trạng thái phiên cược
                };
            }
            gameSession[sessionId].players[senderID] = { bet, choice: input, name };
            saveSessionData(sessionId, gameSession);

            api.sendMessage(`⏳ Đặt cược thành công. Vui lòng chờ ${betTime} giây để kết quả được công bố!`, threadID, messageID);

            // Chờ kết quả sau 60s
            setTimeout(async () => {
                const number = Array.from({ length: 3 }, () => Math.floor(Math.random() * 6 + 1));
                const total = number.reduce((a, b) => a + b, 0);
                const ans = total >= 11 && total <= 18 ? "tài" : "xỉu";
                const result = ans === input ? 'win' : 'lose';
                const mn = result === 'win' ? bet * BigInt(tilethang) : bet;
                const resultMessage = `🎲 Kết quả: ${number.join(' | ')} - Tổng: ${total} (${ans})\n🤑 Bạn ${result === 'win' ? 'Thắng' : 'Thua'} ${replace(mn.toString())}$`;
                
                if (result === 'win') {
                    await addMoney(senderID, mn);
                } else {
                    await delMoney(senderID, mn);
                }

                // Lưu lịch sử cược
                saveHistory(senderID, result === 'win' ? "🟢" : "⚪");

                api.sendMessage({
                    body: `👤 Người chơi ${name} đã chọn ${input} với số tiền ${replace(bet.toString())}$\n${resultMessage}`,
                    threadID,
                    messageID
                });

                // Kết thúc phiên cược
                gameSession[sessionId].status = 'finished';
                saveSessionData(sessionId, gameSession);

            }, betTime * 1000);

        } catch (error) {
            console.error(error);
            msg.reply("❎ Đã có lỗi xảy ra trong quá trình chơi Tài Xỉu.");
        }
    }
};