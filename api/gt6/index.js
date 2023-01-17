const fs = require('node:fs/promises');
const path = require("node:path");
const validator = require("validator");
const {getChat, broadcastChat, saveChat} = require('./chat');
const debug = require('debug')('gutenprog:api:gt6');

const bodyClassName = (theme) => {
    switch (theme) {
    case 'metal':
        return 'metal';
    case 'rock':
        return 'rock';
    default:
        return '';
    }
};


const getGT6 = async (req, res) => {
    try {
        const {username = '', id = 0} = req.params;
        const {theme = ''} = req.query || {};
        const manifestJSON = await fs.readFile(path.join(process.cwd(), './public/js/manifest.json'));
        const manifest = await JSON.parse(Buffer.from(manifestJSON).toString());
        res.render('gt6', {
            main: manifest['main.js'],
            vendor: manifest['vendors.js'],
            gt6params: {username, id},
            bodyClassName: bodyClassName(theme)
        });
    } catch(err) {
        if (err instanceof Error) {
            debug("getGT6()", err.message);
            return res.json({error: err.message, name: err.name});
        }
        res.json({error: 'unknown error in getGT6'});
    }
};


const wsHandler = (wss) => (ws, req) => {
    ws.on('message', async (msg) => {
        const post = JSON.parse(msg);
        if (post.ping) {
            ws.send(JSON.stringify({pong: 1}));
            return;
        }
        if (post.message) {
            try {
                const {tagname, url, chattext} = post.message;
                debug(`wsHandler: post ${tagname}`, req.headers['x-forwarded-for'].split(',')[0].trim())
                let validatedUrl = url.trim();
                if (!(validator.isEmpty(validatedUrl) || validator.isEmail(validatedUrl) || validator.isURL(validatedUrl))) {
                    validatedUrl = '';
                }
                const list = await saveChat({username: tagname, tagname, chattext, url: validatedUrl});
                await broadcastChat({wss, list});
            } catch(err) {
                ws.send(JSON.stringify({error: err.message}));
            }
            return;
        }
        if (post.sync) {
            try {
                debug(`wsHandler: sync`, req.headers['x-forwarded-for'].split(',')[0].trim());
                const list = await getChat({});
                ws.send(JSON.stringify({list}));
            } catch(err) {
                ws.send(JSON.stringify({error: err.message}));
            }
        }
        ws.send(JSON.stringify(post));
    })
}
const getGT6wss = async (ws, req) => {
    const {expressWs} = req.app.locals;
    console.log('getGt6wss', ws);
    ws.on('message', async (msg) => {
        const post = JSON.parse(msg);
        if (post.ping) {
            ws.send(JSON.stringify({pong: 1}));
            return;
        }
        if (post.message) {
            try {
                const {tagname, url, chattext} = post.message;
                let validatedUrl = url.trim();
                if (!(validator.isEmpty(validatedUrl) || validator.isEmail(validatedUrl) || validator.isURL(validatedUrl))) {
                    validatedUrl = '';
                }
                const list = await saveChat({username: tagname, tagname, chattext, url: validatedUrl});
                await broadcastChat({wss, list});
            } catch(err) {
                ws.send(JSON.stringify({error: err.message}));
            }
            return;
        }
        if (post.sync) {
            try {
                const list = await getChat({});
                ws.send(JSON.stringify({list}));
            } catch(err) {
                ws.send(JSON.stringify({error: err.message}));
            }
        }
        ws.send(JSON.stringify(post));
    })
};

exports.getGT6 = getGT6;
exports.getGT6wss = getGT6wss;

exports.wsHandler = wsHandler;
