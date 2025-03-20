const fs = require('fs-extra');

module.exports.config = {
    name: "qtvonly",
    version: "1.0.0",
    hasPermssion: 1,
    Rent: 2,
    credits: "Niio-team (Vtuan)",
    description: "Cấm thành viên dùng bot",
    commandCategory: "Nhóm",
    usages: "No",
    cooldowns: 0
};

const DT = "./modules/data/data.json";
if (!fs.existsSync(DT)) {
    fs.writeFileSync(DT, JSON.stringify([]));
}
module.exports.run = async ({ api, event, args }) => {
    const { threadID } = event;
    let read = await fs.readFile(DT, 'utf-8');
    let Dataqtv = read ? JSON.parse(read) : [];
    let threadEntry = Dataqtv.find(entry => entry.threadID === threadID);
    Dataqtv = threadEntry ? Dataqtv.filter(entry => entry.threadID !== threadID) : [...Dataqtv, { threadID }];
    await fs.writeFile(DT, JSON.stringify(Dataqtv, null, 4), 'utf-8');
    api.sendMessage(threadEntry ? "✅ Đã tắt chế độ only" : "✅ Đã bật chế độ only", threadID);
}
