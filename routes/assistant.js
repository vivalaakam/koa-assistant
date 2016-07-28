import webhook from '../controllers/webhook';

export default function routes(router) {

    router
        .post('/telegram', webhook.telegram)


};