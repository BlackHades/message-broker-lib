"use strict";

const amqp = require('amqplib');
const debug = require("debug")("app:debug");

class RabbitMQ {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.channelName = null;
        this.init = this.init.bind(this);
        this.createChannel = this.createChannel.bind(this);
        this.queue = this.queue.bind(this);
        this.assertExchange = this.assertExchange.bind(this);
        this.assertQueue = this.assertQueue.bind(this);
        this.publish = this.publish.bind(this);
        this.listen = this.listen.bind(this);
    }

    async init(rabbitMQUrl) {
        rabbitMQUrl = rabbitMQUrl || process.env.RABBITMQ_URL;
        rabbitMQUrl = `${rabbitMQUrl}?heartbeat=15`;
        this.connection = await amqp.connect(rabbitMQUrl || process.env.RABBITMQ_URL);
        return this.connection;
    }


    async createChannel(channelName, options = {}) {
        if (!this.connection) {
            await this.init();
        }
        this.channel = await this.connection.createChannel();
        if(!channelName || channelName.trim() == "")
            return this.channel;
        this.channel.assertQueue(channelName, options);
        return this.channel;
    }

    async queue(channelName, payload, options = {}) {
        if (!payload)
            throw new Error("Empty Payload");

        return await this.channel.sendToQueue(channelName, Buffer.from(JSON.stringify(payload)), options, {persistent: true});
    }

    async assertExchange(exchangeName, exchangeType = "fanout", option = {}) {
        return await this.channel.assertExchange(exchangeName, exchangeType, option);
    }

    async assertQueue(exchangeName, queueName = "", queueOption = {}, bindKey = ''){
        let queue = await this.channel.assertQueue(queueName, queueOption);
        await this.channel.bindQueue(queue.queue, exchangeName, bindKey);
        return queue;
    }

    publish(exchangeName, routeKey = "", payload) {
        return this.channel.publish(exchangeName, routeKey, Buffer.from(JSON.stringify(payload)));
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