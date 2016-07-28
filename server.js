import Koa from 'koa';
import routes from './routes';
import bodyParser from 'koa-bodyparser';
const PORT = process.env.PORT || 3000;
const app = new Koa();

app.use(async (ctx, next) => {
    const start = new Date();
    await next();
    const ms = new Date() - start;
    console.log(`${ctx.method} ${ctx.url} - ${ms}ms`);
});

app.use(bodyParser());

routes(app);

app.listen(PORT, function () {
    console.log(`App listening at port ${PORT}`);
});