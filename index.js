require('dotenv').config();

const debug = require('debug')('gutenprog:index');
const http = require('node:http');
const express = require('express');
const cookieSession = require('cookie-session');
const cookieParser = require('cookie-parser');
const bodyParser = require("body-parser");
const compression = require('compression');
const helmet = require("helmet");
const WebSocket = require('ws');
const {getGT6, getGT6wss} = require('./api/gt6/index.js');
const {wsHandler} = require("./api/gt6");

if (!process.env.SERVER_PORT) {
    console.log('*** error loading .env - SERVER_PORT is not set',);
    process.exit(1);
}

const app = express();


app.set('trust proxy', 'loopback');
app.use(helmet({
   crossOriginEmbedderPolicy: false,
}));
app.use(helmet.crossOriginResourcePolicy({policy: 'cross-origin'}));
app.use(helmet.contentSecurityPolicy({
  directives: {
      frameAncestors: ['https://*.progulus.com', 'https://progulus.com', 'http://localhost:8080/'],
      upgradeInsecureRequests: null,
      connectSrc: null
  }
}))

app.use(compression());
app.use(cookieSession({
    name: 'session',
    sameSite: true,
    secure: true,
    secret: process.env.COOKIE_SECRET,
}));
app.set('json spaces', 2);
app.set('view engine', 'pug');
app.set('views', process.cwd() + '/views');
//
app.use(express.static(process.cwd() + '/public'));
app.use('/.well-known', express.static(process.cwd() + '/public/.well-known'));
app.use('/css', express.static(process.cwd() + '/public/css'));
app.use('/js', express.static(process.cwd() + '/public/js'));
app.use('/images', express.static(process.cwd() + '/public/images'));
app.use('/modules', express.static(process.cwd() + '/node_modules'));

app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));


app.use((req, res, next) => {
    debug(req.ip, req.method, req.url, req.headers.connection);
    next();
});

// app.get('/', (req, res) => {
//     debug('loading index');
//     res.render('index');
// });
// app.use('/gt5/wait/:key(\\d+)', (req, res) => {
//     setTimeout(() => {
//         res.sendStatus(304);
//     }, 1000 * 60);
// });
// app.use('/gt5', (req, res) => {
//     res.render('index');
// });
app.get('/gt6/auth/progulus/:id/:user', getGT6);
app.get('/gt6', getGT6);

const server = http.createServer(app);
server.listen(process.env.SERVER_PORT);

const wss = new WebSocket.Server({server});
wss.on('connection', wsHandler(wss));
debug(`Server started on port:${process.env.SERVER_PORT}; mode: ${process.env.NODE_ENV}`);
