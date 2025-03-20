const path = require("path");
const fs = require("fs");

function getStarterPokemon(region) {
    const regionsPath = {
        Kanto: path.join(__dirname, "../regions/Kanto.json"),
        Alola: path.join(__dirname, "../regions/alola.json"),
        Kalos: path.join(__dirname, "../regions/kalos.json"),
        Isshu: path.join(__dirname, "../regions/Isshu/Unova.json")
    };

    if (!regionsPath[region]) {
        return { error: true, message: "Vùng không hợp lệ! Vui lòng chọn: Kanto, Alola, Kalos, Isshu." };
    }

    try {
        const data = JSON.parse(fs.readFileSync(regionsPath[region], "utf-8"));
        const starterPokemon = data.slice(0, 3); // Lấy 3 Pokémon đầu tiên
        return { error: false, data: starterPokemon };
    } catch (err) {
        return { error: true, message: `Lỗi khi xử lý vùng ${region}: ${err.message}` };
    }
}

module.exports = getStarterPokemon;
