import Router from 'koa-router'
import todos from './todos';
import assistant from './assistant';

const router = new Router();

export default function (app) {
    todos(router);
    assistant(router);
    app.use(router.routes());
    app.use(router.allowedMethods());

}