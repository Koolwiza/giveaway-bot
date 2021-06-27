import { GiveawayOptions } from "./interfaces";
export default class Giveaway {
  public time;
  public prize;
  public winners;
  public host;
  public startDate;
  public endDate;
  public reqGuild: any;
  public reqMessage: any;
  public reqRole: any;
  public channel: any;
  public message: any;
  public guild: any;
  public ended: Boolean;
  constructor(options: GiveawayOptions) {
    this.time = options.time;
    this.prize = options.prize;
    this.winners = options.winners;
    this.host = options.hostID;
    this.startDate = Date.now();
    this.endDate = Date.now() + this.time;

    this.channel = options.channelID;
    this.message = options.messageID;
    this.guild = options.guildID;
    this.ended = false;

    this.reqGuild = undefined;
    this.reqMessage = undefined;
    this.reqRole = undefined;
  }

  get getURL() {
    return `https://www.discord.com/channels/${this.guild}/${this.channel}/${this.message}`;
  }

  get hostedMention() {
    return `<@${this.host}>`;
  }
}
