"use strict";

var utils = require("./utils");
var cheerio = require("cheerio");
var log = require("npmlog");

log.maxRecordSize = 100;
var checkVerified = null;
const Boolean_Option = ['online', 'selfListen', 'listenEvents', 'updatePresence', 'forceLogin', 'autoMarkDelivery', 'autoMarkRead', 'listenTyping', 'autoReconnect', 'emitReady'];

function setOptions(globalOptions, options) {
  Object.keys(options).forEach(key => {
    if (Boolean_Option.includes(key)) {
      globalOptions[key] = Boolean(options[key]);
    } else {
      switch (key) {
        case 'pauseLog':
          options.pauseLog ? log.pause() : log.resume();
          break;
        case 'logLevel':
          log.level = options.logLevel;
          globalOptions.logLevel = options.logLevel;
          break;
        case 'logRecordSize':
          log.maxRecordSize = options.logRecordSize;
          globalOptions.logRecordSize = options.logRecordSize;
          break;
        case 'pageID':
          globalOptions.pageID = options.pageID.toString();
          break;
        case 'userAgent':
          globalOptions.userAgent = options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
          break;
        case 'proxy':
          if (typeof options.proxy !== "string") {
            delete globalOptions.proxy;
            utils.setProxy();
          } else {
            globalOptions.proxy = options.proxy;
            utils.setProxy(globalOptions.proxy);
          }
          break;
        default:
          log.warn("setOptions", "Unrecognized option given to setOptions: " + key);
          break;
      }
    }
  });
}

function buildAPI(globalOptions, html, jar) {
  let fb_dtsg = null;
  let irisSeqID = null;
  function extractFromHTML() {
    try {
      const $ = cheerio.load(html);
      $('script').each((i, script) => {
        if (!fb_dtsg) {
          const scriptText = $(script).html() || '';
          const patterns = [
            /\["DTSGInitialData",\[\],{"token":"([^"]+)"}]/,
            /\["DTSGInitData",\[\],{"token":"([^"]+)"/,
            /"token":"([^"]+)"/,
            /{\\"token\\":\\"([^\\]+)\\"/,
            /,\{"token":"([^"]+)"\},\d+\]/,
            /"async_get_token":"([^"]+)"/,
            /"dtsg":\{"token":"([^"]+)"/,
            /DTSGInitialData[^>]+>([^<]+)/
          ];
          for (const pattern of patterns) {
            const match = scriptText.match(pattern);
            if (match && match[1]) {
              try {
                const possibleJson = match[1].replace(/\\"/g, '"');
                const parsed = JSON.parse(possibleJson);
                fb_dtsg = parsed.token || parsed;
              } catch {
                fb_dtsg = match[1];
              }
              if (fb_dtsg) break;
            }
          }
        }
      });
      if (!fb_dtsg) {
        const dtsgInput = $('input[name="fb_dtsg"]').val();
        if (dtsgInput) fb_dtsg = dtsgInput;
      }
      const seqMatches = html.match(/irisSeqID":"([^"]+)"/);
      if (seqMatches && seqMatches[1]) {
        irisSeqID = seqMatches[1];
      }
      try {
        const jsonMatches = html.match(/\{"dtsg":({[^}]+})/);
        if (jsonMatches && jsonMatches[1]) {
          const dtsgData = JSON.parse(jsonMatches[1]);
          if (dtsgData.token) fb_dtsg = dtsgData.token;
        }
      } catch { }
      if (fb_dtsg) {
        console.log("Đã tìm thấy fb_dtsg");
      }
    } catch (e) {
      console.log("Lỗi khi tìm fb_dtsg:", e);
    }
  }
  extractFromHTML();
  var userID;
  var cookies = jar.getCookies("https://www.facebook.com");
  var userCookie = cookies.find(cookie => cookie.cookieString().startsWith("c_user="));
  var tiktikCookie = cookies.find(cookie => cookie.cookieString().startsWith("i_user="));
  if (!userCookie && !tiktikCookie) {
    return log.error('login', "Không tìm thấy cookie cho người dùng, vui lòng kiểm tra lại thông tin đăng nhập");
  }
  if (html.includes("/checkpoint/block/?next")) {
    return log.error('login', "Appstate die, vui lòng thay cái mới!", 'error');
  }
  userID = (tiktikCookie || userCookie).cookieString().split("=")[1];
  //logger.log(`${cra(`[ CONNECT ]`)} Logged in as ${userID}`, "DATABASE");
  try { clearInterval(checkVerified); } catch (_) { }
  const clientID = (Math.random() * 2147483648 | 0).toString(16);
  let mqttEndpoint = `wss://edge-chat.facebook.com/chat?region=prn&sid=${userID}`;
  let region = "PRN";

  try {
    const endpointMatch = html.match(/"endpoint":"([^"]+)"/);
    if (endpointMatch) {
      mqttEndpoint = endpointMatch[1].replace(/\\\//g, '/');
      const url = new URL(mqttEndpoint);
      region = url.searchParams.get('region')?.toUpperCase() || "PRN";
    }
  } catch (e) {
    console.log('Using default MQTT endpoint');
  }
  log.info('login', 'Fix fca by DongDev x Satoru');
  var ctx = {
    userID: userID,
    jar: jar,
    clientID: clientID,
    globalOptions: globalOptions,
    loggedIn: true,
    access_token: 'NONE',
    clientMutationId: 0,
    mqttClient: undefined,
    lastSeqId: irisSeqID,
    syncToken: undefined,
    mqttEndpoint: mqttEndpoint,
    region: region,
    firstListen: true,
    fb_dtsg: fb_dtsg,
    req_ID: 0,
    callback_Task: {},
    wsReqNumber: 0,
    wsTaskNumber: 0,
    reqCallbacks: {}
  };
  var api = {
    setOptions: setOptions.bind(null, globalOptions),
    getAppState: () => utils.getAppState(jar),
    // postFormData: (url, body) => utils.makeDefaults(html, userID, ctx).postFormData(url, ctx.jar, body)
  };
  var defaultFuncs = utils.makeDefaults(html, userID, ctx);
  api.postFormData = function (url, body) {
    return defaultFuncs.postFormData(url, ctx.jar, body);
  };
  api.getFreshDtsg = async function () {
    try {
      const res = await defaultFuncs.get('https://www.facebook.com/', jar, null, globalOptions);
      const $ = cheerio.load(res.body);
      let newDtsg;
      const patterns = [
        /\["DTSGInitialData",\[\],{"token":"([^"]+)"}]/,
        /\["DTSGInitData",\[\],{"token":"([^"]+)"/,
        /"token":"([^"]+)"/,
        /name="fb_dtsg" value="([^"]+)"/
      ];

      $('script').each((i, script) => {
        if (!newDtsg) {
          const scriptText = $(script).html() || '';
          for (const pattern of patterns) {
            const match = scriptText.match(pattern);
            if (match && match[1]) {
              newDtsg = match[1];
              break;
            }
          }
        }
      });

      if (!newDtsg) {
        newDtsg = $('input[name="fb_dtsg"]').val();
      }

      return newDtsg;
    } catch (e) {
      console.log("Error getting fresh dtsg:", e);
      return null;
    }
  };
  // if (noMqttData) api.htmlData = noMqttData;
  require('fs').readdirSync(__dirname + '/src/').filter(v => v.endsWith('.js')).forEach(v => {
    const moduleName = v.replace('.js', '');
    api[moduleName] = require(`./src/${v}`)(defaultFuncs, api, ctx);
  });
  api.listen = api.listenMqtt;
  return {
    ctx,
    defaultFuncs,
    api
  };
}

function loginHelper(appState, globalOptions, callback) {
  let mainPromise = null;
  const jar = utils.getJar();
  if (appState) {
    try {
      appState = JSON.parse(appState);
    } catch (e) {
      try {
        appState = appState;
      } catch (e) {
        return callback(new Error("Failed to parse appState"));
      }
    }

    try {
      appState.forEach(c => {
        const str = `${c.key}=${c.value}; expires=${c.expires}; domain=${c.domain}; path=${c.path};`;
        jar.setCookie(str, "http://" + c.domain);
      });

      mainPromise = utils.get('https://www.facebook.com/', jar, null, globalOptions, { noRef: true })
        .then(utils.saveCookies(jar));
    } catch (e) {
      process.exit(0);
    }
  } else {
    mainPromise = utils
      .get("https://www.facebook.com/", null, null, globalOptions, { noRef: true })
      .then(utils.saveCookies(jar))
      .then(() => utils.get('https://www.facebook.com/', jar, null, globalOptions).then(utils.saveCookies(jar)));
  }

  function handleRedirect(res) {
    const reg = /<meta http-equiv="refresh" content="0;url=([^"]+)[^>]+>/;
    const redirect = reg.exec(res.body);
    if (redirect && redirect[1]) {
      return utils.get(redirect[1], jar, null, globalOptions).then(utils.saveCookies(jar));
    }
    return res;
  }

  let ctx, api;
  mainPromise = mainPromise
    .then(handleRedirect)
    .then(res => {
      const mobileAgentRegex = /MPageLoadClientMetrics/gs;
      if (!mobileAgentRegex.test(res.body)) {
        globalOptions.userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";
        return utils.get('https://www.facebook.com/', jar, null, globalOptions, { noRef: true }).then(utils.saveCookies(jar));
      }
      return res;
    })
    .then(handleRedirect)
    .then(res => {
      const html = res.body;
      const Obj = buildAPI(globalOptions, html, jar);
      ctx = Obj.ctx;
      api = Obj.api;
      return res;
    });

  if (globalOptions.pageID) {
    mainPromise = mainPromise
      .then(() => utils.get(`https://www.facebook.com/${globalOptions.pageID}/messages/?section=messages&subsection=inbox`, jar, null, globalOptions))
      .then(resData => {
        let url = utils.getFrom(resData.body, 'window.location.replace("https:\\/\\/www.facebook.com\\', '");').split('\\').join('');
        url = url.substring(0, url.length - 1);
        return utils.get('https://www.facebook.com' + url, jar, null, globalOptions);
      });
  }

  mainPromise
    .then(async () => {
      log.info('Đăng nhập thành công');
      callback(null, api);
    })
    .catch(e => {
      callback(e);
    });
}


function login(loginData, options, callback) {
  if (utils.getType(options) === 'Function' || utils.getType(options) === 'AsyncFunction') {
    callback = options;
    options = {};
  }

  var globalOptions = {
    selfListen: false,
    listenEvents: true,
    listenTyping: false,
    updatePresence: false,
    forceLogin: false,
    autoMarkDelivery: false,
    autoMarkRead: false,
    autoReconnect: true,
    logRecordSize: 100,
    online: false,
    emitReady: false,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
  };

  if (loginData.appState) {
    setOptions(globalOptions, options);
    return loginHelper(loginData.appState, globalOptions, callback);
  }
}

module.exports = login;