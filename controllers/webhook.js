import TelegramBot from 'node-telegram-bot-api';
import moment from 'moment';

import Doings from '../models/doings';

const model = new Doings();
const bot = new TelegramBot(process.env.ASSISTANT_TOKEN);

function parse({text, entities = []}) {
    return entities.reduceRight((state, tag) => {
        switch (tag.type) {
            case 'hashtag':
                state.tags.push(state.text.slice(tag.offset, tag.offset + tag.length).slice(1));
                state.text = state.text.slice(0, tag.offset).trim();
                break;
            case 'bot_command':
                state.command = state.text.slice(0, tag.length);
                state.text = state.text.slice(tag.length).trim();
                break;
        }
        return state;
    }, {
        text: text,
        command: '',
        tags: []
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
                            message_id
                        });
                        break;

                    case '/report':
                        const mdate = query.text ? moment(query.text, 'DD.MM.YYYY') : moment();
                        let data = await model.history(chat.id, mdate.startOf('day').unix(), mdate.endOf('day').unix(), query.tags);

                        if (data.length) {
                            let tasks = data.map(row => `- ${row.text}`).join("\n");
                            let resp = `*${mdate.format('DD.MM.YYYY')}*\n${tasks}`;
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
                                tags: query.tags
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