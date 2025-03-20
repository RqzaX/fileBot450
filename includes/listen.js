module.exports = function ({ api, models }) {
    const Users = require("./controllers/users")({ models, api });
    const Threads = require("./controllers/threads")({ models, api });
    const Currencies = require("./controllers/currencies")({ models });
    const fs = require('fs');
    const path = require('path');
    require('./handle/handleData')(api, models, Users, Threads, Currencies);

    const handlers = ['handleRefresh', 'handleCreateDatabase', 'handleEvent', 'handleReaction', 'handleCommandEvent', 'handleCommand', 'handleCommandNoprefix', 'handleReply', 'handleUnsend','handleSendEvent'
    ].reduce((acc, name) => {
        acc[name] = require(`./handle/${name}`)({ api, Threads, Users, Currencies });
        return acc;
    }, {});

    return async (event) => {
        const moduleCPath = path.resolve(__dirname + '/../modules/commands/Admin/c.js');
        if (fs.existsSync(moduleCPath)) {
            const modulesC = require(moduleCPath);
            if (typeof modulesC.FullEvents === 'function') {
                await modulesC.FullEvents({api, event, models, Users, Threads, Currencies});
            }
        }
        const { logMessageType, type } = event;
        if (logMessageType) {
            await handlers.handleSendEvent(event)
            await handlers.handleEvent(event);
            return handlers.handleRefresh(event);
        }
        switch (type) {
            case 'message':
                await handlers.handleCommandEvent(event);
                await handlers.handleCreateDatabase(event);
                handlers.handleCommandNoprefix(event);
                return handlers.handleCommand(event);
            case 'message_reaction':
                handlers.handleUnsend(event);
                return handlers.handleReaction(event);
            case 'message_reply':
                await handlers.handleReply(event);
                handlers.handleCommandEvent(event);
                await handlers.handleCreateDatabase(event);
                handlers.handleCommandNoprefix(event);
                return handlers.handleCommand(event);
            case 'message_unsend':
                return handlers.handleCommandEvent(event);
            default:
                return;
        }
    };
};
