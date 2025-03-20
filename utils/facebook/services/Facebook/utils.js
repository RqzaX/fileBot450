const got = require('got');
const JSONB = require('json-bigint');

class Utils {
    static async postWithToken(url, form, userAgent) {
        return await got.post(url, {
            headers: {
                'authorization': 'EAAAAUaZA8jlABO7Eli4fgflZByfjwC9GnUA4MFkqZAHd2zi1HHvn3sMpLZCeBlm1FjHiasP4gxUQChokQUw8QGnHwFZCvSrFh1FtNbojY0zLCn3lS2PgBbTHIZA2oihRSK9UwmrOM80RoScJIovZBgCZB03kxI7xzujBFYpuSEUR1cyhWYwHiekXUYCVaQZDZD',
                'user-agent': '[FBAN/FB4A;FBAV/417.0.0.33.65;FBBV/480085463;FBDM/{density=2.75,width=1080,height=2029};FBLC/vi_VN;FBRV/0;FBCR/VinaPhone;FBMF/Xiaomi;FBBD/Xiaomi;FBPN/com.facebook.katana;FBDV/MI 8 SE;FBSV/9;FBOP/1;FBCA/armeabi-v7a:armeabi;]',
                'Content-Type': 'application/x-www-form-urlencoded',
                //'Cookie': 'fr=1wdjE5Rf7lIgYUORK.AWXeOHediR4GGXmUAm-UYrAWD1Y.Bl31gb..AAA.0.0.Bl31gb.AWW6wRyBxSE; ps_l=0; ps_n=0; sb=fIWeZYTYZqln_fatgNIC5CvE'
            },
            form,
            decompress: true,
        })
    };

    static async postWithCookie(url, form, userAgent) {
        return await got.post(url, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': 'sb=SL7dZfSOJ761ApY9WqSPqlw3; datr=SL7dZa2rpyDYTnTFt-ZM-WeQ; ps_l=0; ps_n=0; locale=vi_VN; c_user=100088841221983; wd=440x656; xs=3%3APo6AqozKYsRByQ%3A2%3A1710580925%3A-1%3A6281%3A%3AAcUXgHhKiE3SQcWDhGrJdsxh2vD8zMFJdA0NRF9IVw; fr=1ShqvPfkFCAkskxlj.AWXlcQzRsHVgMH0oweNXQtx6cWY.Bl9XP1..AAA.0.0.Bl9XP1.AWUTDT_vuTc; presence=C%7B%22t3%22%3A%5B%5D%2C%22utc3%22%3A1710672078931%2C%22v%22%3A1%7D',
            },
            form,
            decompress: true,
        })
    };

    static getType(obj) {
        const cName = obj.constructor?.name
        const gName = Object.prototype.toString.call(obj).slice(8, -1)
        if (cName?.toLowerCase() === gName?.toLowerCase()) return cName
        else return !cName || cName?.toLowerCase() === 'object' ? gName : cName
    };

    static makeParsable(data) {
        const withoutForLoop = data.body.replace(/for\s*\(\s*;\s*;\s*\)\s*;\s*/, '')
        const maybeMultipleObjects = withoutForLoop.split(/\}\s*\{/)
        if (maybeMultipleObjects.length === 1) return maybeMultipleObjects[0]
        return `[${maybeMultipleObjects.join('},{')}]`
    };

    static parseFromBody(data) {
        if (typeof data.body !== 'string') return data.body
        try {
            const result = JSON.parse(this.makeParsable(data))
            const type = this.getType(result)
            return type === 'Object' || type === 'Array' ? result : data.body
        }
        catch (err) {
            return data.body
        }
    };
    static parseFromJSONB(data) {
        return JSONB.parse(data);
    }
};

module.exports.Utils = Utils;
