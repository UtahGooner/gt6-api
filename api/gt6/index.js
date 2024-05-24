import Debug from "debug";
import fs from 'node:fs/promises'
import path from 'node:path';
import validator from "validator/es";
import {getChat, broadcastChat, saveChat} from './chat.js';

const debug = Debug('gutenprog:api:gt6');

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

async function loadManifest() {
    try {
        const manifestJSON = await fs.readFile(path.join(process.cwd(), './public/js/manifest.json'));
        return await JSON.parse(Buffer.from(manifestJSON).toString());
    } catch(err) {
        if (err instanceof Error) {
            console.debug("loadManifest()", err.message);
            return Promise.reject(err);
        }
        console.debug("loadManifest()", err);
        return Promise.reject(new Error('Error in loadManifest()'));
    }
}

export const getMainJS = async (req, res) => {
    try {
        const manifest = await loadManifest();
        res.redirect(302, path.resolve(`/js/${manifest['main.js']}`));
    } catch(err) {
        if (err instanceof Error) {
            console.debug("getMainJS()", err.message);
            return Promise.reject(err);
        }
        console.debug("getMainJS()", err);
        return Promise.reject(new Error('Error in getMainJS()'));
    }
}

export const getVendorsJS = async (req, res) => {
    try {
        const manifest = await loadManifest();
        res.redirect(302, path.resolve(`/js/${manifest['vendors.js']}`));
    } catch(err) {
        if (err instanceof Error) {
            console.debug("getMainJS()", err.message);
            return Promise.reject(err);
        }
        console.debug("getMainJS()", err);
        return Promise.reject(new Error('Error in getMainJS()'));
    }
}

export const getGT6 = async (req, res) => {
    try {
        const {user = '', id = 0} = req.params;
        const {theme = ''} = req.query || {};
        const manifest = await loadManifest()
        const renderArgs = {
            main: manifest['main.js'],
            vendor: manifest['vendors.js'],
            user,
            id,
            gt6params: {user, id},
            bodyClassName: bodyClassName(theme)
        };
        debug('getGT6()', renderArgs);
        res.render('gt6', renderArgs);
    } catch(err) {
        if (err instanceof Error) {
            debug("getGT6()", err.message);
            return res.json({error: err.message, name: err.name});
        }
        res.json({error: 'unknown error in getGT6'});
    }
};


export const wsHandler = (wss) => (ws, req) => {
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
export const getGT6wss = async (ws, req) => {
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
