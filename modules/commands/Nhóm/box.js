module.exports.config = {
	name: "box",
	version: "1.0.0",
	hasPermssion: 0,
	Rent: 1,
	credits: "Niio-team (Vtuan)",
	description: "Các cài đặt của nhóm chat.",
	commandCategory: "Nhóm",
	usages: "[name/emoji/admin/image/info]",
	cooldowns: 1,
	dependencies: {
		"request": "",
		"fs-extra": ""
	}
};

module.exports.run = async ({ api, event, args, Threads, Users }) => {
	const fs = require("fs-extra")
	const request = require("request")

	if (args.length == 0) {
		return api.sendMessage(
			`Bạn có thể dùng:\n!box emoji [icon]\n\n!box name [tên box cần đổi]\n\n!box image [rep một ảnh bất kì cần đặt thành ảnh box]\n\n!box admin [tag] => nó sẽ đưa qtv cho người được tag\n\n!box info => Toàn bộ thông tin của nhóm !`,
			event.threadID,
			event.messageID
		);
	}

	const threadInfo = await Threads.getData(event.threadID);
	const víp = threadInfo.threadInfo;

	switch (args[0]) {
		case "name":
			const newName = args.slice(1).join(" ") || event.messageReply.body;
			api.setTitle(newName, event.threadID);
			break;

		case "emoji":
			const emoji = args[1] || event.messageReply.body;
			api.changeThreadEmoji(emoji, event.threadID);
			break;

		case "me":
			if (args[1] == "admin") {
				const isAdmin = víp.adminIDs.some(el => el.id == api.getCurrentUserID());

				if (!isAdmin) {
					api.sendMessage("BOT cần ném quản trị viên để dùng ?", event.threadID, event.messageID);
				} else if (!global.config.ADMINBOT.includes(event.senderID)) {
					api.sendMessage("Quyền hạn lồn ?", event.threadID, event.messageID);
				} else {
					api.changeAdminStatus(event.threadID, event.senderID, true);
				}
			}
			break;

		case "admin":
			const tagID = event.messageReply ? event.messageReply.senderID : (args.join().indexOf('@') !== -1 ? Object.keys(event.mentions)[0] : args[1]);
			const isUserAdmin = víp.adminIDs.some(el => el.id == tagID);
			const isBotAdmin = víp.adminIDs.some(el => el.id == api.getCurrentUserID());
			const isSenderAdmin = víp.adminIDs.some(el => el.id == event.senderID);

			if (!isSenderAdmin) {
				return api.sendMessage("Mày đéo phải quản trị viên box ?", event.threadID, event.messageID);
			}
			if (!isBotAdmin) {
				return api.sendMessage("Không ném quản trị viên dùng con cặc ?", event.threadID, event.messageID);
			}
			if (!isUserAdmin) {
				api.changeAdminStatus(event.threadID, tagID, true);
			} else {
				api.changeAdminStatus(event.threadID, tagID, false);
			}
			break;

		case "image":
			if (event.type !== "message_reply" || !event.messageReply.attachments || event.messageReply.attachments.length !== 1) {
				return api.sendMessage("❌ Bạn phải reply một audio, video, ảnh nào đó", event.threadID, event.messageID);
			}
			const callback = () => api.changeGroupImage(fs.createReadStream(__dirname + "/cache/1.png"), event.threadID, () => fs.unlinkSync(__dirname + "/cache/1.png"));
			request(encodeURI(event.messageReply.attachments[0].url)).pipe(fs.createWriteStream(__dirname + '/cache/1.png')).on('close', callback);
			break;

		case "info":
			const totalMembers = víp.participantIDs.length;
			const admins = await Promise.all(víp.adminIDs.map(admin => Users.getNameUser(admin.id)));
			const adminList = admins.join('\n• ');

			const numMales = víp.userInfo.filter(user => user.gender === 'MALE').length;
			const numFemales = víp.userInfo.filter(user => user.gender === 'FEMALE').length;
			const numBede = víp.userInfo.filter(user => user.gender !== 'MALE' && user.gender !== 'FEMALE').length;

			const approvalMode = víp.approvalMode ? '✅ Bật' : '❎ Tắt';
			const infoMessage = `
📋 Thông tin nhóm
━━━━━━━━━━━━━━━━━━━━━━
Tên box: ${víp.threadName}
ID Box: ${víp.threadID}
Phê duyệt: ${approvalMode}
Link join: ${víp.inviteLink.enable ? `Bật\n${víp.inviteLink.link}` : 'Tắt'}
Emoji: ${víp.emoji ? víp.emoji : 'like'}
━━━━━━━━━━━━━━━━━━━━━━
👥 Thông tin thành viên
- Tổng số thành viên: ${totalMembers}
  👨‍🦰 Nam: ${numMales} thành viên
  👩‍🦰 Nữ: ${numFemales} thành viên
  👩‍❤️‍👨 Bê đê: ${numBede} thành viên
━━━━━━━━━━━━━━━━━━━━━━
🕵️‍♂️ Quản trị viên (${víp.adminIDs.length})
${adminList}`;
			if (víp.imageSrc) {
				const callbackInfo = () => api.sendMessage({ body: infoMessage, attachment: fs.createReadStream(__dirname + '/cache/1.png') }, event.threadID, () => fs.unlinkSync(__dirname + '/cache/1.png'), event.messageID);
				request(encodeURI(víp.imageSrc)).pipe(fs.createWriteStream(__dirname + '/cache/1.png')).on('close', callbackInfo);
			} else {
				api.sendMessage(infoMessage, event.threadID, event.messageID);
			}
			break;
	}
};
