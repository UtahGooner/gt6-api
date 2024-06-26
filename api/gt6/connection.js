import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
    host: process.env.GT_HOST,
    user: process.env.GT_USERNAME,
    password: process.env.GT_PASSWORD,
    database: process.env.GT_SCHEMA,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: true,
});

