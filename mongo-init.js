// Run by the mongo-init service as root on every `up`, so it also covers data
// volumes created before this user existed and picks up a changed password.
const app = db.getSiblingDB("hustlehub");
const spec = { pwd: process.env.MONGO_APP_PASSWORD, roles: [{ role: "readWrite", db: "hustlehub" }] };

if (app.getUser("hustlehub_app")) {
  app.updateUser("hustlehub_app", spec);
} else {
  app.createUser({ user: "hustlehub_app", ...spec });
}
