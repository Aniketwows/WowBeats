const {
  Client,
  GatewayIntentBits,
  ActivityType,
  SlashCommandBuilder,
  Routes,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const { REST } = require("@discordjs/rest");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

/* ================= CONFIG ================= */
const ROLE_NAME = "Aniketshare/Noti";
const BRAND_COLOR = 0x595967;
const SEPARATOR = "----------------";

/* ================= AUTO STATUS ================= */
const statuses = [
  { name: "Designing in Photoshop 🎨", type: ActivityType.Playing },
  { name: "Turning Ideas into Art ✨", type: ActivityType.Watching },
  { name: "Creative Mode: ON ⚡", type: ActivityType.Listening }
];
let statusIndex = 0;

/* ================= SLASH COMMAND ================= */
const commands = [
  new SlashCommandBuilder()
    .setName("noti")
    .setDescription("Send professional DM notification")
    .setDefaultMemberPermissions(0)
    .addUserOption(o =>
      o.setName("user").setDescription("User to notify").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("project").setDescription("Project name").setRequired(false)
    )
    .addStringOption(o =>
      o
        .setName("filename")
        .setDescription("File names (use | for multiple)")
        .setRequired(false)
    )
    .addStringOption(o =>
      o.setName("status").setDescription("Status").setRequired(false)
    )
    .addStringOption(o =>
      o.setName("size").setDescription("File size").setRequired(false)
    )
    .addStringOption(o =>
      o
        .setName("link")
        .setDescription("File link (button only)")
        .setRequired(false)
    )
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

/* ================= READY ================= */
client.once("clientReady", async () => {
  console.log(`✅ Bot Online: ${client.user.tag}`);
  client.user.setStatus("online");

  setInterval(() => {
    const s = statuses[statusIndex];
    client.user.setActivity(s.name, { type: s.type });
    statusIndex = (statusIndex + 1) % statuses.length;
  }, 10000);

  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );

  console.log("✅ /noti command registered");
});

/* ================= COMMAND HANDLER ================= */
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "noti") return;

  if (!interaction.member.roles.cache.some(r => r.name === ROLE_NAME)) {
    return interaction.reply({
      content: "❌ You don't have permission to use this command.",
      ephemeral: true
    });
  }

  const user = interaction.options.getUser("user");

  const project = interaction.options.getString("project") || "—";
  const status  = interaction.options.getString("status") || "In progress";
  const size    = interaction.options.getString("size") || "N/A";
  const link    = interaction.options.getString("link");

  /* ===== FILE LIST ( | → multiline ) ===== */
  const fileInput = interaction.options.getString("filename") || "—";
  const files = fileInput.includes("|")
    ? fileInput
        .split("|")
        .map(f => `• ${f.trim()}`)
        .join("\n")
    : fileInput;

  /* ========== EMBED ========== */
  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setAuthor({
      name: `Notification from AniketwOw `,
      iconURL: interaction.guild.iconURL({ dynamic: true })
    })
    .setDescription(
      `**Project:** ${project}\n` +
      `${SEPARATOR}\n` +
      `**Files:**\n${files}\n` +
      `${SEPARATOR}\n` +
      `Status: ${status}\n` +
      `Size: ${size}`
    )
    .setTimestamp();

  /* ========== BUTTON ========== */
  const components = [];

  if (link) {
    components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("📥 Open Files")
          .setStyle(ButtonStyle.Link)
          .setURL(link.trim())
      )
    );
  }

  try {
    await user.send({ embeds: [embed], components });

    await interaction.reply({
      content: `✅ Notification sent to **${user.tag}**`,
      ephemeral: true
    });
  } catch {
    await interaction.reply({
      content: "❌ User ke DMs closed hain.",
      ephemeral: true
    });
  }
});

/* ================= TEST ================= */
client.on("messageCreate", msg => {
  if (msg.author.bot) return;
  if (msg.content === "!ping") msg.reply("🏓 Pong!");
});

client.login(process.env.TOKEN);





