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
├── server.js                  # HTTPS entry point, boots the app
├── app.js                     # Express app: middleware, routes, error handling
├── config/
│   └── db.js                  # Mongo Database 
├── controllers/
│   └── authController.js      # register / login business logic
├── middleware/
│   ├── auth.js                # requireAuth (JWT verification), requireRole (RBAC stub)
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
<img width="1065" height="1202" alt="HustleHub-Architecture" src="https://github.com/user-attachments/assets/5254c4a8-5f8b-4c37-b328-521544ecec96" />

## Security Decisions
### Password Hashing
Password hashing is the process of converting a user's password into a fixed-length string data type object that is jumbled characters that are not easily decipherable or reversible [1]. A secure digital platform should never store passwords in plain text. Due to the nature of confidential and sensitive information data within the platform to ensure the security one of the choices is password hashing as a defense measure. With password hashing the platform can ensure the user's password remain protected from online attacks and HustleHub+ can protect its freelancers, clients and admins from password attacks. 

`const bcrypt = require("bcryptjs");`  

`const passwordHash = await bcrypt.hash(password, 12); `

With these simple lines of code, the platform is able to maintain secure function and protect its user base.

### JWT Authentication
JWT stands for JSON Web Tokens and at its core JWT is a JSON-based open standard format that allows for two parties to represent spefic claims in a secure process that ensure security [2]. On this platform securing an exchange of data between parties is vital as clients and freelancers should maintain secure data exchange otherwise there can fraud and scams on the platform. 

```
return jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || "1h" ,
      algorithm: "HS256",
      issuer: process.env.APP_NAME,
      audience: ["hustlehubClient"]
    }
```
With this code segment the implementation of JWT is set and allows the platform the security of authentication of this form and some of the choices made with regards to JWT includes:
- Minimum negative effects on security: The token only makes use of user's ID and role therefore other sensitive information remain protected incase of interception of token.
- Short-lived token: The solution has JWT on a 1 hour expiry time creating a limit on stolen tokens usability.
- Mandatory JWT secret: To maintain the 'signature' of the token a JWT secret is set and to secure the platform the server does not start without it.


### Input Validation

### HTTPS Importance

### Error Handling

## API Endpoints

| Method | Endpoint            | Auth required | Description                          |
|--------|----------------------|:--------------:|---------------------------------------|
| GET    | `/health`            | No             | Basic liveness check                  |
| POST   | `/api/auth/register` | No             | Register a new user                   |
| POST   | `/api/auth/login`    | No             | Authenticate and receive a JWT        |
| GET    | `/api/auth/me`       | Yes (Bearer)   | Returns the authenticated user's info |

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
JWT_SECRET=replace-with-a-long-random-string
JWT_EXPIRES_IN=1h
SSL_KEY_PATH=./certs/key.pem
SSL_CERT_PATH=./certs/cert.pem
```
 
And Then Lastly Run the server:
 
```bash
npm start
```
The API will be available with the link: `https://localhost:3443`.

## Testing
API endpoints (`/register`, `/login`, `/me`) were tested with Postman,
covering successful registration and login, and invalid scenarios (missing
fields, weak passwords, duplicate email, wrong credentials, no
tokens). See the accompanying Postman collection and screenshots within the PDF.
