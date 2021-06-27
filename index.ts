import Discord, { TextChannel } from "discord.js";
const client = new Discord.Client();
import { GiveawayManager } from "./struct/GiveawayManager";
import { prefix, token } from "./config.json";
const manager = new GiveawayManager(client);
import ms from "ms";

client.on("ready", () => {
  console.clear();
  console.log(`${client.user?.tag} is online!`);
});

client.on("message", async (message) => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  manager.add(message);
  let args = message.content.trim().slice(prefix.length).split(/\s+/g);
  let command = args.shift()?.toLowerCase();

  if (command === "create") {
    let time = ms(args[1]);
    let winners = parseInt(args[2]);
    let prize = args.slice(3).join(" ");
    if (!time || isNaN(time))
      return message.channel.send("Please provide a valid time");
    if (!winners || isNaN(winners))
      return message.channel.send("Please provide a valid winners number");
    if (!prize) return message.channel.send("Please provide a prize");

    await manager.create(
      message.mentions.channels.first() || (message.channel as TextChannel),
      message,
      {
        time: time,
        prize: prize,
        winners: winners,
      }
    );

    message.channel.send("Giveaway created!");
  }
});

client.login(token);
