module.exports = function ({ api, models, Users, Threads, Currencies }) {
    return async function (event) {
        const { threadID, logMessageType, logMessageData } = event;
        const { setData, getData, delData, createData } = Threads;
        let dataThread = (await Threads.getData(event.threadID)).threadInfo;
        switch (logMessageType) {
            case 'joinable_group_link_mode_change': {
                if (event.logMessageData.cta_text) {
                    if (dataThread.inviteLink.link.length == 0) {
                        const threeee = await Threads.getInfo(threadID);
                        dataThread.inviteLink.link = threeee.inviteLink.link
                    }
                    dataThread.inviteLink.enable = true;
                } else {
                    dataThread.inviteLink.enable = false;
                }
                await setData(threadID, { threadInfo: dataThread });
                break;
            }
            case "joinable_group_link_reset": {
                dataThread.inviteLink.link = logMessageData.linh
                await setData(threadID, { threadInfo: dataThread });
                break
            }
            case 'log:thread-name': {
                dataThread.threadName = event.logMessageData.name;
                await setData(threadID, { threadInfo: dataThread });
                break;
            }
            case 'log:thread-image': {
                dataThread.imageSrc = event.logMessageData.url;
                await setData(threadID, { threadInfo: dataThread });
                break;
            }
            case "log:thread-color": {
                dataThread.emoji = event.logMessageData.theme_emoji;
                dataThread.threadTheme = {
                    id: logMessageData.theme_id,
                    accessibility_label: event.logMessageData.accessibility_label
                };
                dataThread.color = event.logMessageData.theme_color;
                await setData(threadID, { threadInfo: dataThread });
                break;
            }
            case "log:thread-icon": {
                dataThread.emoji = event.logMessageData.thread_quick_reaction_emoji;
                await setData(threadID, { threadInfo: dataThread });
                break;
            }
            case "log:user-nickname": {
                const { participant_id, nickname } = event.logMessageData;
                if (nickname === '') {
                    delete dataThread.nicknames[participant_id];
                } else {
                    dataThread.nicknames[participant_id] = nickname;
                }
                await setData(threadID, { threadInfo: dataThread });
                break;
            }
            case 'log:unsubscribe': {
                if (logMessageData.leftParticipantFbId == api.getCurrentUserID()) { return }
                else {
                    const id = dataThread.participantIDs.findIndex(item => item == logMessageData.leftParticipantFbId);
                    if (id !== -1) {
                        dataThread.participantIDs.splice(id, 1);
                    }
                    const userInfoIndex = dataThread.userInfo.findIndex(user => user.id == logMessageData.leftParticipantFbId);
                    if (userInfoIndex !== -1) {
                        dataThread.userInfo.splice(userInfoIndex, 1);
                    }
                    await setData(threadID, { threadInfo: dataThread });
                }
                break;
            }
            case 'log:subscribe': {
                if (logMessageData.addedParticipants.some(i => i.userFbId == api.getCurrentUserID())) {
                    return require('./handleCreateDatabase.js')({ api, event, models, Users, Threads, Currencies })
                } else {
                    for (const id of logMessageData.addedParticipants) {
                        const userFbId = id.userFbId;
                        const userfb = await api.getUserInfo(userFbId);
                        const fo = {
                            id: userFbId,
                            name: userfb[userFbId].name,
                            firstName: userfb[userFbId].firstName,
                            vanity: userfb[userFbId].vanity,
                            thumbSrc: userfb[userFbId].thumbSrc,
                            profileUrl: userfb[userFbId].profileUrl,
                            gender: userfb[userFbId].gender === 2 ? "MALE" : "FEMALE",
                            type: "User",
                            isFriend: userfb[userFbId].isFriend,
                            isBirthday: userfb[userFbId].isBirthday
                        };

                        if (!dataThread.participantIDs.includes(userFbId)) {
                            dataThread.participantIDs.push(userFbId);
                        }

                        if (!dataThread.userInfo) {
                            dataThread.userInfo = [];
                        }
                        dataThread.userInfo.push(fo);
                        await Users.createData(userFbId, {
                            'name': fo.name,
                            'gender': fo.gender,
                            'data': {}
                        });
                    }
                    await setData(threadID, { threadInfo: dataThread });
                }
                break;
            }
            case "log:thread-admins": {
                if (logMessageData.ADMIN_EVENT == "add_admin") {
                    dataThread.adminIDs.push({ id: logMessageData.TARGET_ID });
                } else if (logMessageData.ADMIN_EVENT == "remove_admin") {
                    dataThread.adminIDs = dataThread.adminIDs.filter(item => item.id != logMessageData.TARGET_ID);
                }
                await setData(threadID, { threadInfo: dataThread });
                break;
            }
            default:
        }
    }
};
