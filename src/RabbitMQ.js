"use strict";

const amqp = require('amqplib');
const debug = require("debug")("app:debug");

class RabbitMQ {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.channelName = null;
        this.createChannel = this.createChannel.bind(this);
        // return this.connection;
    }

    async init(rabbitMQUrl) {
        this.connection = await amqp.connect(rabbitMQUrl || process.env.RABBITMQ_URL);
        return this.connection;
    }


    async createChannel(channelName, options = {}) {
        if (!this.connection) {
            await this.init();
        }
        this.channel = await this.connection.createChannel();
        this.channel.assertQueue(channelName, options);
        return this.channel;
    }

    async queue(channelName, payload, options = {}) {
        if (!payload)
            throw new Error("Empty Payload");

        return await this.channel.sendToQueue(channelName, Buffer.from(JSON.stringify(payload)), options, {persistent: true});
    }

    listen(channelName, options = {}, callback = null) {
        if (typeof callback != "function")
            throw  new Error("Callback must be a function");
        this.channel.prefetch(1);

        this.channel.consume(channelName, (payload) => {
            callback(payload, this.channel);
        }, options);

        return this.channel;
    }

    close() {
        setTimeout(() => {
            if (this.connection) {
                debug("Closing AMPQ Connection");
                return this.connection.close();
            }
            return null;
        }, 500);
    }

}

module.exports = RabbitMQ;