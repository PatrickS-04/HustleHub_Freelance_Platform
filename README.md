# INSY7314 POE Part 1
## **HustleHub+ Secure API Service**
### By 
1. Dillon Rinkwest - ST10439147
2. Patrick Shutte - ST10440987
3. Liam Swile - ST10438679
4. Uzair Essa - ST10440109

## Overview
HustleHub+ is a freelance marketplace platform that requires security to ensure the users of the system their data safety especially since this platform is associated with financial data. The platform will be using sensitive information such as user credentials, transactional records, and income related data as the platform will be helping record generated booking financial records as well as help users with indication of incomes earned and estimate tax obligations.
### The Intended User Base
- Clients
- Freelancers
- Administrators of the application

On the HustleHub+ platform freelancers use the platform to advertise their services to clients so that they can get their services booked and achieve financial gain. Clients can browse and gain information on possible services to ensure proper communication on provided services. Admins are there to ensure the proper running of the platform to ensure security and functionality for all users.

## Project Structure

```
API/
├── server.js                  # HTTPS entry point, secret checks, boots the app
├── app.js                     # Express app: Helmet, CORS, body limit, routes, error handling
├── config/
│   └── db.js                  # Mongo connection (inert until Part 2)
├── controllers/
│   └── authController.js      # register / login logic, sets the auth cookie
├── middleware/
│   ├── auth.js                # requireAuth (JWT from cookie or Bearer), requireRole (RBAC stub)
│   ├── validators.js          # Input validation for register/login
│   └── errorHandler.js        # Centralised error responses (no internal leakage)
├── models/
│   └── User.js                # In-memory user store (temporary, until Part 2 DB)
├── routes/
│   └── authRoutes.js          # /api/auth routes, with rate limiting
├── utils/
│   └── generateToken.js       # JWT signing
└── postman/
    └── HustleHub+ Part1.postman_collection.json       # Postman collection
```

The separation of db, authController, auth, validator, errorHandler, User, authRoutes and generateToken javascript files within their respective folders allow the code solution to have isolated responsibilities to keep logic concise and easy to understand as well as easy to add to bolster the solution.

## Architecture Diagram

<img width="1342" height="1242" alt="HustleHubArchitecture" src="https://github.com/user-attachments/assets/75410363-ce2f-4af4-a146-95821de0beeb" />


The diagram covers the full MERN target design. **Solid boxes are what this Part 1 submission actually implements:** HTTPS/TLS + HSTS (no plain-HTTP listener), Helmet + CSP, the CORS allow-list, auth rate limiting, two-layer input validation, the JWT auth middleware, RBAC/ownership plumbing (`requireRole`), bcrypt hashing, and the central error handler - plus the `400/401/403` controlled-failure paths. **Faded boxes are deferred:** to **Part 2** - the React SPA, MongoDB/Mongoose (users are in an in-memory store for now), `express-mongo-sanitize` + `hpp`, and the domain services (Gigs, Bookings, Transactions, Income/Tax); to **Part 3** - structured logging, the cloud log sink, the full CI/CD pipeline, and Docker Compose. The request flow (client → HTTPS → middleware pipeline → validation → auth → RBAC → controllers → services) is identical in every part.

## Security Decisions

Every decision below is driven by the same fact: HustleHub+ handles user credentials, authentication tokens, and financial records (booking income, tax estimates), so the confidentiality and integrity of that data are the priority.

### Password Hashing
Password hashing converts a user's password into a fixed-length, jumbled string that cannot feasibly be reversed [1]. A secure platform never stores passwords in plain text, so that a database breach does not immediately expose every user's password to attackers.

HustleHub+ uses **bcrypt** with a cost factor of 12 ([controllers/authController.js](API/controllers/authController.js)):

`const bcrypt = require("bcryptjs");`

`const passwordHash = await bcrypt.hash(password, 12);`

**Why bcrypt, and why cost 12:**
- bcrypt is a deliberately slow, *adaptive* hash. The cost factor sets how many key-expansion rounds are run; it can be raised as hardware gets faster without any other code change.
- bcrypt generates and stores a unique random salt per hash, so two users with the same password get different hashes and precomputed "rainbow table" attacks do not work.
- Cost 12 is above the OWASP minimum of 10. It adds roughly a quarter of a second per hash - unnoticeable to a user logging in, but expensive for an attacker trying millions of guesses.
- `argon2id` (memory-hard, harder to attack with GPUs) is the intended upgrade for Part 2; bcrypt is the well-audited, dependency-light choice for Part 1.

Password hashes are never logged and never returned in any API response.

### JWT Authentication
A JSON Web Token (JWT) is a signed, JSON-based token that lets two parties exchange verified claims [2]. After login, the API issues a JWT; the client returns it on later requests and the API verifies the signature, so no server-side session store is needed.

**Signing** ([utils/generateToken.js](API/utils/generateToken.js)):
```js
return jwt.sign(
  { sub: user.id, role: user.role },
  process.env.JWT_SECRET,
  {
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    algorithm: "HS256",
    issuer: process.env.APP_NAME,
    audience: ["hustlehubClient"]
  }
);
```

**Verifying** ([middleware/auth.js](API/middleware/auth.js)):
```js
const payload = jwt.verify(token, process.env.JWT_SECRET, {
  algorithms: ["HS256"],
  issuer: [process.env.APP_NAME],
  audience: ["hustlehubClient"]
});
```

**Decisions and why:**
- **Minimal payload:** the token carries only `sub` (user id) and `role`. If a token is ever intercepted, no name, email, or other personal data leaks with it.
- **Short-lived:** a 1-hour expiry limits how long a stolen token stays usable.
- **HS256 (symmetric) signing:** the same Express API both issues and verifies tokens - one trusted party, and the secret never leaves the server. Asymmetric signing (RS256) exists so a *separate* service can verify tokens without being able to mint them; there is no such service here, so RS256 would only add key management for no benefit. This is worth revisiting in Part 2 if a second service needs to verify tokens.
- **Algorithm pinned on verify:** `algorithms: ["HS256"]` is set explicitly so the API cannot be tricked into accepting a token signed with `alg: none` or a different algorithm.
- **Issuer and audience checked:** every request verifies `iss` and `aud`, not just the signature, so a token minted for a different application is rejected.
- **Mandatory secret:** the server refuses to start if `JWT_SECRET` is missing or shorter than 32 characters ([server.js](API/server.js)), so the signing key can never be weak or absent by accident.

### JWT Storage and Transport
On successful register or login the API sets the token in a cookie ([controllers/authController.js](API/controllers/authController.js)):
```js
res.cookie("token", token, {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  maxAge: 60 * 60 * 1000 // 1 hour, matches the JWT expiry
});
```

**Why an `httpOnly` cookie rather than `localStorage` or a JS variable:**
- `httpOnly` means JavaScript cannot read the cookie (`document.cookie` does not see it), so a cross-site scripting (XSS) payload on the page cannot steal the token. A token kept in `localStorage` is readable by any script that runs on the page.
- `Secure` means the cookie is only ever sent over HTTPS, never plain HTTP.
- `SameSite=Strict` means the browser does not attach the cookie to requests that originate from other sites. This closes the CSRF hole that cookies would otherwise open, and it is backed up by the CORS allow-list (below).

`requireAuth` reads the token from the cookie first and falls back to an `Authorization: Bearer <token>` header ([middleware/auth.js](API/middleware/auth.js)). The Part 2 React SPA uses the cookie exclusively. The token is returned in the login/register response body **only when `EXPOSE_TOKEN_IN_BODY=true`** - set for Postman/Newman runs, which have no browser cookie jar. It is off by default, so a normal deployment never puts the token in a response body.

### CORS
```js
app.use(cors({ origin: allowedOrigins, credentials: true }));
```
The API only accepts cross-origin requests from the configured frontend origin (`CORS_ORIGIN`), and only that origin is permitted to send credentials (the auth cookie) ([app.js](API/app.js)). Any other website that tries to call the API from a logged-in user's browser is blocked by the browser before the request is sent. Combined with `SameSite=Strict`, a malicious site cannot make authenticated calls on a user's behalf.

### Rate Limiting
```js
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
router.post("/register", authLimiter, ...);
router.post("/login", authLimiter, ...);
```
`/api/auth/register` and `/api/auth/login` are capped at 20 requests per IP per 15 minutes ([routes/authRoutes.js](API/routes/authRoutes.js)). These are the endpoints targeted by password brute-forcing and account enumeration, so they get a tight, slow-refilling limit rather than a single global one. Read endpoints (browsing gigs, in Part 2) are cheap and idempotent and will sit behind a looser global limiter; booking creation will get its own per-user limit because it writes financial records.

### Input Validation
Input is validated in two layers, so that no single missed check lets bad data through.

1. **Middleware** - `validateRegister` / `validateLogin` ([middleware/validators.js](API/middleware/validators.js)) run before the controller.

   `validateRegister` (`POST /api/auth/register`):
   - email is checked with `validator.isEmail` and normalised to lower case
   - password is checked with `validator.isStrongPassword` (8–128 characters, at least one uppercase, one lowercase, one number)
   - name is restricted to 2–50 letters (spaces, `'` and `-` allowed)
   - **`role` is a registration-only field.** It is allow-listed to `client` or `freelancer` only, so no one can register themselves as `admin`
   - the request body is then rebuilt from only the cleaned fields (`req.body = { name, email, password, role }`), which discards any extra properties an attacker adds

   `validateLogin` (`POST /api/auth/login`):
   - only `email` and `password` are accepted - **login does not take a `role`.** A user authenticates purely on their credentials; their role is a property of the account, not something the client states at sign-in. Any `role` sent in the login body is dropped when the body is rebuilt (`req.body = { email, password }`) and ignored. After login, the role is read from the signed JWT (see [JWT Authentication](#jwt-authentication) above), never from request input.

   Any error thrown during validation is caught and returned as `400`, never a `500`.
2. **Controller** - `register` / `login` ([controllers/authController.js](API/controllers/authController.js)) repeat the presence, type and empty-string checks as defence in depth, and reject non-string values before they reach any lookup (this also blocks NoSQL-style object injection once the database is added in Part 2). `login` destructures only `email` and `password`; it never reads `role`.

Body size is capped at 10&nbsp;KB (`express.json({ limit: "10kb" })`, [app.js](API/app.js)) so an oversized payload cannot be used to exhaust memory.

The principle throughout is **reject by default**: only known-good input shapes are accepted; everything else is refused with a `400` and a specific message.

### HTTPS
The API is served **only** over HTTPS ([server.js](API/server.js)) - there is no plain-HTTP listener to downgrade to. `minVersion: "TLSv1.2"` refuses the older, broken TLS versions. Helmet ([app.js](API/app.js)) adds a `Strict-Transport-Security` (HSTS) header instructing browsers to refuse HTTP for this origin in future.

Because every request carries either credentials (login) or the auth token (cookie), transport encryption is what prevents anyone on the network path - public Wi-Fi, an ISP, a compromised router - from reading or altering that data in transit. Locally the certificate is a self-signed certificate generated with OpenSSL; production would use a CA-issued certificate.

### Error Handling
All errors funnel through one central handler ([middleware/errorHandler.js](API/middleware/errorHandler.js)):
- the full error and stack trace are written to the **server log only**
- the client always receives a generic `{ "error": "An unexpected error occurred." }` with the correct status code - no stack traces, file paths, dependency names or versions, or configuration are ever returned, so an attacker cannot use error responses to fingerprint the system
- a small set of safe, specific messages is allowed: malformed JSON → `400`, body too large → `413`, unknown route → `404`

Authentication errors are deliberately vague in the same way: login and registration return the identical `"Invalid email or password."` whether the email is unknown or the password is wrong ([controllers/authController.js](API/controllers/authController.js)), so the API cannot be used to discover which email addresses have accounts.

## API Endpoints

| Method | Endpoint             | Auth required | Description |
|--------|----------------------|:-------------:|-------------|
| GET    | `/health`            | No            | Basic liveness check |
| POST   | `/api/auth/register` | No            | Register a new user - body: `name`, `email`, `password`, `role` (`client` or `freelancer`) |
| POST   | `/api/auth/login`    | No            | Authenticate and receive a JWT - body: `email`, `password` only (no `role`) |
| GET    | `/api/auth/me`       | Yes           | Returns the authenticated user's info |

Authenticated requests are identified by the `token` cookie (set automatically on login/register) or, for API clients, an `Authorization: Bearer <token>` header.

## Setup
**Requirements:** Node.js 20+, OpenSSL (for local cert generation).

Begin with 
```bash
cd API
npm install
```
 
Then Generate a local self-signed certificate:
 
```bash
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
  -keyout certs/key.pem -out certs/cert.pem -subj "/CN=localhost"
```
 
Then You Need to Create a `.env` file in `API/`:
 
```env
PORT=3443
JWT_SECRET=replace-with-a-long-random-string-min-32-chars
JWT_EXPIRES_IN=1h
APP_NAME=HustleHubPlusAPI
CORS_ORIGIN=https://localhost:5173
SSL_KEY_PATH=./certs/key.pem
SSL_CERT_PATH=./certs/cert.pem
EXPOSE_TOKEN_IN_BODY=true
```

`JWT_SECRET` must be at least 32 characters or the server will refuse to start. `APP_NAME` is the JWT issuer and is validated on every request. `CORS_ORIGIN` is the browser origin allowed to call the API (comma-separated for more than one). `EXPOSE_TOKEN_IN_BODY=true` makes register/login echo the JWT in the response body so Postman/Newman (no cookie jar) can capture it - leave it unset in a real deployment, where the `httpOnly` cookie is the only token transport.
 
And Then Lastly Run the server:
 
```bash
npm start
```
The API will be available with the link: `https://localhost:3443`.

## Testing

### Postman / Newman
The collection ([API/postman/HustleHub+ Part1.postman_collection.json](API/postman/HustleHub+%20Part1.postman_collection.json)) has **13 requests / 17 assertions**:

- **Success** - register (`201`), login (`200`), `/me` with a `Bearer` token (`200`), `/health` (`200`).
- **Auth failures** - `/me` with no token, wrong password, non-existent email (all `401`), duplicate email (`409`).
- **Validation failures** - missing field, weak password (both `400`).
- **Protocol / error-handler** - unknown route (`404`), malformed JSON (`400`), body over 10&nbsp;KB (`413`), each asserting the exact controlled error message so nothing internal leaks.

Run it headless with Newman:

```bash
cd API
npm run test:api
```

A captured run is committed at [API/postman/newman/newman-run.txt](API/postman/newman/newman-run.txt) (JSON export beside it): **13/13 requests, 17/17 assertions, 0 failures**. `EXPOSE_TOKEN_IN_BODY=true` must be set (see the `.env` above) so the `/me` test can read the token from the response body. Screenshots of the saved response examples are in the accompanying PDF.

### Unit self-check
The cookie/header token-parsing helper has an assert-based self-check:

```bash
cd API
npm run test:auth
```

## Demonstration Video

Youtube Video Link: https://youtu.be/LDcBwhAfzEg

## References

## References

- [1] 	Bitwarden, "What is password hashing?," 2026. [Online]. Available: https://bitwarden.com/resources/what-is-password-hashing/. [Accessed 3 September 2026].
- [2] 	S. Saha, "The JSON Web Token Handbook: Learn to Use JWTs for Web Authentication," Hashnode, 8 October 2025. [Online]. Available: https://www.freecodecamp.org/news/the-json-web-token-handbook-learn-to-use-jwts-for-web-authentication/. [Accessed 3 September 2026].
- [3] 	E. Rescorla, "The Transport Layer Security (TLS) Protocol Version 1.3," RFC 8446, Internet Engineering Task Force, August 2018. [Online]. Available: https://www.rfc-editor.org/rfc/rfc8446. [Accessed 5 September 2026].
- [4] 	J. Hodges, C. Jackson and A. Barth, "HTTP Strict Transport Security (HSTS)," RFC 6797, Internet Engineering Task Force, November 2012. [Online]. Available: https://www.rfc-editor.org/rfc/rfc6797. [Accessed 5 September 2026].
- [5] 	OWASP Foundation, "Transport Layer Security Cheat Sheet," OWASP Cheat Sheet Series, 2024. [Online]. Available: https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html. [Accessed 5 September 2026].
- [6] 	Helmet.js, "Helmet — Help secure Express apps with various HTTP headers," 2025. [Online]. Available: https://helmetjs.github.io/. [Accessed 5 September 2026].
- [7] 	Mozilla, "Content-Security-Policy," MDN Web Docs, 2026. [Online]. Available: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy. [Accessed 5 September 2026].
- [8] 	Mozilla, "Cross-Origin Resource Sharing (CORS)," MDN Web Docs, 2026. [Online]. Available: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS. [Accessed 5 September 2026].
- [9] 	OWASP Foundation, "Cross-Site Request Forgery Prevention Cheat Sheet," OWASP Cheat Sheet Series, 2024. [Online]. Available: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html. [Accessed 5 September 2026].
- [10] 	A. Barth, "HTTP State Management Mechanism," RFC 6265, Internet Engineering Task Force, April 2011. [Online]. Available: https://www.rfc-editor.org/rfc/rfc6265. [Accessed 5 September 2026].
- [11] 	P. A. Grassi, J. L. Fenton, E. M. Newton et al., "Digital Identity Guidelines: Authentication and Lifecycle Management," NIST Special Publication 800-63B, National Institute of Standards and Technology, June 2017. [Online]. Available: https://pages.nist.gov/800-63-3/sp800-63b.html. [Accessed 5 September 2026].
- [12] 	OWASP Foundation, "Session Management Cheat Sheet," OWASP Cheat Sheet Series, 2024. [Online]. Available: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html. [Accessed 5 September 2026].
- [13] 	M. Jones, J. Bradley and N. Sakimura, "JSON Web Token (JWT)," RFC 7519, Internet Engineering Task Force, May 2015. [Online]. Available: https://www.rfc-editor.org/rfc/rfc7519. [Accessed 5 September 2026].
- [14] 	OWASP Foundation, "JSON Web Token for Java Cheat Sheet," OWASP Cheat Sheet Series, 2024. [Online]. Available: https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html. [Accessed 5 September 2026].
- [15] 	OWASP Foundation, "Password Storage Cheat Sheet," OWASP Cheat Sheet Series, 2024. [Online]. Available: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html. [Accessed 5 September 2026].
- [16] 	OWASP Foundation, "Input Validation Cheat Sheet," OWASP Cheat Sheet Series, 2024. [Online]. Available: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html. [Accessed 5 September 2026].
- [17] 	OWASP Foundation, "OWASP Top 10:2021," OWASP Foundation, 2021. [Online]. Available: https://owasp.org/Top10/. [Accessed 5 September 2026].
- [18] 	OWASP Foundation, "Blocking Brute Force Attacks," OWASP Foundation, 2023. [Online]. Available: https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks. [Accessed 5 September 2026].
- [19] 	express-rate-limit, "express-rate-limit — Basic rate-limiting middleware for Express," npm, 2025. [Online]. Available: https://www.npmjs.com/package/express-rate-limit. [Accessed 5 September 2026].
- [20] 	OWASP Foundation, "Error Handling Cheat Sheet," OWASP Cheat Sheet Series, 2024. [Online]. Available: https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html. [Accessed 5 September 2026].
- [21] 	OWASP Foundation, "REST Security Cheat Sheet," OWASP Cheat Sheet Series, 2024. [Online]. Available: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html. [Accessed 5 September 2026].


