"use strict";
const amqpConnectionManager = require('amqp-connection-manager');

class RabbitMQ {
    constructor() {
        this.connection = null;
        this.channel = null;
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
     * @param {string} options.url
     * @param {number} options.retryCountBeforeExit
     * @param {number} options.heartbeat
     * @return {Promise<null|*|undefined>}
     */
    async init(options = {}) {
        let {url = process.env.RABBITMQ_CLUSTER_URL || process.env.RABBITMQ_URL, heartbeat = 5} = options;

        try{
            if(!url)
                throw Error("RabbitMQ URL is required");

            //We are splitting the URL because of clusters
            url = url.split(",");
            this.connection = amqpConnectionManager.connect(url, {
                heartbeatIntervalInSeconds: heartbeat
            });

            return this.connection;
        }catch (e) {
            if(!this.retryCountBeforeExit) {
                console.log("Exiting....");
                process.exit(1);
            }
            this.retryCountBeforeExit -= 1;
            console.log("retryCountBeforeExit",this.retryCountBeforeExit);
            console.log("Reconnecting RabbitMQ",e);
            return this.init(options);
        }
    }


    async createChannel(callback) {
        if (!this.connection)
            throw Error("Connection has not been made. Call the init function first");

        try{
            const options = {
                json: true,
            }

            if(typeof callback == "function") options.setup = callback;
            this.channel = this.connection.createChannel(options);
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
            if(!Array.isArray(queueName)){
                queueName = [queueName];
            }
            for(let name of queueName){
                if(!name || name.trim() == "") return {error: "Queue Name Cannot Be Empty"};

                await this.channel.assertQueue(name, options);
            }
            return {data: true};
        }catch (e) {
            console.error(e);
            return {error: e.message};
        }
    }

    /**
     *
     * @param {string} channelName
     * @param {*} payload
     * @param {object} options
     * @returns {Promise<{data: *}|{error}>}
     */
    async queue(channelName, payload, options = {persistent: true}) {
        try{
            if (!payload) throw new Error("Empty Payload");
            return {data: await this.channel.sendToQueue(channelName, payload , options)};
        }catch (e) {
            console.error(e);
            return {error: e.message};
        }
    }

    /**
     *
     * @param {string} exchangeName
     * @param {string} exchangeType (fanout, direct, topic)
     * @param {Object} option
     * @return {Promise<{error: *}|{data: ({data}|{error: *})}>}
     */
    async assertExchange(exchangeName, exchangeType = "fanout", option = {}) {
        try{
            return {data: await this.channel.assertExchange(exchangeName, exchangeType, option)}
        }catch (e) {
            console.error(e);
            return {error: e.message};
        }
    }

    /***
     *
     * @param {string} exchangeName
     * @param {string} queueName
     * @param {Object} queueOption
     * @param {string} bindKey
     * @return {Promise<{data: *}|{error: *}>}
     */
    async assertQueue(exchangeName, queueName = "", queueOption = {}, bindKey = ''){
        try{
            let queue = await this.channel.assertQueue(queueName, queueOption);
            return {data: await this.channel.bindQueue(queue.queue, exchangeName, bindKey)};
        }catch (e) {
            console.error(e);
            return {error: e.message};
        }
    }

    /**
     *
     * @param {string} exchangeName
     * @param {string} routeKey
     * @param {string} payload
     * @return Promise<*>
     */
    async publish(exchangeName, routeKey = "", payload) {
        try{
            return {data: await this.channel.publish(exchangeName, routeKey, Buffer.from(JSON.stringify(payload)))};
        }catch (e) {

            console.error(e);
            return {error: e.message};
        }
    }

    /**
     *
     * @param {string} channelName
     * @param {Object} options
     * @param {function} callback
     * @param {number} prefetch
     * @return {null}
     */
    async listen(channelName, options = {}, callback = null, prefetch= 1 ) {
        try{
            if (typeof callback != "function")
                throw  new Error("Callback must be a function");

            //rabbitmq specification: a channel per queue
            const channel = await this.connection.createChannel({
                setup: (channel) => {
                    return channel.prefetch(prefetch);
                }
            });

            channel.consume(channelName, (payload) => {
                return callback(null, payload, channel);
            }, options);
        }catch (e) {
            callback(e.message);
        }
    }


    requeueDeadLetter(deadLetterQueueName, queueOptions = {}, callbackFn){
        this.listen(deadLetterQueueName, queueOptions, async (error, raw, channel) => {
            if(error){
                console.log(`=================== Error from  ${deadLetterQueueName} ==================`);
                throw Error(error);
                // return;
            }
            try {
                console.log("================== Listening =====================");
                let {queue, reason, payload, ...rest} = JSON.parse(raw.content.toString());
                console.log("Queue", queue, reason);
                if (!queue) return channel.ack(raw);
                await this.queue(queue, payload, {persistent: true});
                return channel.ack(raw);
            } catch (e) {
                console.log(e, JSON.stringify(e));
                await this.queue(deadLetterQueueName, JSON.parse(raw.content.toString()), {persistent: true});
                return channel.ack(raw);
            }
        }, parseInt(queueOptions?.prefetch || 1));

    }

    close() {
        setTimeout(() => {
            if (this.connection) {
                console.log("Closing AMPQ Connection");
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
