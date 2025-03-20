const path = require("path");
const fs = require("fs-extra");

module.exports.config = {
    name: "poke",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Vtuan",
    description: "Khởi đầu hành trình Pokemon",
    commandCategory: "Game",
    usages: "[create | -c] [start | -s <region>]",
    cooldowns: 0
};

const filePath = path.join(__dirname, "/pokemon/data");
const getStarterPokemon = require("./pokemon/handle/start");

async function crData(file, id) {
    const data = {
        userID: id,
        region: null,
        selectedPokemon: null,
        coins: 0,
        bag: {
            ball: [],
            stone: [],
            food: []
        },
        pokemonList: [],
        dailyFinds: 20,
        battleStats: {
            totalBattles: 0,
            wins: 0,
            losses: 0,
            badges: 0
        },
        daily: null,
        history: [],

    };

    try {
        const dir = path.dirname(file);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        await fs.promises.writeFile(file, JSON.stringify(data, null, 4), "utf-8");
        return `File JSON đã được tạo thành công tại: ${file}`;
    } catch (error) {
        throw new Error(`Lỗi khi tạo file JSON: ${error.message}`);
    }
}

async function updateData(file, updates) {
    try {
        const data = await fs.promises.readFile(file, "utf-8");
        const json = JSON.parse(data);
        Object.assign(json, updates);
        await fs.promises.writeFile(file, JSON.stringify(json, null, 4), "utf-8");
        return json;
    } catch (error) {
        throw new Error(`Lỗi khi cập nhật file JSON: ${error.message}`);
    }
}

async function readData(file) {
    try {
        const data = await fs.promises.readFile(file, "utf-8");
        return JSON.parse(data);
    } catch (error) {
        throw new Error(`Lỗi khi đọc file JSON: ${error.message}`);
    }
}


const regions = ["Kanto", "Unova", "Kalos", "Alola"];
module.exports.run = async ({ api, event, args }) => {
    const file = `${filePath}/${event.senderID}.json`;
    const id = event.senderID;

    switch (args[0]) {
        case "create":
        case "-c": {
            if (fs.existsSync(file)) return api.sendMessage("Bạn đã đăng ký trước đó! Vui lòng sử dụng lệnh 'poke -s' để bắt đầu hành trình.", event.threadID);
            await crData(file, id);
            api.sendMessage("Đăng ký thành công! Vui lòng sử dụng lệnh 'poke -s <region>' để bắt đầu hành trình.", event.threadID);
            break;
        }
        case "start":
        case "-s": {
            if (!fs.existsSync(file)) return api.sendMessage("Bạn chưa đăng ký! Vui lòng sử dụng lệnh 'poke -c' để đăng ký.", event.threadID);
            let userData;
            try {
                userData = await readData(file);
                if (userData.region) {
                    return api.sendMessage("Bạn đã chọn vùng rồi! Không thể thay đổi vùng nữa.", event.threadID);
                }
            } catch (error) {
                return api.sendMessage("Không thể đọc dữ liệu người dùng. Vui lòng kiểm tra lại.", event.threadID);
            }

            const regionList = regions.map((region, index) => `${index + 1}. ${region}`).join("\n");
            api.sendMessage(`Vui lòng chọn vùng mà bạn muốn bắt đầu hành trình:\n${regionList}`, event.threadID, (err, info) => {
                if (err) return console.error(err);
                global.client.handleReply.push({
                    name: module.exports.config.name,
                    author: event.senderID,
                    messageID: info.messageID,
                    userData,
                    type: "selectRegion"
                });
            });
            break;
        }
        case "bag":
        case "-b": {
            if (!fs.existsSync(file)) return api.sendMessage("Bạn chưa đăng ký! Vui lòng sử dụng lệnh 'poke -c' để đăng ký.", event.threadID);
            let userData;
            try {
                userData = await readData(file);
            } catch (error) {
                return api.sendMessage("Không thể đọc dữ liệu người dùng. Vui lòng kiểm tra lại.", event.threadID);
            }

            const bagItems = [];
            for (const category in userData.bag) {
                if (userData.bag[category].length > 0) {
                    bagItems.push(`${category.toUpperCase()}:`);
                    userData.bag[category].forEach((item, index) => {
                        bagItems.push(`  ${index + 1}. ${item.name} - ${item.quantity} cái`);
                    });
                }
            }

            if (bagItems.length === 0) {
                return api.sendMessage("Túi của bạn đang trống.", event.threadID);
            }

            api.sendMessage(`Túi của bạn:\n${bagItems.join("\n")}`, event.threadID);
            break;
        }

        case "shop":
        case "-sh": {
            const shopDataPath = path.join(__dirname, "pokemon", "shop.json");
            try {
                const shopData = JSON.parse(fs.readFileSync(shopDataPath, "utf8"));
                const categories = {
                    "pokeBalls": "Shop PokeBalls",
                    "evolutionStages": "Shop Đá Tiến Hóa",
                    "food": "Shop Thức Ăn"
                };
                const shopList = Object.keys(shopData).map((key, index) => `${index + 1}. ${categories[key] || `Shop ${key}`}`).join("\n");

                return api.sendMessage(`Danh sách cửa hàng:\n${shopList}`, event.threadID, (err, info) => {
                    if (err) return console.error(err);
                    global.client.handleReply.push({
                        name: module.exports.config.name,
                        author: event.senderID,
                        messageID: info.messageID,
                        shopData,
                        type: "shop"
                    });
                });

            } catch (error) {
                return api.sendMessage(`Lỗi khi đọc dữ liệu cửa hàng: ${error.message}`, event.threadID, event.messageID);
            }
        }
        case "daily":
        case "-d": {
            if (!fs.existsSync(file)) return api.sendMessage("Bạn chưa đăng ký! Vui lòng sử dụng lệnh 'poke -c' để đăng ký.", event.threadID);
            let userData;
            try {
                userData = await readData(file);
            } catch (error) {
                return api.sendMessage("Không thể đọc dữ liệu người dùng. Vui lòng kiểm tra lại.", event.threadID);
            }

            const now = new Date();
            const lastDaily = new Date(userData.daily);
            const diffTime = Math.abs(now - lastDaily);
            const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

            if (diffHours < 24) {
                return api.sendMessage(`Bạn đã nhận tiền hàng ngày rồi! Vui lòng quay lại sau ${24 - diffHours} giờ nữa.`, event.threadID);
            }

            userData.coins += 100;
            userData.daily = now.toISOString();
            try {
                await fs.promises.writeFile(file, JSON.stringify(userData, null, 4), "utf-8");
                api.sendMessage("Bạn đã nhận được 100 coins! Hãy quay lại sau 24 giờ để nhận thêm.", event.threadID);
            } catch (error) {
                return api.sendMessage("Lỗi khi cập nhật dữ liệu người dùng. Vui lòng thử lại.", event.threadID);
            }
            break;
        }
        case "info":
        case "-i": {
            if (!fs.existsSync(file)) return api.sendMessage("Bạn chưa đăng ký! Vui lòng sử dụng lệnh 'poke -c' để đăng ký.", event.threadID);
            let userData;
            try {
                userData = await readData(file);
            } catch (error) {
                return api.sendMessage("Không thể đọc dữ liệu người dùng. Vui lòng kiểm tra lại.", event.threadID);
            }

            const pokemonList = userData.pokemonList.map((pokemon, index) => `${index + 1}. ${pokemon.name}`).join("\n");
            if (pokemonList.length === 0) {
                return api.sendMessage("Bạn chưa có Pokemon nào.", event.threadID);
            }

            api.sendMessage(`Danh sách Pokemon của bạn:\n${pokemonList}`, event.threadID, (err, info) => {
                if (err) return console.error(err);
                global.client.handleReply.push({
                    name: module.exports.config.name,
                    author: event.senderID,
                    messageID: info.messageID,
                    userData,
                    type: "selectPokemonInfo"
                });
            });
            break;
        }
        default:
            api.sendMessage("Lệnh không hợp lệ. Vui lòng sử dụng 'poke -c' để đăng ký hoặc 'poke -s <region>' để bắt đầu hành trình.", event.threadID);
            break;
    }
};

module.exports.handleReply = async ({ api, event, handleReply }) => {
    const { author, type, userData } = handleReply;
    const file = `${filePath}/${author}.json`;

    if (event.senderID !== author) return;

    switch (type) {
        case "selectRegion": {
            const selectedRegionIndex = parseInt(event.body.trim());
            if (isNaN(selectedRegionIndex) || selectedRegionIndex < 1 || selectedRegionIndex > regions.length) {
                const regionList = regions.map((region, index) => `${index + 1}. ${region}`).join("\n");
                return api.sendMessage(`Số thứ tự không hợp lệ! Vui lòng chọn 1 trong các vùng sau:\n${regionList}`, event.threadID);
            }
            const selectedRegion = regions[selectedRegionIndex - 1];
            userData.region = selectedRegion
            fs.writeFile(file, JSON.stringify(userData, null, 2), 'utf8', (err) => {
                if (err) return console.error('Lỗi khi ghi file:', err);
                console.log('Dữ liệu đã được lưu thành công!');
            });
            const starterPokemon = getStarterPokemon(selectedRegion);
            const pokemonList = starterPokemon.data.map((pokemon, index) => `${index + 1}. ${pokemon.name}`).join("\n");
            api.sendMessage(`Bạn đã chọn vùng ${selectedRegion}. Vui lòng reply tên Pokemon khởi đầu mà bạn muốn chọn:\n${pokemonList}`, event.threadID, (err, info) => {
                if (err) return console.error(err);
                global.client.handleReply.push({
                    name: module.exports.config.name,
                    author: event.senderID,
                    messageID: info.messageID,
                    type: "selectPokemon",
                    region: selectedRegion
                });
            });
            break;
        }
        case "selectPokemon": {
            const { region } = handleReply;
            const selectedPokemonIndex = parseInt(event.body.trim());
            const starterPokemon = getStarterPokemon(region);
            if (isNaN(selectedPokemonIndex) || selectedPokemonIndex < 1 || selectedPokemonIndex > starterPokemon.data.length) {
                const pokemonList = starterPokemon.data.map((pokemon, index) => `${index + 1}. ${pokemon.name}`).join("\n");
                return api.sendMessage(`Số thứ tự không hợp lệ! Vui lòng chọn 1 trong các Pokemon sau:\n${pokemonList}`, event.threadID);
            }
            const selectedPokemon = starterPokemon.data[selectedPokemonIndex - 1];
            fs.readFile(file, 'utf8', (err, fileData = "{}") => {
                let userData = {};
                try { userData = JSON.parse(fileData); } catch (e) { }
                userData.pokemonList = userData.pokemonList || [];
                userData.pokemonList.push({
                    name: selectedPokemon.name,
                    type: selectedPokemon.type,
                    skills: selectedPokemon.skills,
                    stats: selectedPokemon.stats,
                    affection: 0
                });
                fs.writeFile(file, JSON.stringify(userData, null, 2), 'utf8', (err) => {
                    if (err) return console.error('Lỗi khi ghi file:', err);
                    console.log('Dữ liệu đã được lưu thành công!');
                });
            });

            api.sendMessage(`Bạn đã chọn thành công ${selectedPokemon.name}! Chúc bạn có một cuộc phiêu lưu đầy thú vị!`, event.threadID);
            break;
        }
        case "shop": {
            const { shopData } = handleReply;
            const selec = parseInt(event.body.trim());
            if (isNaN(selec) || selec < 1 || selec > Object.keys(shopData).length) {
                return api.sendMessage("Số thứ tự không hợp lệ! Vui lòng chọn 1 trong các cửa hàng sau.", event.threadID);
            }
            const selectedShop = Object.keys(shopData)[selec - 1];
            let shopItems = "";

            if (selectedShop === "pokeBalls") {
                shopItems = shopData[selectedShop].map((item, index) => `${index + 1}. ${item.name} - ${item.price} coins`).join("\n");
                api.sendMessage(`Danh sách vật phẩm trong cửa hàng:\n${shopItems}`, event.threadID, (err, info) => {
                    if (err) return console.error(err);
                    global.client.handleReply.push({
                        name: module.exports.config.name,
                        author: event.senderID,
                        messageID: info.messageID,
                        shopData,
                        selectedShop,
                        type: "selectItem"
                    });
                });
            } else if (selectedShop === "evolutionStages") {
                shopItems = shopData[selectedShop].map((item, index) => `${index + 1}. ${item.symbol} - ${item.description} - ${item.price} coins`).join("\n");
                api.sendMessage(`Danh sách vật phẩm trong cửa hàng:\n${shopItems}`, event.threadID, (err, info) => {
                    if (err) return console.error(err);
                    global.client.handleReply.push({
                        name: module.exports.config.name,
                        author: event.senderID,
                        messageID: info.messageID,
                        shopData,
                        selectedShop,
                        type: "selectItem"
                    });
                });
            } else if (selectedShop === "food") {
                const foodTypes = Object.keys(shopData[selectedShop]).map((type, index) => `${index + 1}. ${type}`).join("\n");
                api.sendMessage(`Vui lòng chọn loại thức ăn:\n${foodTypes}`, event.threadID, (err, info) => {
                    if (err) return console.error(err);
                    global.client.handleReply.push({
                        name: module.exports.config.name,
                        author: event.senderID,
                        messageID: info.messageID,
                        shopData,
                        selectedShop,
                        type: "selectFoodType"
                    });
                });
            }
            break;
        }
        case "selectFoodType": {
            const { shopData, selectedShop } = handleReply;
            const selec = parseInt(event.body.trim());
            const foodTypes = Object.keys(shopData[selectedShop]);
            if (isNaN(selec) || selec < 1 || selec > foodTypes.length) {
                const foodTypeList = foodTypes.map((type, index) => `${index + 1}. ${type}`).join("\n");
                return api.sendMessage(`Số thứ tự không hợp lệ! Vui lòng chọn 1 trong các loại thức ăn sau:\n${foodTypeList}`, event.threadID);
            }
            const selectedFoodType = foodTypes[selec - 1];
            const foodItems = shopData[selectedShop][selectedFoodType].map((item, index) => `${index + 1}. ${item.name} - ${item.price} coins`).join("\n");
            api.sendMessage(`Danh sách vật phẩm trong cửa hàng ${selectedFoodType}:\n${foodItems}`, event.threadID, (err, info) => {
                if (err) return console.error(err);
                global.client.handleReply.push({
                    name: module.exports.config.name,
                    author: event.senderID,
                    messageID: info.messageID,
                    shopData,
                    selectedShop,
                    selectedFoodType,
                    type: "selectItem"
                });
            });
            break;
        }
        case "selectItem": {
            const { shopData, selectedShop, selectedFoodType } = handleReply;
            const input = event.body.trim().split(" ");
            const selec = parseInt(input[0]);
            const quantity = parseInt(input[1]) || 1;
            let items;
            if (selectedShop === "food") {
                items = shopData[selectedShop][selectedFoodType];
            } else {
                items = shopData[selectedShop];
            }
            if (isNaN(selec) || selec < 1 || selec > items.length) {
                return api.sendMessage("Số thứ tự không hợp lệ! Vui lòng chọn lại.", event.threadID);
            }
            if (isNaN(quantity) || quantity < 1) {
                return api.sendMessage("Số lượng không hợp lệ! Vui lòng chọn lại.", event.threadID);
            }
            const selectedItem = items[selec - 1];
            let userData;
            try {
                userData = await readData(file);
            } catch (error) {
                return api.sendMessage("Không thể đọc dữ liệu người dùng. Vui lòng kiểm tra lại.", event.threadID);
            }
            const totalPrice = selectedItem.price * quantity;
            if (userData.coins < totalPrice) {
                return api.sendMessage("Bạn không đủ coins để mua vật phẩm này.", event.threadID);
            }
            userData.coins -= totalPrice;

            let bagCategory;
            if (selectedShop === "pokeBalls") {
                bagCategory = userData.bag.ball;
            } else if (selectedShop === "evolutionStages") {
                bagCategory = userData.bag.stone;
            } else if (selectedShop === "food") {
                bagCategory = userData.bag.food;
            }

            const existingItem = bagCategory.find(item => item.name === selectedItem.name);
            if (existingItem) {
                existingItem.quantity = (existingItem.quantity || 1) + quantity;
            } else {
                selectedItem.quantity = quantity;
                bagCategory.push(selectedItem);
            }

            try {
                await fs.promises.writeFile(file, JSON.stringify(userData, null, 4), "utf-8");
                api.sendMessage(`Bạn đã mua thành công ${quantity} ${selectedItem.name}!`, event.threadID);
            } catch (error) {
                return api.sendMessage("Lỗi khi cập nhật dữ liệu người dùng. Vui lòng thử lại.", event.threadID);
            }
            break;
        }
        case "selectPokemonInfo": {
            const selectedPokemonIndex = parseInt(event.body.trim());
            if (isNaN(selectedPokemonIndex) || selectedPokemonIndex < 1 || selectedPokemonIndex > userData.pokemonList.length) {
                const pokemonList = userData.pokemonList.map((pokemon, index) => `${index + 1}. ${pokemon.name}`).join("\n");
                return api.sendMessage(`Số thứ tự không hợp lệ! Vui lòng chọn 1 trong các Pokemon sau:\n${pokemonList}`, event.threadID);
            }
            const selectedPokemon = userData.pokemonList[selectedPokemonIndex - 1];
            const pokemonInfo = `
Thông tin Pokemon:
Tên: ${selectedPokemon.name}
Loại: ${selectedPokemon.type.join(", ")}
Kỹ năng: ${selectedPokemon.skills.join(", ")}
Chỉ số:
  - Máu: ${selectedPokemon.stats.HP}
  - Sức tấn công (attack): ${selectedPokemon.stats.ATK}
  - Tốc độ: ${selectedPokemon.stats.SPEED}
Thân mật: ${selectedPokemon.affection}/150
            `;
            api.sendMessage(pokemonInfo.trim(), event.threadID);
            break;
        }
    }
};
