db = db.getSiblingDB("webhook_viewer");

db.createUser({
    user: process.env.MONGO_USER || "webhook_user",
    pwd: process.env.MONGO_USER_PASSWORD || "WebhookUserPassword456!",
    roles: [{ role: "readWrite", db: "webhook_viewer" }]
});

print("MongoDB init script finished");
