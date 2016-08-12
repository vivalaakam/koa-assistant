import TelegramBot from 'node-telegram-bot-api';
import moment from 'moment';
import emoji, {keys, original} from '../helpers/emoji';
import Doings from '../models/doings';

const model = new Doings();
const bot = new TelegramBot(process.env.ASSISTANT_TOKEN);

const time_emoji = {
    ':clock1230:': 0.5,
    ':clock1:': 1,
    ':clock130:': 1.5,
    ':clock2:': 2,
    ':clock230:': 2.5,
    ':clock3:': 3,
    ':clock330:': 3.5,
    ':clock4:': 4,
    ':clock430:': 4.5,
    ':clock5:': 5,
    ':clock530:': 5.5,
    ':clock6:': 6,
    ':clock630:': 6.5,
    ':clock7:': 7,
    ':clock730:': 7.5,
    ':clock8:': 8,
    ':clock830:': 8.5,
    ':clock9:': 9,
    ':clock930:': 9.5,
    ':clock10:': 10,
    ':clock1030:': 10.5,
    ':clock11:': 11,
    ':clock1130:': 11.5,
    ':clock12:': 12,
}

const time_parse = [
    ':stopwatch:'
]

const PARSE_TIME = /:\w+:\s*(\d+(:?[.,_]\d+)?)h?\w*/g


function parse({text, entities = []}) {

    var ranges = [
        '\u1f600-\u1f64f',
        '\u23F1',
        '\ud83c[\udf00-\udfff]', // U+1F300 to U+1F3FF
        '\ud83d[\udc00-\ude4f]', // U+1F400 to U+1F64F
        '\ud83d[\ude80-\udeff]'  // U+1F680 to U+1F6FF
    ];

    let range_emo = new RegExp(ranges.join('|'), 'g');
    let e;

    while ((e = range_emo.exec(text)) !== null) {
        if (e.index === range_emo.lastIndex) {
            range_emo.lastIndex++;
        }
        let new_emoji = `:${emoji(e[0])}:`;
        let delta = new_emoji.length - e[0].length;
        let start = e.index + e[0].length;
        text = text.replace(e[0], new_emoji);
        entities.forEach(entitie => {
            if (entitie.offset > start) {
                entitie.offset += delta;
            }
        });
    }

    let re = /:(\w+):/g;
    let m;
    while ((m = re.exec(text)) !== null) {

        if (m.index === re.lastIndex) {
            re.lastIndex++;
        }

        if (keys.indexOf(m[1]) > -1) {
            entities.push({
                "type": "emoji",
                "offset": m.index,
                "length": m[0].length
            });
        }
    }

    entities.sort((a, b) => a.offset === b.offset ? 0 : a.offset < b.offset ? -1 : 1);

    const removeLast = (text, substr) => {
        let tmp = text.split(substr);
        let last = tmp.pop();
        return tmp.join(substr) + last;
    };

    return entities.reduceRight((state, tag) => {
        switch (tag.type) {
            case 'hashtag':
                let htag = state.text.slice(tag.offset, tag.offset + tag.length)
                state.tags.push(htag.slice(1));

                state.text = removeLast(state.text, htag).trim();
                break;
            case 'bot_command':
                state.command = state.text.slice(0, tag.length);
                state.text = state.text.slice(tag.length).trim();
                break;
            case 'emoji':
                let etag = state.text.slice(tag.offset, tag.offset + tag.length);
                if (time_emoji[etag]) {
                    state.track += time_emoji[etag];
                    state.text = removeLast(state.text, etag).trim();
                }

                if (time_parse.indexOf(etag) > -1) {
                    let res = state.text.match(PARSE_TIME);
                    if (res.length) {
                        let curr = res.slice(-1)[0];
                        let ex = PARSE_TIME.exec(curr);
                        state.track += parseFloat(ex[1].replace(/[,_]/g, '.'));
                        state.text = removeLast(state.text, curr).trim();
                    }
                }
                break;
        }
        return state;
    }, {
        text: text,
        command: '',
        tags: [],
        track: 0
    })
}

export default {
    telegram: async function run(ctx, next) {

        if (ctx.request.body.message) {
            console.log(JSON.stringify(ctx.request.body.message));
            const {text, chat, date, message_id, entities} = ctx.request.body.message;
            let query = parse({text, entities});

            if (query) {
                switch (query.command) {
                    default:
                    case '/do':
                        await model.create({
                            chat: chat.id,
                            time: date,
                            text: query.text,
                            tags: query.tags,
                            track: query.track,
                            message_id
                        });
                        break;

                    case '/report':
                        const mdate = query.text ? moment(query.text, 'DD.MM.YYYY') : moment();
                        let data = await model.history(chat.id, mdate.startOf('day').unix(), mdate.endOf('day').unix(), query.tags);

                        if (data.length) {

                            let calc = data.reduce((state, curr) => {
                                let text = curr.text.replace(/:(\w+):/g, ($0, $1) => original[$1]);
                                let str = `- ${text}`;
                                if (curr.track && curr.track > 0) {
                                    state.timing += curr.track;
                                    str += ` ${original.stopwatch} ${curr.track}h`;
                                }
                                state.tasks.push(str);
                                return state;
                            }, {
                                tasks: [], timing: 0
                            });

                            let tasks = calc.tasks.join("\n");
                            let timing = calc.timing > 0 ? `\nTotal  ${original.stopwatch} ${calc.timing}h` : '';
                            let resp = `*${mdate.format('DD.MM.YYYY')}*\n${tasks}${timing}`;
                            bot.sendMessage(chat.id, resp, {parse_mode: 'Markdown'});
                        } else {
                            bot.sendMessage(chat.id, 'No data');
                        }

                        break;
                }
            }
        } else if (ctx.request.body.edited_message) {
            const {text, chat, date, message_id, entities} = ctx.request.body.edited_message;
            let query = parse({text, entities});

            if (query) {
                switch (query.command) {
                    default:
                    case '/do':

                        let entry = await model.find(chat.id, message_id);

                        if (entry) {
                            await model.update(entry.id, {
                                text: query.text,
                                tags: query.tags,
                                track: query.track
                            });
                        }
                        break;
                    case '/report':
                        break;
                }
            }
        }
        ctx.status = 200;
        next();
    }
};