const request = require("request");

module.exports.config = {
	name: "trans",
	version: "1.0.1",
	hasPermssion: 0,
	credits: "Niiozic",
	description: "Dịch văn bản",
	commandCategory: "Tiện ích",
	usages: "[en/ko/ja/vi] [Text]",
	cooldowns: 5,
	dependencies: {
		request: ""
	}
};

module.exports.run = async ({ api, event, args }) => {
	let content = args.join(" ");
	const { threadID, messageID } = event;

	if (content.length === 0 && event.type !== "message_reply") {
		return api.sendMessage("❎ Vui lòng nhập văn bản cần dịch.", threadID, messageID);
	}

	let translateThis;
	let lang;

	if (event.type === "message_reply") {
		translateThis = event.messageReply.body;
		if (content.indexOf("->") !== -1) {
			lang = content.substring(content.indexOf("->") + 3).trim();
		} else {
			lang = global.config.language;
		}
	} else {
		if (content.indexOf("->") === -1) {
			translateThis = content;
			lang = global.config.language;
		} else {
			translateThis = content.slice(0, content.indexOf("->")).trim();
			lang = content.substring(content.indexOf("->") + 3).trim();
		}
	}

	const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(translateThis)}`;
	
	request(url, (err, response, body) => {
		if (err) {
			return api.sendMessage("⚠️ Đã có lỗi xảy ra trong quá trình dịch.", threadID, messageID);
		}
		try {
			const retrieve = JSON.parse(body);
			let text = '';
			retrieve[0].forEach(item => {
				if (item[0]) {
					text += item[0];
				}
			});
			const fromLang = (retrieve[2] === retrieve[8][0][0]) ? retrieve[2] : retrieve[8][0][0];
			api.sendMessage(`🔄 Bản dịch: \n\n${text}\n\n✏️ Dịch từ ${fromLang} sang ${lang}`, threadID, messageID);
		} catch (parseError) {
			return api.sendMessage("⚠️ Đã có lỗi xảy ra khi xử lý kết quả dịch.", threadID, messageID);
		}
	});
};
