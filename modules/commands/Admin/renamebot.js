module.exports.config = {
    name: "rnbot",
    version: "1.0",
    hasPermssion: 2,
    Rent: 2,
    credits: "Niio-team (Vtuan)",
    description: "Set name bot all box",
    commandCategory: "Admin",
    usages: "",
    cooldowns: 5,
};

module.exports.run = async function ({ event, args, api, Threads }) {
    const { BOTNAME } = global.config;
    if (args[0] === "all") {
        const inputBotName = args.slice(1).join(" ") || BOTNAME || "Made by Niio-team";
        const botID = api.getCurrentUserID();
        const thread = await api.getThreadList(100, null, ['INBOX']);
        const threadIDs = [];
        thread.forEach(t => {
            if (t.isSubscribed && t.isGroup) {
                threadIDs.push(t.threadID);
                console.log(`threadID: ${t.threadID}`);
            }
        });
        for (let t of threadIDs) {
            let prefix = global.prefixTO[event.threadID]
            let nickname = `[ ${prefix} ] • ${inputBotName}`;
            await api.changeNickname(nickname, t, botID);
        }
    } else {
        const botID = api.getCurrentUserID();
        let prefix = global.prefixTO[event.threadID]
        const inputBotName = args.slice(0).join(" ") || BOTNAME || "Made by Niio-team";
        await api.changeNickname(`[ ${prefix} ] • ${inputBotName}`, event.threadID, botID);
    }
};
