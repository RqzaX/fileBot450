"use strict";
var mainPromise = null;
var jar = utils.getJar();

if (appState) {
    appState.map(function (c) {
        var str = c.key + "=" + c.value + "; expires=" + c.expires + "; domain=" + c.domain + "; path=" + c.path + ";";
        jar.setCookie(str, "http://" + c.domain);
    });

    // Load the main page.
    mainPromise = utils.get('https://www.facebook.com/', jar, null, globalOptions, { noRef: true }).then(utils.saveCookies(jar));
}
