import Debug from "debug";
import {pool} from './connection.js'

const debug = Debug('gutenprog:api:gt6:chat');

const loadChat = async ({offset = 0, limit = 150} = {}) => {
    try {
        offset = Number(offset) || 0;
        limit = Number(limit) || 150;

        const query = `SELECT id, username, tagname, url, chattext, flagged, deleted, createdAt, updatedAt, deletedAt
        FROM chats
        ORDER BY id DESC
        LIMIT ${limit} OFFSET ${offset}`;
        const [rows] = await pool.query(query);
        rows.map(row => {
            row.deleted = row.deleted === 1;
            row.flagged = row.flagged === 1;
        });
        return rows;
    } catch (e) {
        debug('loadChat()', e.type, e.message);
        return Promise.reject(e);
    }
};

export const saveChat = async ({username, tagname, url, chattext}) => {
    try {
        const query = `INSERT INTO chats (username, tagname, url, chattext)
                       VALUES (:username, :tagname, :url, :chattext)`;
        const data = {username, tagname, url, chattext};
        await pool.query(query, data);
        return await loadChat();
    } catch (e) {
        debug('saveChat()', e.type, e.message);
        return Promise.reject(e);
    }
};


export const getChat = async ({offset = 0, limit = 150} = {}) => {
    try {
        return await loadChat({offset, limit});
    } catch (err) {
        debug('getChat()', err.message);
        return Promise.reject(err);
    }
};

export const broadcastChat = ({wss, list = []}) => {
    try {
        wss.clients.forEach(client => {
            client.send(JSON.stringify({list}));
        })
    } catch (err) {
        debug('broadcast()', err.message);
        return Promise.reject(err);
    }
};
