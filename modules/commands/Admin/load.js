const { readdirSync } = require('fs-extra');
const fs = require('fs-extra');
const { join } = require('path');
const path = require('path');

module.exports.config = {
    name: "load",
    version: "2.0.0",
    hasPermssion: 2,
    credits: "Niio-team (Vtuan)",
    description: "Load module",
    commandCategory: "Admin",
    usages: "[all] | + (có thể có Event) +  [tên module] | All",
    cooldowns: 0,
};

function readModules(t) {
    const fileReadModules = path.resolve('./modules/commands/');
    const folders = fs.readdirSync(fileReadModules);
    for (let folder of folders) {
        const fullPath = path.join(fileReadModules, folder);
        if (fs.lstatSync(fullPath).isDirectory()) {
            const files = fs.readdirSync(fullPath).filter(file => file.endsWith('.js'));
            for (let file of files) {
                const x = file.slice(0, -3);
                if (x == t) return path.join(fullPath, file);
            }
        }
    }
}
module.exports.run = async function ({ event, args, api, models }) {
    const threadID = event.threadID;
    const messageID = event.messageID;

    function reloadModule(type, name) {
        const dirPath = type === 'commands' ? __dirname : path.join(__dirname, '..', 'events');
        try {
            let filePath;

            if (type === 'commands') {
                filePath = readModules(name);
                delete require.cache[require.resolve(filePath)];
                const mdlModule = require(filePath);
                if (!mdlModule.config || !mdlModule.run || !mdlModule.config.commandCategory) {
                    return api.sendMessage(`❎ Module không đúng định dạng: ${name}`, threadID, messageID);
                }
                if (mdlModule.onLoad) mdlModule.onLoad(api, models);
                global.client[type].set(mdlModule.config.name, mdlModule);
            } else if (type === 'events') {
                filePath = path.join(dirPath, `${name}.js`);
                delete require.cache[require.resolve(filePath)];
                const mdlModule = require(filePath);
                if (!mdlModule.config || !mdlModule.config.name || !mdlModule.config.eventType || !mdlModule.run) {
                    return api.sendMessage(`❎ Module không đúng định dạng: ${name}`, threadID, messageID);
                }
                if (mdlModule.onLoad) mdlModule.onLoad(api, models);
                global.client[type].set(mdlModule.config.name, mdlModule);
            }

            api.sendMessage(`✅ Đã tải lại thành công ${type.slice(0, -1)} ${name}!`, threadID, messageID);
        } catch (error) {
            console.error(`❎ Lỗi khi tải lại ${type.slice(0, -1)} ${name}: ${error.message}`);
            api.sendMessage(`❎ Lỗi khi tải lại ${type.slice(0, -1)} ${name}`, threadID, messageID);
        }
    }


    function unloadModule(type, name) {
        if (global.client[type].has(name)) {
            const dirPath = type === 'commands' ? __dirname : path.join(__dirname, '..', 'events');
            const filePath = path.join(dirPath, `${name}.js`);
            delete require.cache[require.resolve(filePath)];
            global.client[type].delete(name);
            api.sendMessage(`✅ Đã hủy tải module ${name} thành công.`, threadID, messageID);
        } else {
            api.sendMessage(`❎ Module ${name} không tồn tại trong danh sách đã tải.`, threadID, messageID);
        }
    }

    if (args[0] === "All") {
        for (const command of global.client.commands.keys()) {
            global.client.commands.delete(command);
        }
        for (const event of global.client.events.keys()) {
            global.client.events.delete(event);
        }
        const commandFiles = readdirSync(__dirname).filter(file => file.endsWith('.js') && !file.includes('example'));
        for (const file of commandFiles) {
            const filePath = join(__dirname, file);
            delete require.cache[require.resolve(filePath)];
        }
        
        const eventFiles = readdirSync(path.join(__dirname, '..', '..', 'events')).filter(file => file.endsWith('.js') && !file.includes('example'));

        for (const file of eventFiles) {
            const filePath = join(__dirname, '..', '..', 'events', file);
            delete require.cache[require.resolve(filePath)];
        }

        global.loadMdl('commands');
        global.loadMdl('events');
        api.sendMessage('✅ Đã tải thành công ' + global.client.commands.size + ' modules' + 'và ' + global.client.events.size + ' event', threadID, messageID);
    } else if (args[0] === "Event") {
        const eventName = args[1];
        if (!eventName) {
            return api.sendMessage('❎ Vui lòng nhập tên event cần tải lại hoặc sử dụng "all" để tải lại tất cả các events.', threadID, messageID);
        }
        if (global.client.events.has(eventName)) {
            global.client.events.delete(eventName);
        }
        reloadModule('events', eventName);
    } else if (args[0] == "unload") {
        if (args[1] == "Event") {
            const moduleName = args[2];
            unloadModule('events', moduleName);
        } else {
            const moduleName = args[1];
            if (!moduleName) {
                return api.sendMessage('❎ Vui lòng nhập tên module cần hủy.', threadID, messageID);
            }
            unloadModule('commands', moduleName);
        }
    } else {
        const moduleName = args[0];
        if (!moduleName) {
            return api.sendMessage('❎ Vui lòng nhập tên lệnh cần tải lại hoặc sử dụng "all" để tải lại tất cả các lệnh.', threadID, messageID);
        }
        if (global.client.commands.has(moduleName)) {
            global.client.commands.delete(moduleName);
        }
        reloadModule('commands', moduleName);
    }
};