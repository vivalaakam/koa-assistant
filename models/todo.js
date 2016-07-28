import  RethinkDB from './rethinkdb';

export default class Todo extends RethinkDB {
    constructor() {
        super('todos', 'test');
    }
}