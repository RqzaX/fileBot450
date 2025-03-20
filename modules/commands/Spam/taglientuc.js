module.exports.config = {
  name: "taglientuc",
  version: "1.0.0",
  hasPermssion: 1,
  credits: "Ntkhang",
  description: "Tag liên tục người bạn tag trong 5 lần\nCó thể gọi là gọi hồn người đó",
  commandCategory: "Spam",
  usages: "taglientuc @tag 10 1",
  cooldowns: 5,
  dependencies: {
      "fs-extra": "",
      "axios": ""
  }
};

module.exports.run = async function({ api, args, Users, event }) {
  function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
  }
  const { mentions, threadID, messageID } = event;
  function reply(body) {
      api.sendMessage(body, threadID, messageID);
  }
  if (!global.client.modulesTaglientuc) global.client.modulesTaglientuc = [];
  const dataTaglientuc = global.client.modulesTaglientuc;
  if (!dataTaglientuc.some(item => item.threadID == threadID)) dataTaglientuc.push({ threadID, targetID: [] });
  const thisTaglientuc = dataTaglientuc.find(item => item.threadID == threadID);

  if (args[0] == "stop") {
      if (args[1] == "all") {
          thisTaglientuc.targetID = [];
          return reply("✅ Đã tắt tag liên tục tất cả");
      } else {
          if (Object.keys(mentions).length == 0) return reply("❎ Hãy tag người bạn muốn dừng tag");
          let msg = "";
          for (let id in mentions) {
              const userName = mentions[id].replace("@", "");
              if (!thisTaglientuc.targetID.includes(id)) {
                  msg += `\n${userName} hiện tại không bị tag`;
              } else {
                  thisTaglientuc.targetID.splice(thisTaglientuc.targetID.findIndex(item => item == id), 1);
                  msg += `✅ Đã tắt tag liên tục: ${userName}`;
              }
          }
          return reply(msg);
      }
  } else {
      let solantag = args[args.length - 2];
      let time = args[args.length - 1];

      // Kiểm tra cú pháp
      if (Object.keys(mentions).length == 0) return reply("❎ Vui lòng tag người bạn muốn gọi hồn");
      if (!solantag || !time) return reply("❎ Thiếu tham số! Sử dụng: taglientuc @tag <số lần tag> <thời gian giữa các lần tag>");
      if (isNaN(solantag)) return reply("❎ Số lần tag phải là một con số");
      if (isNaN(time)) return reply("❎ Thời gian giữa mỗi lần tag phải là một con số");
      time = time * 1000;
      const target = Object.keys(mentions)[0];
      if (thisTaglientuc.targetID.includes(target)) return reply("❎ Người này đang được gọi hồn");

      thisTaglientuc.targetID.push(target);
      reply(`✅ Đã thêm ${mentions[target].replace("@", "")} vào danh sách tag liên tục\n🔄 Số lần tag là: ${solantag}\n⏰ Thời gian giữa các lần tag là ${time / 1000} giây`);

      const noidungtag = args.slice(0, args.length - 2).join(" ").replace("@", "");

      let i = 0;
      while (true) {
          await delay(time);
          if (i == solantag) {
              thisTaglientuc.targetID.splice(thisTaglientuc.targetID.findIndex(item => item == target), 1);
              break;
          }
          if (!global.client.modulesTaglientuc.find(item => item.threadID == threadID).targetID.includes(target)) break;
          await api.sendMessage({
              body: noidungtag,
              mentions: [{ id: target, tag: noidungtag }]
          }, threadID);
          i++;
      }
  }
};
