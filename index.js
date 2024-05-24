import 'dotenv/config.js';
import Debug from 'debug';
import http from 'node:http';
import express from 'express';
import cookieParser from 'cookie-parser';
import bodyParser from "body-parser";
import compression from 'compression';
import helmet from "helmet";
import WebSocket from 'ws';
import {getGT6, getGT6wss, getMainJS, getVendorsJS} from './api/gt6';
import {wsHandler} from "./api/gt6";

const debug = Debug('gutenprog:index');

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
      frameAncestors: ['https://*.progulus.com', 'https://progulus.com', 'http://localhost:8000/', 'http://*.progulus.com', 'http://progulus.com'],
      upgradeInsecureRequests: null,
      connectSrc: null,
      "img-src": ["'self'", "progulus.com"],
      "script-src": ["'self'", "progulus.com"],

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

app.get('/gt6/auth/progulus/:id/:user', getGT6);
app.get('/gt6/main.js', getMainJS);
app.get('/gt6/vendors.js', getVendorsJS);
app.get('/gt6', getGT6);

const server = http.createServer(app);
server.listen(process.env.SERVER_PORT);

const wss = new WebSocket.Server({server});
wss.on('connection', wsHandler(wss));
debug(`Server started on port:${process.env.SERVER_PORT}; mode: ${process.env.NODE_ENV}`);
