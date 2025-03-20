// bot.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const figlet = require('figlet');
const moment = require('moment-timezone');
const login = require('facebook-chat-api'); // Chỉ dùng để lấy appstate
const fbClient = require('./includes/fb-client'); // Dùng để đăng nhập bot
const logger = require('./utils/log');
const { Sequelize, sequelize } = require('./includes/database');
const database = require('./includes/database/model');
const { Controller } = require('./utils/facebook/index');

// ========== CẤU HÌNH TOÀN CỤC ==========
const APPSTATE_PATH = path.join(__dirname, 'appstate.json');
const MAX_RETRIES = 3;
let retryCount = 0;

// Khởi tạo các biến toàn cục
global.client = {
    commands: new Map(),
    NPF_commands: new Map(),
    events: new Map(),
    cooldowns: new Map(),
    eventRegistered: [],
    handleReaction: [],
    handleReply: [],
    getTime: option => moment.tz("Asia/Ho_Chi_minh").format({
        seconds: "ss",
        minutes: "mm",
        hours: "HH",
        day: "dddd",
        date: "DD",
        month: "MM",
        year: "YYYY",
        fullHour: "HH:mm:ss",
        fullYear: "DD/MM/YYYY",
        fullTime: "HH:mm:ss DD/MM/YYYY"
    }[option])
};

global.data = {
    threadInfo: new Map(),
    threadData: new Map(),
    userName: new Map(),
    userBanned: new Map(),
    threadBanned: new Map(),
    commandBanned: new Map(),
    allUserID: [],
    allCurrenciesID: [],
    allThreadID: [],
    groupInteractionsData: []
};

global.config = {};
global.moduleData = [];
global.language = {};
global.timeStart = Date.now();
global.nodemodule = new Proxy({}, {
    get: (target, name) => {
        if (!target[name]) target[name] = require(name);
        return target[name];
    }
});
global.facebookMedia = (new Controller).FacebookController;

// Load config
try {
    const configValue = require('./config.json');
    Object.assign(global.config, configValue);
    logger("┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓", "[ info ]");
    logger.loader(chalk.green("✅ Config Loaded!"));
} catch (error) {
    logger.loader(chalk.red("❌ Config file not found!"), "error");
}

// Load language
const langData = fs.readFileSync(`${__dirname}/languages/${global.config.language || "en"}.lang`, { encoding: "utf-8" })
    .split(/\r?\n|\r/)
    .filter(item => item.indexOf("#") !== 0 && item !== "");
for (const item of langData) {
    const getSeparator = item.indexOf("=");
    const itemKey = item.slice(0, getSeparator);
    const itemValue = item.slice(getSeparator + 1);
    const head = itemKey.slice(0, itemKey.indexOf("."));
    const key = itemKey.replace(head + ".", "");
    const value = itemValue.replace(/\\n/gi, "\n");
    if (!global.language[head]) global.language[head] = {};
    global.language[head][key] = value;
}

global.getText = function (...args) {
    const langText = global.language;
    if (!langText.hasOwnProperty(args[0])) throw `${__filename} - Not found key language: ${args[0]}`;
    let text = langText[args[0]][args[1]];
    for (let i = args.length - 1; i > 0; i--) {
        const regEx = RegExp(`%${i}`, "g");
        text = text.replace(regEx, args[i + 1]);
    }
    return text;
};

// ========== HÀM LẤY APPSTATE ==========
async function getAppState() {
    try {
        if (fs.existsSync(APPSTATE_PATH)) {
            const appState = require(APPSTATE_PATH);
            logger.loader(chalk.yellow('⚠️ Phát hiện appstate cũ, kiểm tra tính hợp lệ...'));
            const isValid = await testAppState(appState);
            if (isValid) {
                logger.loader(chalk.green('✅ Appstate vẫn còn hiệu lực!'));
                return appState;
            }
        }
        logger.loader(chalk.blue('🔑 Đang thực hiện đăng nhập Facebook...'));
        return await loginWithCredentials();
    } catch (error) {
        logger.loader(chalk.red('❌ Lỗi nghiêm trọng khi lấy appstate:'), error);
        throw error;
    }
}

function testAppState(appState) {
    return new Promise((resolve) => {
        login({ appState }, (err, api) => {
            if (err) {
                logger.loader(chalk.yellow('⚠️ Appstate đã hết hạn hoặc không hợp lệ'));
                return resolve(false);
            }
            api.getUserInfo(api.getCurrentUserID(), (err, user) => {
                api.logout();
                if (err || !user) return resolve(false);
                logger.loader(chalk.green(`✅ Xác thực thành công với tài khoản: ${user[api.getCurrentUserID()].name}`));
                resolve(true);
            });
        });
    });
}

function loginWithCredentials() {
    return new Promise((resolve, reject) => {
        login({
            email: process.env.FB_EMAIL,
            password: process.env.FB_PASSWORD
        }, (err, api) => {
            if (err) {
                handleLoginError(err);
                return reject(err);
            }
            const newAppState = api.getAppState();
            fs.writeFileSync(APPSTATE_PATH, JSON.stringify(newAppState, null, 2));
            logger.loader(chalk.green(`✅ Đăng nhập thành công! Appstate đã lưu vào: ${APPSTATE_PATH}`));
            api.logout((logoutErr) => {
            if (logoutErr) {
                console.error('Lỗi đăng xuất:', logoutErr);
            } else {
                console.log('Đăng xuất thành công');
            }
        });
        });
    });
}

function handleLoginError(err) {
    switch (err.error) {
        case 'login-approval':
            logger.loader(chalk.yellow('⚠️ Vui lòng nhập mã 2FA từ điện thoại:'));
            process.stdin.once('data', (code) => err.continue(code.toString().trim()));
            break;
        case 'wrong-username':
        case 'wrong-password':
            logger.loader(chalk.red('❌ Sai email hoặc mật khẩu!'));
            break;
        default:
            logger.loader(chalk.red('❌ Lỗi đăng nhập:'), err.error);
    }
}

// ========== HÀM KHỞI TẠO BOT ==========
async function initializeBot() {
    try {
        const appstate = await getAppState();
        logger.loader(chalk.green('✅ Đã lấy được appstate, đang khởi tạo bot...'));
        await startBotProcess(appstate);
    } catch (error) {
        logger.loader(chalk.red(`❌ Lỗi khởi tạo: ${error.message}`));
        await handleAuthError(error);
    }
}

async function handleAuthError(error) {
    if (retryCount >= MAX_RETRIES) {
        logger.loader(chalk.red('🛑 Đạt giới hạn số lần thử lại!'));
        process.exit(1);
    }
    if (fs.existsSync(APPSTATE_PATH)) {
        fs.unlinkSync(APPSTATE_PATH);
        logger.loader(chalk.yellow('⚠️ Đã xóa appstate cũ'));
    }
    retryCount++;
    logger.loader(chalk.blue(`🔄 Thử đăng nhập lại (Lần ${retryCount}/${MAX_RETRIES})...`));
    await initializeBot();
}

function startBotProcess(appstate) {
    return new Promise((resolve, reject) => {
        fbClient({ appState: appstate }, (err, api) => {
            if (err) return reject(err);

            api.setOptions(global.config.FCAOption);
            global.client.api = api;
            logger("┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛", "[ info ]");
            require('./utils/startMDl')(api, global.models);

            // Load các module onload
            fs.readdirSync(path.join('./modules/onload'))
                .filter(module => module.endsWith('.js'))
                .forEach(module => require(`./modules/onload/${module}`)({ api, models: global.models }));

            const handleEvent = require('./includes/listen')({ api, models: global.models });

            function handleMqttEvents(error, message) {
                if (error) {
                    if (JSON.stringify(error).includes("XCheckpointFBScrapingWarningController") || JSON.stringify(error).includes("601051028565049")) {
                        clearFacebookWarning(api, (success) => {
                            if (success) {
                                global.handleListen = api.listenMqtt(handleMqttEvents);
                                setTimeout(() => {
                                    global.mqttClient.end();
                                    connect_mqtt();
                                }, 1000 * 60 * 60 * 3);
                            }
                        });
                    } else if (JSON.stringify(error).includes('Not logged in.')) {
                        process.exit(0);
                    } else if (JSON.stringify(error).includes('ECONNRESET')) {
                        global.mqttClient.end();
                        api.listenMqtt(handleMqttEvents);
                    } else {
                        logger('Lỗi khi lắng nghe sự kiện: ' + JSON.stringify(error), 'error');
                    }
                }
                if (message && !['presence', 'typ', 'read_receipt'].includes(message.type)) {
                    handleEvent(message);
                }
            }

            setInterval(() => {
                global.mqttClient.end();
                api.listenMqtt(handleMqttEvents);
            }, 1000 * 60 * 60 * 3);
            api.listenMqtt(handleMqttEvents);

            const formatMemory = (bytes) => (bytes / (1024 * 1024)).toFixed(2);
            const logMemoryUsage = () => {
                const { rss } = process.memoryUsage();
                logger(`🔹 RAM đang sử dụng (RSS): ${formatMemory(rss)} MB`, "[ Giám sát ]");
                if (rss > 500 * 1024 * 1024) {
                    logger('⚠️ Phát hiện rò rỉ bộ nhớ, khởi động lại ứng dụng...', "[ Giám sát ]");
                    process.exit(1);
                }
            };
            setInterval(logMemoryUsage, 10000);

            fs.writeFileSync(APPSTATE_PATH, JSON.stringify(api.getAppState(), null, "\t"));
            logger.loader("┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓");
            logger.loader(` ID BOT: ${api.getCurrentUserID()}`);
            logger.loader(` PREFIX: ${!global.config.PREFIX ? "Bạn chưa set prefix" : global.config.PREFIX}`);
            logger.loader(` NAME BOT: ${!global.config.BOTNAME ? "This bot was made by Niio-team" : global.config.BOTNAME}`);
            logger.loader(` Tổng số module: ${global.client.commands.size}`);
            logger.loader(` Tổng số sự kiện: ${global.client.events.size}`);
            logger.loader("┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛");
            logger.loader(`Thời gian khởi động: ${Math.floor((Date.now() - global.timeStart) / 1000)}s`);
            console.log(chalk.yellow(figlet.textSync('START BOT', { horizontalLayout: 'full' })));

            resolve();
        });
    });
}

function clearFacebookWarning(api, callback) {
    const form = {
        av: api.getCurrentUserID(),
        fb_api_caller_class: "RelayModern",
        fb_api_req_friendly_name: "FBScrapingWarningMutation",
        variables: "{}",
        server_timestamps: "true",
        doc_id: "6339492849481770",
    };
    api.httpPost("https://www.facebook.com/api/graphql/", form, (error, res) => {
        if (error || res.errors) {
            logger("Tiến hành vượt cảnh báo thất bại", "error");
            return callback && callback(false);
        }
        if (res.data.fb_scraping_warning_clear.success) {
            logger("Đã vượt cảnh cáo Facebook thành công.", "[ success ] >");
            return callback && callback(true);
        }
    });
}

function connect_mqtt() {
    global.client.api.listenMqtt((err, message) => {
        if (err) logger("Lỗi kết nối MQTT: " + JSON.stringify(err), "error");
    });
}

// ========== XỬ LÝ LỖI TOÀN HỆ THỐNG ==========
process.on('uncaughtException', error => {
    if (error.message.includes('AppState')) {
        logger.loader(chalk.red('⚠️ Phát hiện lỗi appstate!'));
        handleAuthError(error);
    } else {
        console.error('Unhandled Exception:', error);
    }
});

process.on('unhandledRejection', (reason) => {
    if (JSON.stringify(reason).includes("571927962827151")) {
        console.log(`Lỗi khi get dữ liệu mới! Khắc phục: hạn chế reset!!`);
    } else {
        console.error('Unhandled Rejection:', reason);
    }
});

// ========== CHẠY CHƯƠNG TRÌNH ==========
(async () => {
    try {
        await sequelize.authenticate();
        const authentication = { Sequelize, sequelize };
        global.models = database(authentication);
        logger(`Kết nối đến cơ sở dữ liệu thành công`, "");
        await initializeBot();
    } catch (error) {
        logger(`Kết nối đến cơ sở dữ liệu thất bại: ${error.message}`, "[ DATABASE ] >");
        process.exit(1);
    }
})();