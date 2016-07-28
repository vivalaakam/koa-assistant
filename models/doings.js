import RethinkDB, {r} from './rethinkdb';


export default class Doings extends RethinkDB {
    constructor() {
        super('doings', 'test');
        this.indexes = ['time', 'chat']
    }

    async history(chat, start, end) {
        console.log(arguments);
        let db = await this.db();
        let query = await r.table(this.collection).between(start, end, {index: 'time'}).filter({chat: chat}).run(db);
        let result = await query.toArray();
        return result;
    }
}