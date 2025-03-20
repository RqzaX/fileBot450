module.exports.config = {
    name: "mine",
    version: "7.5.0",
    hasPermission: 0,
    credits: "D-Jukie - Heo Rừng rmk Niiozic",
    description: "Minecraft game system",
    commandCategory: "Game",
    usages: "[command]",
    cooldowns: 0
};

module.exports.onLoad = function () {
    try {
        // Load config and API URLs for various items
        global.apiUrls = {
            shop: "https://api.example.com/shop",         // API for shop items
            weapons: "https://api.example.com/weapons",   // API for weapons
            pickaxes: "https://api.example.com/pickaxes", // API for pickaxes
            health: "https://api.example.com/health",     // API for health items
            enchant: "https://api.example.com/enchant",   // API for enchantments
            monsters: "https://api.example.com/monsters", // API for monsters
            locations: "https://api.example.com/locations"// API for locations
        };
    } catch (e) {
        console.log(e);
    }
};

module.exports.run = async function ({ api, event, args }) {
    var send = (msg, cb) => api.sendMessage(msg, event.threadID, cb, event.messageID);
    
    try {
        if (args.length === 0) return send("Vui lòng nhập lệnh! Ví dụ: 'mine', 'shop', 'kill'.", event.messageID);
        
        switch (args[0].toLowerCase()) {
            case "shop":
                return await showShopMenu(api, event);
            case "mine":
                return await mineResources(api, event);
            case "kill":
                return await killMonsters(api, event);
            case "guide":
                return await showGuide(api, event);
            default:
                return send("Lệnh không hợp lệ, vui lòng kiểm tra lại.", event.messageID);
        }
    } catch (e) {
        console.log(e);
    }
};

async function showShopMenu(api, event) {
    try {
        // Gọi API shop
        const response = await axios.get(global.apiUrls.shop);
        
        if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
            return api.sendMessage("Lỗi: Không có món đồ nào trong cửa hàng hoặc API không trả về dữ liệu hợp lệ!", event.threadID);
        }

        let message = "[SHOP MENU]\n\n";
        response.data.forEach(item => {
            if (item.name && item.price) {
                message += `${item.name} - ${item.price} VND\n`;
            }
        });
        
        api.sendMessage(message, event.threadID, event.messageID);
    } catch (e) {
        console.log(e);
        api.sendMessage("Lỗi khi tải dữ liệu shop. Xin vui lòng thử lại sau!", event.threadID);
    }
}

async function mineResources(api, event) {
    try {
        // Gọi API pickaxes (cúp)
        const response = await axios.get(global.apiUrls.pickaxes);
        
        if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
            return api.sendMessage("Lỗi: Không có cúp nào trong API!", event.threadID);
        }
        
        // Chọn cúp và đào ngẫu nhiên
        let message = "[MINE MENU]\n\nChọn một cúp để đào tài nguyên:\n";
        response.data.forEach((pickaxe, index) => {
            message += `${index + 1}. ${pickaxe.name} - ${pickaxe.speed} sec/đào - Giá: ${pickaxe.price} VND\n`;
        });
        
        api.sendMessage(message, event.threadID, event.messageID);
    } catch (e) {
        console.log(e);
        api.sendMessage("Lỗi khi tải dữ liệu đào tài nguyên. Xin vui lòng thử lại sau!", event.threadID);
    }
}

async function killMonsters(api, event) {
    try {
        // Gọi API quái vật
        const response = await axios.get(global.apiUrls.monsters);
        
        if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
            return api.sendMessage("Lỗi: Không có quái vật nào trong API!", event.threadID);
        }
        
        // Chọn quái vật và giết ngẫu nhiên
        let message = "[KILL MONSTER MENU]\n\nChọn quái vật để chiến đấu:\n";
        response.data.forEach((monster, index) => {
            message += `${index + 1}. ${monster.name} - HP: ${monster.hp} - Kinh nghiệm: ${monster.exp}\n`;
        });
        
        api.sendMessage(message, event.threadID, event.messageID);
    } catch (e) {
        console.log(e);
        api.sendMessage("Lỗi khi tải dữ liệu quái vật. Xin vui lòng thử lại sau!", event.threadID);
    }
}

async function showGuide(api, event) {
    const guideMessage = `
    [HƯỚNG DẪN GAME MINECRAFT]
    - Lệnh 'mine': Đào tài nguyên với các loại cúp.
    - Lệnh 'kill': Giết quái vật và nhận phần thưởng.
    - Lệnh 'shop': Mua vũ khí, cúp, máu, enchant và các vật phẩm khác trong cửa hàng.
    - Các lệnh khác sẽ được cập nhật sau.
    `;
    api.sendMessage(guideMessage, event.threadID, event.messageID);
}