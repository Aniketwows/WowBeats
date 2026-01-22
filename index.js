require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const mongoose = require("mongoose");

const TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;
const MONGO_URI = process.env.MONGO_URI;

// ✅ Mongo Schema
const fileSchema = new mongoose.Schema(
  {
    clientId: { type: String, required: true }, // discord user id
    name: { type: String, required: true }, // file name
    link: { type: String, required: true }, // file link
    savedBy: { type: String, required: true }, // admin id
  },
  { timestamps: true }
);

fileSchema.index({ clientId: 1, name: 1 }, { unique: false });

const FileModel = mongoose.model("ClientFiles", fileSchema);

// ✅ Drive view link -> direct download (optional)
function convertDriveLink(link) {
  const match = link.match(/drive\.google\.com\/file\/d\/([^/]+)\//);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=download&id=${match[1]}`;
  }
  return link;
}

// ✅ Extract userId from mention
function extractUserId(mention) {
  return mention.replace(/[<@!>]/g, "");
}

const client = new Client({
  intents: [
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on("ready", () => {
  console.log(`✅ Bot Online: ${client.user.tag}`);
});

// ✅ DM ONLY handler
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.guild) return; // server messages ignore

  const text = message.content.trim();
  const lower = text.toLowerCase();

  // HELP
  if (lower === "help") {
    return message.reply(
      `✅ **Commands**\n\n` +
        `👤 **Client:**\n` +
        `• list\n` +
        `• get <FileName>\n\n` +
        `🛠️ **Admin:**\n` +
        `• save @client <FileName> <Link>\n` +
        `• list @client\n\n` +
        `Example:\nsave @Rahul LogoFinal https://drive.google.com/file/d/xxx/view`
    );
  }

  // ✅ ADMIN SAVE
  // save @client FileName Link
  if (lower.startsWith("save ")) {
    if (message.author.id !== ADMIN_ID) {
      return message.reply("❌ Only Admin can save files.");
    }

    const parts = text.split(" ");
    if (parts.length < 4) {
      return message.reply(
        "✅ Format:\nsave @client FileName Link\nExample:\nsave @Rahul LogoFinal https://drive.google.com/file/d/xxx/view"
      );
    }

    const mention = parts[1];
    const fileName = parts[2];
    const link = parts.slice(3).join(" ");

    const clientId = extractUserId(mention);
    const finalLink = convertDriveLink(link);

    try {
      await FileModel.create({
        clientId,
        name: fileName,
        link: finalLink,
        savedBy: message.author.id,
      });

      return message.reply(`✅ Saved for <@${clientId}> : **${fileName}**`);
    } catch (err) {
      console.log(err);
      return message.reply("❌ Error saving file. (Maybe DB issue)");
    }
  }

  // ✅ CLIENT LIST
  if (lower === "list") {
    const files = await FileModel.find({ clientId: message.author.id }).sort({
      createdAt: -1,
    });

    if (!files.length) {
      return message.reply("❌ No files saved for you yet.");
    }

    let reply = "📂 **Your Saved Files:**\n";
    files.forEach((f, i) => {
      reply += `${i + 1}) **${f.name}**\n`;
    });

    reply += `\nType: **get FileName**`;
    return message.reply(reply);
  }

  // ✅ CLIENT GET
  if (lower.startsWith("get ")) {
    const fileName = text.split(" ").slice(1).join(" ");

    const file = await FileModel.findOne({
      clientId: message.author.id,
      name: new RegExp(`^${fileName}$`, "i"),
    });

    if (!file) {
      return message.reply("❌ File not found. Type **list** to see your files.");
    }

    return message.reply(`✅ **${file.name}**\n🔗 ${file.link}`);
  }

  // ✅ ADMIN LIST FOR CLIENT
  // list @client
  if (lower.startsWith("list ")) {
    if (message.author.id !== ADMIN_ID) {
      return message.reply("❌ Only Admin can list other clients.");
    }

    const parts = text.split(" ");
    const mention = parts[1];
    const clientId = extractUserId(mention);

    const files = await FileModel.find({ clientId }).sort({ createdAt: -1 });

    if (!files.length) {
      return message.reply(`❌ No files saved for <@${clientId}> yet.`);
    }

    let reply = `📂 **Files saved for <@${clientId}>:**\n`;
    files.forEach((f, i) => {
      reply += `${i + 1}) **${f.name}** → ${f.link}\n`;
    });

    return message.reply(reply);
  }

  // fallback
  return message.reply("❓ Unknown command. Type **help**");
});

// ✅ Connect DB then start bot
(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB Connected");
    await client.login(TOKEN);
  } catch (err) {
    console.error("❌ Startup Error:", err);
  }
})();
