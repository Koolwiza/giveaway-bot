const Giveaway = require('./Giveaway'),
    {
        MessageEmbed,
        User,
        Client,
        TextChannel,
        Message,
        MessageReaction
    } = require('discord.js'),
    moment = require('moment'),
    {
        stripIndent
    } = require('common-tags'),
    Enmap = require('enmap'),
    _ = require('lodash'),
    storedGiveaways = new Enmap({
        name: "giveaways",
        autoFetch: true,
        fetchAll: true
    }),
    defaultOptions = {
        reaction: "🎉",
        winMsg: `Congratulations {winner}! You won {prize}!\n{url}`,
        notEnoughMsg: `There weren't enough participants for me to decide a winner!\n{url}`,
        startEmbed: {},
        endEmbed: {},
        embed: {
            startMsg: "🎉 **Giveaway** 🎉",
            startEmbedColor: "BLUE",

            endMsg: "🎉 **Giveaway Ended** 🎉",
            endEmbedColor: "#000000"
        }
    },
    messages = new Enmap({
        name: "messages",
        fetchAll: true,
        autoFetch: true
    })

module.exports.giveaways = storedGiveaways

/**
 * @param {Client} client
 */

module.exports.GiveawayManager = class GiveawayManager {
    constructor(client, options) {
        this.options = {
            ...defaultOptions,
            ...options
        }

        this.giveaways = storedGiveaways
        this.client = client
        this.checkGiveaways()
    }

    /**
     * 
     * @param {Client} client Discord.Client instance
     * @param {TextChannel} channel A discord guild channel instance
     * @param {Message} message A message object received from Client.Message
     * @param {*} options Options for the giveaway
     */

    async create(channel, msg, options) {
        storedGiveaways.ensure('giveaways', [])
        if (typeof options.prize !== "string") throw Error(`prize must be string. Received type "${typeof options.prize}".`)
        if (isNaN(options.time)) throw Error(`time must be number. Received type "${typeof options.time}".`)
        if (isNaN(options.winners)) throw Error(`winners must be number. Received type "${typeof options.winner}".`)
        let user = msg.author
        let guild = this.client.guilds.cache.get(channel.guild.id)
        let message = await channel.messages.fetch(options.messageID)

        if (!user) throw Error(`host must be valid user id. Received type "${user}".`)
        if (!guild) throw Error(`guildID must be valid guild id. Received type "${guild}" when fetching.`)
        if (!channel) throw Error(`channelID must be valid channel id. Received type "${channel}" when fetching.`)
        if (!message) throw Error(`messageID must be valid message id. Received type "${message}" when fetching.`)

        const giveaway = new Giveaway({
            time: options.time,
            prize: options.prize,
            winners: options.winners,
            hostID: msg.author.id,
            guildID: channel.guild.id,
            channelID: channel.id
        })

        let embed = this.generateStartEmbed(this.options.startEmbed, giveaway)
        let reactMsg = await channel.send(this.options.embed.startMsg, embed)
        await reactMsg.react(this.options.reaction)
        giveaway.message = reactMsg.id
        storedGiveaways.set(`giveaways_${channel.guild.id}_${reactMsg.id}`, {
            ...giveaway,
            url: giveaway.getURL,
            hostMention: giveaway.hostedMention
        })
    }

    /**
     * 
     * @param {MessageReaction} reaction 
     * @param {User} user 
     * @param {Giveaway} giveaway 
     */

    async manageReaction(reaction, user) {
        let {
            message
        } = reaction
        let giveaway = this.giveaways.get(`giveaways_${message.guild.id}_${message.id}`)
        if (!giveaway) return;
        let passed = true
        if (giveaway.reqGuild) {
            let guild = client.guilds.cache.get(giveaway.reqGuild)
            if(!guild) return;
            let member = await guild.members.fetch(user.id)
            if(!member) passed = false
        } else if(giveaway.reqRole) {
            let guild = message.guild
            let member = await guild.members.fetch(user.id)
            if(!member.roles.cache.has(giveaway.reqRole)) passed = false
        } else if (giveaway.reqMessage) {
            let userMessages = messages.get(user.id)
            if(userMessages < giveaway.reqMessages) passed = false
        }

        return passed
    }

    /**
     * 
     * @param {Message} message 
     */

    add(message) {
        messages.ensure(message.author.id, 0)
        messages.inc(message.author.id)
    
    }

    checkGiveaways() {
        setInterval(() => {
            let giveaways = this.giveaways.filter((v, key) => key.startsWith(`giveaways`))
            if (!giveaways) return console.log("no giveaways")

            giveaways.forEach(c => {
                if (c.endDate < Date.now()) {
                    giveaways.set(`giveaways_${c.guild}_${c.message}`, true, "ended")
                }
            })
            this.endAllGiveaways(giveaways.filter(c => c.ended))
        }, 2 * 1000)
    }

    /**
     * @param {Giveaway[]} giveaways 
     */

    endAllGiveaways(giveaways) {
        giveaways.forEach(async c => {
            if (c.ended) {

                let guild = this.client.guilds.cache.get(c.guild)
                let channel = guild.channels.cache.get(c.channel)
                let message = await channel.messages.fetch(c.message)

                await this.end(message, c)

            }
        })
    }

    /**
     * 
     * @param {Message} message 
     * @param {Giveaway} giveaway
     */

    async end(message, giveaway) {
        if (!storedGiveaways.get(`giveaways_${giveaway.guild}_${giveaway.message}`)) return;

        let reactMsg = message
        await reactMsg.reactions.cache.get(this.options.reaction).users.fetch()
        let messageReactions = reactMsg.reactions.cache.get(this.options.reaction)
        let winners = messageReactions.users.cache
            .filter(c => !c.bot)
            .random(giveaway.winners)

        let embed = this.generateEndEmbed(this.options.endEmbed, giveaway, winners)
        reactMsg.edit(this.options.embed.endMsg, embed)

        let embedWinners = this.generateMentions(winners)
        let endMsg = embedWinners ? this.options.winMsg
            .replace(/\{winner\}/g, this.generateMentions(winners))
            .replace(/\{prize}/g, `**${giveaway.prize}**`)
            .replace(/\{url\}/g, giveaway.url) : this.options.notEnoughMsg
            .replace(/\{winner\}/g, this.generateMentions(winners))
            .replace(/\{prize}/g, `**${giveaway.prize}**`)
            .replace(/\{url\}/g, giveaway.url)

        let guild = this.client.guilds.cache.get(giveaway.guild)
        let channel = guild.channels.cache.get(giveaway.channel)
        channel.send(endMsg)

        this.giveaways.delete(`giveaways_${giveaway.guild}_${giveaway.message}`)

    }

    /** 
     * @param {MessageEmbed} embedData
     * @param {Giveaway} giveaway
     * @private
     */

    generateStartEmbed(embedData, giveaway) {

        let endDate = moment(giveaway.endDate).format('lll')
        let startDate = moment(giveaway.startDate).format('lll')
        let winners = giveaway.winners < 1 ? `${giveaway.winners} winners` : `${giveaway.winners} winner`

        if (embedData instanceof MessageEmbed) {
            let replacedEntries = Object.entries(embedData).map(([key, value]) => {
                if (value === null) return [key, value]
                if (!value.length && Array.isArray(value)) return [key, value]
                if (key === "type") return [key, value]

                if (Array.isArray(value)) {
                    value = value.value
                        .replace(/\{host\}/g, giveaway.hostedMention)
                        .replace(/\{endsAt\}/g, endDate)
                        .replace(/\{startsAt\}/g, startDate)
                        .replace(/\{winners\}/g, winners)
                        .replace(/\{prize\}/g, giveaway.prize)
                    return [key, value]
                }
                value = value
                    .replace(/\{host\}/g, giveaway.hostedMention)
                    .replace(/\{endsAt\}/g, endDate)
                    .replace(/\{startsAt\}/g, startDate)
                    .replace(/\{winners\}/g, winners)
                    .replace(/\{prize\}/g, giveaway.prize)
                return [key, value]
            })

            let replacedObject = Object.fromEntries(replacedEntries)
            return new MessageEmbed(replacedObject)
        } else {
            return new MessageEmbed({
                title: giveaway.prize,
                description: stripIndent(`React with ${this.options.reaction} to enter!
                
                Hosted by: ${giveaway.hostedMention}
                Ends at: ${endDate}
                Winners: ${winners}`),
                color: this.options.embed.startEmbedColor,
                footer: {
                    text: `Created by: Raccoon#7867`
                }
            })
        }
    }

    /** 
     * @private
     */
    generateEndEmbed(embedData, giveaway, winners) {
        let winnerMentions = this.generateMentions(winners)
        let endDate = moment(giveaway.endDate).format('lll')
        let startDate = moment(giveaway.startDate).format('lll')
        if (embedData instanceof MessageEmbed) {
            let replacedEntries = Object.entries(embedData).map(([key, value]) => {
                if (value === null) return [key, value]
                if (!value.length && Array.isArray(value)) return [key, value]
                if (key === "type") return [key, value]

                if (Array.isArray(value)) {
                    value = value.value
                        .replace(/\{host\}/g, giveaway.hostMention)
                        .replace(/\{endsAt\}/g, endDate)
                        .replace(/\{startsAt\}/g, startDate)
                        .replace(/\{winners\}/g, winnerMentions)
                        .replace(/\{prize\}/g, giveaway.prize)
                    return [key, value]
                }
                value = value
                    .replace(/\{host\}/g, giveaway.hostMention)
                    .replace(/\{endsAt\}/g, endDate)
                    .replace(/\{startsAt\}/g, startDate)
                    .replace(/\{winners\}/g, winnerMentions)
                    .replace(/\{prize\}/g, giveaway.prize)
                return [key, value]
            })
            let replacedObject = Object.fromEntries(replacedEntries)
            return new MessageEmbed(replacedObject)
        } else {
            return new MessageEmbed({
                title: giveaway.prize,
                description: stripIndent(`
                Hosted by: ${giveaway.hostMention}
                Ends at: ${endDate}
                Winners: ${winnerMentions ? winnerMentions : "Not enough participants"}`),
                color: this.endEmbedColor,
                footer: {
                    text: `Created by: Raccoon#7867`
                }
            })
        }
    }

    /** 
     * @private
     */
    generateMentions(users) { // supporst 1 user, 1 user id, or an array of those     
        if (Array.isArray(users)) {
            if (!users.length) return false
            return users.map(c => {
                if (c instanceof User) return c.toString()
                else return `<@${c}>`
            })
        } else {
            if (c instanceof User) return c.toString()
            else return `<@${c}>`
        }
    }
}