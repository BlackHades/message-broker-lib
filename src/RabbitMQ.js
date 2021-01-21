"use strict";

const amqp = require('amqplib');
const debug = require("debug")("app:debug");

class RabbitMQ {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.channelName = null;
        this.retryCountBeforeExit = 10;
        this.init = this.init.bind(this);
        this.createChannel = this.createChannel.bind(this);
        this.queue = this.queue.bind(this);
        this.assertExchange = this.assertExchange.bind(this);
        this.assertQueue = this.assertQueue.bind(this);
        this.publish = this.publish.bind(this);
        this.listen = this.listen.bind(this);
    }

    /**
     *
     * @param {Object} options
     * @param {string} options.rabbitMQURL
     * @param {number} options.retryCountBeforeExit
     * @param {number} options.heartbeat
     * @return {Promise<null|*|undefined>}
     */
    async init(options = {}) {
        let {rabbitMQURL, heartbeat = 60} = options;
        try{
            if(!rabbitMQURL)
                throw Error("RabbitMQ URL is required");



            rabbitMQURL = `${rabbitMQURL}?heartbeat=${heartbeat}`;
            this.connection = await amqp.connect(rabbitMQURL);
            return this.connection;
        }catch (e) {
            if(!this.retryCountBeforeExit) {
                console.log("Exiting....");
                process.exit(1);
            }
            this.retryCountBeforeExit -= 1;
            console.log("retryCountBeforeExit",this.retryCountBeforeExit);
            console.log("Reconnecting RabbitMQ",e);
            return this.init(rabbitMQURL);
        }
    }


    async createChannel(options = {}) {
        if (!this.connection)
            throw Error("Connection has not been made. Call the init function first");

        try{
            this.channel = await this.connection.createChannel();
            return {data: this.channel};
        }catch (e) {
            console.error(e);
            return {error: e.message};
        }
    }

    /**
     *
     * @param {string} queueName
     * @param {Object} options
     * @return {Promise<null|{data: (Promise<*>|{durable: (boolean|*), ticket: number, autoDelete, exclusive, arguments: any, passive: boolean, queue: *, nowait: boolean})}|{error: *}>}
     */
    async createQueue(queueName, options = {}) {
        if (!this.connection)
            throw Error("Connection has not been initialized. Call the init function first");

        try{
            if(!queueName || queueName.trim() == "") return {error: "Queue Name Cannot Be Empty"};
            return {data: await this.channel.assertQueue(queueName, options)};
        }catch (e) {
            console.error(e);
            return {error: e.message};
        }
    }

    async queue(channelName, payload, options = {persistent: true}) {
        try{
            if (!payload) throw new Error("Empty Payload");
            if(typeof payload != "string") payload = JSON.stringify(payload);
            return {data: await this.channel.sendToQueue(channelName, Buffer.from(payload) , options)};
        }catch (e) {
            console.error(e);
            return {error: e.message};
        }
    }

    async assertExchange(exchangeName, exchangeType = "fanout", option = {}) {
        return this.channel.assertExchange(exchangeName, exchangeType, option);
    }

    async assertQueue(exchangeName, queueName = "", queueOption = {}, bindKey = ''){
        let queue = await this.channel.assertQueue(queueName, queueOption);
        await this.channel.bindQueue(queue.queue, exchangeName, bindKey);
        return queue;
    }

    publish(exchangeName, routeKey = "", payload) {
        return this.channel.publish(exchangeName, routeKey, Buffer.from(JSON.stringify(payload)));
    }

    listen(channelName, options = {}, callback = null, prefetch= 1 ) {
        if (typeof callback != "function")
            throw  new Error("Callback must be a function");

        this.channel.prefetch(prefetch);

        this.channel.consume(channelName, (payload) => {
            return callback(payload, this.channel);
        }, options);

        return this.channel;
    }


    handleError(error){

    }

    close() {
        setTimeout(() => {
            if (this.connection) {
                debug("Closing AMPQ Connection");
                try {
                    return this.connection.close();
                }
                catch (alreadyClosed) {
                    console.log(alreadyClosed.stackAtStateChange);
                }
            }
            return null;
        }, 5000);
    }

}

module.exports = RabbitMQ;
