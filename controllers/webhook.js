import TelegramBot from 'node-telegram-bot-api';
import moment from 'moment';

import Doings from '../models/doings';

const model = new Doings();
const bot = new TelegramBot(process.env.ASSISTANT_TOKEN);

export default {
    telegram: async function run(ctx, next) {

        if (ctx.request.body.message) {
            const {text, chat , date} = ctx.request.body.message;
            let query = /\/(\w+)(?:\s+(.*))?/.exec(text);

            if (query) {
                switch (query[1]) {
                    case 'do':
                        await model.create({
                            chat: chat.id,
                            time: date,
                            text: query[2]
                        });
                        break;

                    case 'report':
                        const mdate = query[2] ? moment(query[2], 'DD.MM.YYYY') : moment();
                        let data = await model.history(chat.id, mdate.startOf('day').unix(), mdate.endOf('day').unix());

                        if (data.length) {
                            let tasks = data.map(row => `- ${row.text}`).join("\n");
                            let resp = `${mdate.format('DD.MM.YYYY')}\n${tasks}`;
                            bot.sendMessage(chat.id, resp);
                        } else {
                            bot.sendMessage(chat.id, 'No data');
                        }

                        break;
                }
            }
        }
        ctx.status = 200;
        next();
    }
};