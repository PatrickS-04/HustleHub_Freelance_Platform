const helmet = require('helmet');

const contentSecurityPolicy = {
    useDefaults: false,
    directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"]
    }
};

const securityHeaders = [
    helmet({
        contentSecurityPolicy: contentSecurityPolicy,
        strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true },
        referrerPolicy: { policy: 'no-referrer' },
        frameguard: { action: 'deny' }
    }),
    (req, res, next) => {
        res.set("Cache-Control", "no-store");
        next();
    }
];

module.exports = securityHeaders;