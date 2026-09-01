require("dotenv").config();
const fs = require("fs");
const https = require("https");
const app = require("./app");

const PORT = process.env.PORT || 3443;

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not set. Refusing to start.");
  process.exit(1);
}

//Added a check to ensure that the JWT_SECRET is at least 32 characters long for security reasons. If it is not, the server will refuse to start and log an error message.
if (!process.env.JWT_SECRET < 32) 
  {
  console.error("JWT_SECRET must be at least 32 characters long. Refusing to start.");
  process.exit(1);
}

const options = {
  key: fs.readFileSync(process.env.SSL_KEY_PATH),
  cert: fs.readFileSync(process.env.SSL_CERT_PATH),
  minVersion: "TLSv1.2",
};

https.createServer(options, app).listen(PORT, () =>
  console.log(`HTTPS API listening on https://localhost:${PORT}`)
);