module.exports.config = {
    name: "listbox",
    version: "1.0.0",
    hasPermssion: 2,
    credits: "Niio-team (Vtuan)",
    description: "Xem danh sách ban của nhóm hoặc của người dùng",
    commandCategory: "Admin",
    usages: "[page]",
    cooldowns: 5
};
let limit = 10; // số nhóm / 1 trang
module.exports.run = async function ({ event, api, Users, args, Threads }) {
    try {
        var inbox = await api.getThreadList(100, null, ['INBOX']);
        let list = inbox.filter(group => group.isSubscribed && group.isGroup);
        let page = 1;
        let totalPages = Math.ceil(list.length / limit);
        let start = (page - 1) * limit;
        let end = start + limit;
        let pageData = list.slice(start, end);
        let message = `==== DANH SÁCH GROUP (Trang ${page}/${totalPages}) ====\n\n`;
        message += formatGroupList(pageData, start);
        message += `\nPhản hồi với Out, Ban, Unban, thamgia, page + số thứ tự. Bạn có thể phản hồi với nhiều số cách nhau bằng dấu cách để Out, Ban, Unban, thamgia các nhóm.\n[ ! ]: page + số trang để xem trang khác!`;
        let sentMsg = await api.sendMessage(message, event.threadID);
        global.client.handleReply.push({
            name: this.config.name,
            author: event.senderID,
            messageID: sentMsg.messageID,
            list,
            totalPages,
            currentPage: page
        });

    } catch (error) {
        console.error(error);
        api.sendMessage("Có lỗi xảy ra khi lấy dữ liệu.", event.threadID);
    }
};

module.exports.handleReply = async function ({ api, event, handleReply, Threads }) {
    if (event.senderID !== handleReply.author) return;
	api.unsendMessage(handleReply.messageID)
    try {
        if (event.body.split(' ')[0].toLowerCase() == 'page') {
            let requestedPage = parseInt(event.body.split('')[1]);
            if (isNaN(requestedPage) || requestedPage < 1 || requestedPage > handleReply.totalPages) {
                return api.sendMessage(`Số trang không hợp lệ. Vui lòng chọn từ 1 đến ${handleReply.totalPages}.`, event.threadID);
            }
            let start = (requestedPage - 1) * limit;
            let end = start + limit;
            let pageData = handleReply.list.slice(start, end);
            let message = `==== DANH SÁCH GROUP (Trang ${requestedPage}/${handleReply.totalPages}) ====\n\n`;
            message += formatGroupList(pageData, start);
            message += `\nPhản hồi tin nhắn này với số trang để xem các trang khác.`;
            let sentMsg = await api.sendMessage(message, event.threadID);
            handleReply.messageID = sentMsg.messageID;
            handleReply.currentPage = requestedPage;
        } else if (['unban', 'ban'].includes(event.body.split(' ')[0].toLowerCase())) {
            const action = event.body.split(' ')[0].toLowerCase();
            let nums = event.body.split(' ').slice(1);
            let msg = '';
            for (let num of nums) {
                let index = parseInt(num) - 1;
                if (isNaN(index) || index < 0 || index >= handleReply.list.length) {
                    msg += `Số ${num} không hợp lệ. Vui lòng nhập số hợp lệ.\n`;
                    continue;
                }

                let group = handleReply.list[index];
                let idgr = group.threadID;
                let groupName = group.threadName || "Không tên";
                const data = (await Threads.getData(idgr)).data || {};

                data.banned = action === 'ban';
                await Threads.setData(idgr, { data });

                if (action === 'ban') {
                    global.data.threadBanned.set(idgr, { dateAdded: data.dateAdded });
                    msg += `Đã ban nhóm ${groupName}\n» TID: ${idgr}\n`;
                } else {
                    global.data.threadBanned.delete(idgr);
                    msg += `Đã unban nhóm ${groupName}\n» TID: ${idgr}\n`;
                }
            }

            api.sendMessage(msg || "Không có nhóm nào được xử lý.", event.threadID);
        } else if (['thamgia', 'out'].includes(event.body.split(' ')[0].toLowerCase())) {
            let nums = event.body.split(' ').slice(1);
            let msg = '';
            const action = event.body.split(' ')[0].toLowerCase() == 'out' ? api.removeUserFromGroup : api.addUserToGroup;
            const userID = event.body.split(' ')[0].toLowerCase() == 'out' ? api.getCurrentUserID() : handleReply.author;
            for (let num of nums) {
                let index = parseInt(num) - 1;
                if (isNaN(index) || index < 0 || index >= handleReply.list.length) {
                    msg += `Số ${num} không hợp lệ. Vui lòng nhập số hợp lệ.\n`;
                    continue;
                }
                let group = handleReply.list[index];
                let idgr = group.threadID;
                action(userID, idgr);
            }
            api.sendMessage(msg || (event.body.split(' ')[0].toLowerCase() == 'out' ? 'Đã out.' : 'Đã tham gia.'), event.threadID);
        }
    } catch (error) {
        console.error(error);
        api.sendMessage("Có lỗi xảy ra khi xử lý phản hồi.", event.threadID);
    }
};

function formatGroupList(pageData, start) {
    let msg = "";
    pageData.forEach((group, index) => {
        msg += `#${start + index + 1} - ${group.threadName || "Không tên"}\n`;
        msg += `🆔 ID nhóm: ${group.threadID}\n`;
        msg += `👥 Số lượng thành viên: ${group.participantIDs.length}\n`;
        msg += `💬 Tổng tin nhắn: ${group.messageCount}\n`;
        msg += `⚙️ Chế độ phê duyệt: ${group.approvalMode ? "Bật" : "Tắt"}\n`;
        msg += `🔗 Link mời tham gia: ${group.inviteLink?.enable ? "Bật" : "Tắt"}\n`;
        msg += "--------------------------\n";
    });
    return msg;
}