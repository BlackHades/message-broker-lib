"use strict";
const {Kafka, logLevel} = require('kafkajs')

class RabbitMQ {
    constructor() {
        this.connection = null;
        this.retryCountBeforeExit = 10;
        this.producer = null;

        this.init = this.init.bind(this);
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
        let {url = process.env.KAFKA_CLUSTER_URL, heartbeat = 5, name = process.env.APP_NAME} = options;

        try {
            if (!url)
                throw Error("KAFKA URL is required");

            //We are splitting the URL because of clusters
            url = url.split(",");
            this.connection = new Kafka({
                clientId: name,
                brokers: url.split(","),
                connectionTimeout: parseInt(process.env.KAFKA_CONNECTION_TIMEOUT || 3000),
                requestTimeout: parseInt(process.env.KAFKA_REQUEST_TIMEOUT || 25000),
                logLevel: parseInt(process.env.KAFKA_LOG_LEVEL || logLevel.INFO),
                retry: {
                    initialRetryTime: 100,
                    retries: 10,
                }
            })

            return this.connection;
        } catch (e) {
            if (!this.retryCountBeforeExit) {
                console.log("Exiting....");
                process.exit(1);
            }
            this.retryCountBeforeExit -= 1;
            console.log("retryCountBeforeExit", this.retryCountBeforeExit);
            console.log("Reconnecting RabbitMQ", e);
            return this.init(options);
        }
    }

    async createProducer() {

        if (!this.connection)
            throw Error("Connection has not been made. Call the init function first");

        try {
            this.producer = this.connection.producer()
            return {data: this.producer};
        } catch (e) {
            console.error(e);
            return {error: e.message};
        }
    }



    /**
     *
     * @param {string} eventName
     * @param {string} payload
     * @return Promise<*>
     */
    async publish(eventName,  payload) {
        try {
            return {
                data: await this.producer.send({
                    topic: eventName,
                    messages: [{value: payload}]
                })
            };
        } catch (e) {
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
    async listen(channelName, options = {}, callback = null, prefetch = 1) {
        try {
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
        } catch (e) {
            callback(e.message);
        }
    }


    requeueDeadLetter(deadLetterQueueName, queueOptions = {}, callbackFn) {
        this.listen(deadLetterQueueName, queueOptions, async (error, raw, channel) => {
            if (error) {
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
                } catch (alreadyClosed) {
                    console.log(alreadyClosed.stackAtStateChange);
                }
            }
            return null;
        }, 5000);
    }

}

module.exports = RabbitMQ;
