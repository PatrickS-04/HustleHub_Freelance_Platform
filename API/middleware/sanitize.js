const sanitizeMongo = require('express-mongo-sanitize');
const hpp = require('hpp');
const xss = require('xss');

const stripHtml = (value) => 
    xss(value, {
        whiteList: {},
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script', 'style']
    }).trim();

const noSqlInjection = sanitizeMongo();
const parameterPollution = hpp();

function sanitizeInput(fields) {
    return (req, res, next) => {
        if (req.body && typeof req.body === 'object') {
            for (const field of fields) {
                if (typeof req.body[field] === 'string') {
                    req.body[field] = stripHtml(req.body[field]);
                }
            }
        }
        next();
    };
}

module.exports = { noSqlInjection, parameterPollution, sanitizeInput, stripHtml };