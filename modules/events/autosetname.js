// const moment = require('moment');
// const fs = require('fs-extra');
// const DT = "./modules/commands/data/autosetname.json";

// module.exports.config = {
//     name: "autosetname",
//     eventType: ["log:subscribe"],
//     version: "1.0.3",
//     credits: "Niio-team (Vtuan)",
//     description: "Tự động set biệt danh thành viên mới"
// };

// module.exports.run = async function ({ api, event, Users }) {
//     try {
//         let read = await fs.readFile(DT, 'utf-8');
//         let Data = read ? JSON.parse(read) : [];
//         let threadEntry = Data.find(entry => entry.threadID === event.threadID);

//         if (threadEntry) {
//             const mj = event.logMessageData.addedParticipants.map(info => info.userFbId);
//             const sn = threadEntry.nameUser;

//             for (let id of mj) {
//                 try {
//                     let name = await Users.getNameUser(id);
//                     if (!name) {
//                         const userInfoAPI = await api.getUserInfo(id);
//                         name = userInfoAPI[id]?.name || "Unknown";
//                     }

//                     const Jd = moment(event.logMessageData.timestamp).format('DD-MM-YYYY HH:mm:ss');
//                     console.log(`Đã đổi biệt danh cho người dùng: ${id}`);

//                     // Đợi một chút giữa các lần đổi biệt danh để tránh quá tải
//                     await new Promise(resolve => setTimeout(resolve, 500));
//                     await api.changeNickname(`${sn} ${name} || ${Jd}`, id, event.threadID);
//                 } catch (error) {
//                     console.error(`Error setting nickname for user ID ${id}:`, error);
//                 }
//             }
//         }
//     } catch (error) {
//         console.error("Error in autosetname module:", error);
//     }
// };


// thích dùng cái nào thì dùng! muốn dùng cái này thì hủy // của lệnh bên dưới đi và thêm // vào lệnh ở bên trên!
module.exports.config = {
	name: "autosetname",
	eventType: ["log:subscribe"],
	version: "1.0.3",
	credits: "D-Jukie",
	description: "Tự động set biệt danh thành viên mới"
};

module.exports.run = async function ({ api, event, Users }) {
	const { threadID } = event;
	var memJoin = event.logMessageData.addedParticipants//.map(info => info.userFbId)
	for (let { userFbId: idUser, fullName } of memJoin) {
		const { readFileSync, writeFileSync } = require("fs-extra");
		const { join } = require("path")
		const pathData = join("./modules/commands", "data", "autosetname.json");
		var dataJson = JSON.parse(readFileSync(pathData, "utf-8"));
		var thisThread = dataJson.find(item => item.threadID == threadID) || { threadID, nameUser: [] };
		if (thisThread.nameUser.length == 0) return
		if (thisThread.nameUser.length != 0) {
			var setName = thisThread.nameUser[0]
			await new Promise(resolve => setTimeout(resolve, 1000));
			//var namee1 = await api.getUserInfo(idUser)
			//var namee = namee1[idUser].name
			api.changeNickname(`${setName
				.replace(/{name}/g, fullName)
				.replace(/{time}/g, require('moment-timezone')().tz('Asia/Ho_Chi_Minh').format('HH:MM:ss | DD/MM/YYYY'))}`, threadID, idUser);
		}
	}
	return api.sendMessage(`✅ Thực thi auto setname cho thành viên mới`, threadID, event.messageID)
}