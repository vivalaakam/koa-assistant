import request from 'request'
const __EMOJI__ = {};
const __KEYS__ = [];
const __ORGINAL__ = {};
let data = {};
const EmojiList = async function () {
    data = await new Promise((resolve, reject) => {
        request({
            url: 'https://raw.githubusercontent.com/omnidan/node-emoji/master/lib/emoji.json',
            json: true
        }, function (err, res, body) {
            if (err) {
                return reject(err);
            } else if (res.statusCode !== 200) {
                err = new Error("Unexpected status code: " + res.statusCode);
                err.res = res;
                return reject(err);
            }
            resolve(body);
        });
    });

    Object.keys(data).forEach(key => {
        __EMOJI__[data[key]] = key;
        __KEYS__.push(key);
        __ORGINAL__[key] = data[key];
    });
};

EmojiList();

export const keys = __KEYS__;
export const original = __ORGINAL__

export default function toWord(sym) {
    return __EMOJI__[sym];
}