import RethinkDB, {r} from './rethinkdb';

export default class Doings extends RethinkDB {
    constructor() {
        super('doings');
        this.indexes = ['time', 'chat']
    }

    async history(chat, start, end, tags = []) {
        let db = await this.db();

        let query = await r.table(this.collection).between(start, end, {index: 'time'})
            .filter({chat: chat})
            .filter(
                r.row('tags').contains(
                    tag => {
                        if (!tags.length) {
                            return true;
                        }
                        let expr = r.expr(tag.match(tags.splice(0, 1)[0]));
                        return tags.reduce((expr, ctag) => expr.or(tag.match(ctag)), expr);
                    }
                )
            ).run(db);
        let result = await query.toArray();
        return result;
    }

    async find(chat, message_id) {
        let db = await this.db();
        let query = await r.table(this.collection).filter({chat, message_id}).run(db);
        let result = await query.toArray();
        return result.length && result[0];
    }
}