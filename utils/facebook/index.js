const { Facebook } = require('./services/Facebook/index');

class Controller {
    async FacebookController(url) {
        const facebook = new Facebook();
        const validURL = (url) => { try { new URL(url); return true; } catch (error) { return false; } };
        try {
            if (!url)
                return { error: 'Cannot fetch facebook stories & media info.', at: 'FetchStoriesAndMedia', detail: 'URL is required.' };
            if (!validURL(url))
                return { error: 'Cannot fetch facebook stories & media info.', at: 'FetchStoriesAndMedia', detail: 'The URL you entered is not valid.' };

            const targetURL = url.toString().split(',')[0]
            const result = await facebook.FetchStoriesAndMedia(decodeURIComponent(targetURL));
            // console.log(result)
            return result;

        }
        catch (error) {
            console.log(error)
            return { error: 'Cannot fetch facebook stories & media info.', at: 'FetchStoriesAndMedia', detail: 'Facebook did not respond with correct data.' }
        };
    };
}

module.exports.Controller = Controller;