const sanitizeMongo = require('express-mongo-sanitize');
const hpp = require('hpp');

// <script>/<style> blocks go with their contents; any other tag is removed but
// its text kept. Only "<" followed by a letter, "/", "!" or "?" counts as a
// tag, so ordinary text such as "<3 days" or "x < y" is left alone.
const SCRIPT_OR_STYLE = /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const TAG = /<[a-z!/?][^<>]*>/gi;

// Repeats until nothing changes, so nesting like "<scr<script>ipt>" can't
// reassemble a tag once the inner one is removed. This is defence in depth:
// React escapes everything it renders and the CSP blocks inline scripts.
function stripHtml(value) {
    let out = value;
    let previous;
    do {
        previous = out;
        out = out.replace(SCRIPT_OR_STYLE, '').replace(TAG, '');
    } while (out !== previous);
    return out.trim();
}

const noSqlInjection = sanitizeMongo();
const parameterPollution = hpp();

// Strips markup from the named free-text body fields. Runs before the
// validators, so length limits apply to the cleaned text.
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