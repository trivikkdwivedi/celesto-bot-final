const mongoose = require("mongoose");

async function connect(mongoUri) {
  if (!mongoUri) {
    console.log("MongoDB disabled.");
    return;
  }

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log("MongoDB Connected");
}

// OPTIONAL user model (for broadcast)
let userModel = null;
try {
  const schema = new mongoose.Schema({
    telegramId: String,
    username: String,
    firstName: String,
    createdAt: Date,
  });

  userModel = mongoose.model("User", schema);
} catch {}

module.exports = {
  connect,
  userModel,
};
