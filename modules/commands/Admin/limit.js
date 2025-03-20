exports.config = {
    name: 'limit',
    version: '0.0.1',
    hasPermssion: 2,
    credits: 'DC-Nam',
    description: 'Bật tắt vô hiệu hoá nhóm mesenger dùng nhóm lệnh bot',
    commandCategory: 'Admin',
    usages: '[]',
    cooldowns: 3
};
let fs = require('fs');

let path = './modules/data/disable-command.json';
let data = {};
let save = () => fs.writeFileSync(path, JSON.stringify(data));

if (!fs.existsSync(path)) save(); data = JSON.parse(fs.readFileSync(path));

exports.run = o => {
    let {
        threadID: tid,
        messageID: mid,
    } = o.event;
    let send = (msg, callback) => o.api.sendMessage(msg, tid, callback, mid);
    let cmds = [...global.client.commands.values()];
    let cmd_categorys = Object.keys(cmds.reduce((o, $) => (o[$.config.commandCategory] = 0, o), {}));

    if (!data[tid]) data[tid] = {};

    send(`[ Cấm Sử Dụng Nhóm Lệnh ]\n\n${cmd_categorys.map(($, i) => `${i + 1}. ${$}: ${!data[tid][$] ? 'off' : 'on'}`).join('\n')}\n\n📌 Reply tin nhắn này kèm STT để bật tắt vô hiệu hoá nhóm lệnh`, (err, res) => (res.name = exports.config.name, res.cmd_categorys = cmd_categorys, res.o = o, global.client.handleReply.push(res)))
};
exports.handleReply = o => {
    let _ = o.handleReply;
    let {
        threadID: tid,
        messageID: mid,
        senderID: sid,
        args,
    } = o.event;
    let send = (msg, callback) => o.api.sendMessage(msg, tid, callback, mid);
    let category = _.cmd_categorys[args[0] - 1];
    let status = data[tid][category];

    if (_.o.event.senderID != sid) return;
    if (!category) return send(`Số thứ tự không tồn tại`);

    data[tid][category] = !status ? true : false;
    save()
    send(`✅ Đã ${!status ? 'bật' : 'tắt'} vô hiệu hoá nhóm lệnh ${category}`);
};