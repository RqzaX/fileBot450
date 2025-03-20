const fs = require('fs');
const logger = require("./log");
const path = require('path');
const fileReadModules = path.resolve('./modules/commands/');

function readModules(fileReadModules) {
    const folders = fs.readdirSync(fileReadModules);
    let mdl = [];
    for (let folder of folders) {
        const fullPath = path.join(fileReadModules, folder);
        if (fs.lstatSync(fullPath).isDirectory()) {
            const files = fs.readdirSync(fullPath).filter(file => file.endsWith('.js'));
            for (let file of files) {
                const filePath = path.join(fullPath, file);
                mdl.push(filePath);
            }
        }
    }
    return mdl;
}

function ensureDirectoryExists(directory) {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
}

module.exports = async (api, models) => {
    global.loadMdl = function (mdl) {
        if (mdl === "commands") {
            logger("COMMANDS", "[ LOADING ]");
            const md = readModules(fileReadModules);
            const folders = new Set(md.map(filePath => path.dirname(filePath)));

            const loadedFolders = []; // Mảng để lưu các thư mục đã tải thành công

            for (let folder of folders) {
                let folderLoaded = false;

                for (let x of md.filter(filePath => path.dirname(filePath) === folder)) {
                    try {
                        const mdlModule = require(`${x}`);
                        if (!mdlModule.config || !mdlModule.run || !mdlModule.config.commandCategory) {
                            logger(`Invalid module format: ${x}`, "error");
                            continue;
                        }
                        if (global.client.commands.has(mdlModule.config.name || "")) {
                            logger(`Duplicate module name: ${mdlModule.config.name}`, "error");
                            continue;
                        }

                        const commandCategoryFolder = path.join(fileReadModules, mdlModule.config.commandCategory);
                        ensureDirectoryExists(commandCategoryFolder);
                        const currentFolder = path.dirname(x);
                        let newFilePath = x;

                        if (currentFolder !== commandCategoryFolder) {
                            newFilePath = path.join(commandCategoryFolder, path.basename(x));
                            fs.renameSync(x, newFilePath);
                        }

                        delete require.cache[require.resolve(newFilePath)];
                        const updatedModule = require(newFilePath);
                        if (updatedModule.onLoad) updatedModule.onLoad(api, models);
                        global.client.commands.set(updatedModule.config.name, updatedModule);

                        folderLoaded = true;
                    } catch (error) {
                        logger(`Error loading module: ${x}\nDetails: ${error.message}`, "error");
                        continue;
                    }
                }

                if (folderLoaded) {
                    loadedFolders.push(path.basename(folder)); // Thêm tên thư mục vào mảng
                }
            }

            if (loadedFolders.length > 0) {
                logger(`Successfully loaded folders: ${loadedFolders.join(", ")}`, "[ SUCCESS ]");
            }
        }
        else if (mdl === "events") {
            const modules = fs.readdirSync(path.join(`./modules/events`))
                .filter(module => module.endsWith('.js'));
            let loadedCount = 0;

            for (let module of modules) {
                const mdlModule = require(`../modules/events/${module}`);
                if (!mdlModule.config || !mdlModule.config.name || !mdlModule.config.eventType || !mdlModule.run) {
                    logger(`Invalid module format: ${module}`, "error");
                    continue;
                }
                if (global.client.events.has(mdlModule.config.name || "")) {
                    logger(`Duplicate module name: ${module}`, "error");
                    continue;
                }
                if (mdlModule.onLoad) mdlModule.onLoad(api, models);
                global.client.events.set(mdlModule.config.name, mdlModule);
                loadedCount++;
            }
            logger(`Successfully loaded ${loadedCount} events`, "[ SUCCESS ]");
        } else if (mdl == "noprefix") {
            const modules = fs.readdirSync(path.join(`./modules/noprefix`))
                .filter(module => module.endsWith('.js'));
            let loadedCount = 0;

            for (let module of modules) {
                const mdlModule = require(`../modules/noprefix/${module}`);
                if (!mdlModule.config || !mdlModule.config.name || !mdlModule.run) {
                    logger(`Invalid module format: ${module}`, "error");
                    continue;
                }
                if (global.client.NPF_commands.has(mdlModule.config.name || "")) {
                    logger(`Duplicate module name: ${module}`, "error");
                    continue;
                }
                if (mdlModule.onLoad) mdlModule.onLoad(api, models);
                global.client.NPF_commands.set(mdlModule.config.name, mdlModule);
                loadedCount++;
            }
            logger(`Successfully loaded ${loadedCount} noprefix modules`, "[ SUCCESS ]");
        }
    };

    global.loadMdl("commands");
    global.loadMdl("events");
    global.loadMdl("noprefix");
};
