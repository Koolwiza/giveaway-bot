export interface DefaultOptions {
  reaction: "🎉";
  winMsg: `Congratulations {winner}! You won {prize}!\n{url}`;
  notEnoughMsg: `There weren't enough participants for me to decide a winner!\n{url}`;
  startEmbed: {};
  endEmbed: {};
  embed: {
    startMsg: "🎉 **Giveaway** 🎉";
    startEmbedColor: "BLUE";

    endMsg: "🎉 **Giveaway Ended** 🎉";
    endEmbedColor: "#000000";
  };
}
export interface GiveawayOptions {
  time: number;
  prize: string;
  winners: number;
  hostID: string;
  startDate?: Date;
  endDate?: Date;
  reqGuild?: any;
  reqMessage?: any;
  reqRole?: any;
  channelID: string;
  messageID?: string;
  guildID: string;
  ended?: Boolean;
}
