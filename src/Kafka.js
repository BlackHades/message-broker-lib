"use strict";
const {Kafka, logLevel} = require('kafkajs')

class RabbitMQ {
    constructor() {
        this.connection = null;
        this.retryCountBeforeExit = 10;
        this.producer = null;
        this.consumer = null;

        this.init = this.init.bind(this);
        this.createTopics = this.createTopics.bind(this);
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
            if (!url) throw Error("KAFKA URL is required");

            //We are splitting the URL because of clusters
            url = url.split(",");
            const kafkaConfig = {
                clientId: name,
                brokers: url,
                ssl: true,
                sasl: {
                    mechanism: 'plain', // scram-sha-256 or scram-sha-512
                    username: process.env.KAFKA_SASL_USERNAME,
                    password: process.env.KAFKA_SASL_PASSWORD
                },
                connectionTimeout: parseInt(process.env.KAFKA_CONNECTION_TIMEOUT || 3000),
                requestTimeout: parseInt(process.env.KAFKA_REQUEST_TIMEOUT || 25000),
                logLevel: parseInt(process.env.KAFKA_LOG_LEVEL || logLevel.INFO),
                retry: {
                    initialRetryTime: 100,
                    retries: 10,
                }
            };
            this.connection = new Kafka(kafkaConfig)

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

    async createTopics(topics) {
        if (!this.connection)
            throw Error("Connection has not been initialized. Call the init function first");

        try {
            const admin = this.connection.admin();
            await admin.connect();

            if (!Array.isArray(topics)) {
                topics = [topics];
            }

            const kafkaTopics = [];
            for (let topic of topics) {
                console.log("Top", topic)
                if (!topic || topic.trim() === "") return {error: "Queue Name Cannot Be Empty"};
                kafkaTopics.push({
                    topic,
                    numPartitions: 6,
                    replicationFactor: 3,
                    configEntries:[{ name: 'cleanup.policy', value: 'compact' },{name: "retention.ms", value: "-1"}]
                })
            }

            console.log("kafkaTopics", kafkaTopics)

            await admin.createTopics({
                topics: kafkaTopics,
            });
            return {data: true};
        } catch (e) {
            console.error(e);
            return {error: e.message};
        }
    }

    async createProducer() {

        if (!this.connection)
            throw Error("Connection has not been made. Call the init function first");

        try {
            this.producer = this.connection.producer()
            await this.producer.connect()
            return {data: this.producer};
        } catch (e) {
            console.error(e);
            return {error: e.message};
        }
    }


    /**
     *
     * @param {string} eventName
     * @param {any} payload
     * @return Promise<*>
     */
    async publish(eventName, payload) {
        try {
            return {
                data: await this.producer.send({
                    topic: eventName,
                    messages: [{value: JSON.stringify(payload)}]
                })
            };
        } catch (e) {
            console.error(e);

            return {error: e.message};
        }
    }

    /**
     *
     * @param {string[]} topics
     * @param {string} groupId
     * @param {function} callback
     * @param fromBeginning
     * @param {number} prefetch
     * @return {null}
     */
    async listen(topics, groupId, callback = null, fromBeginning = false, prefetch = 1) {
        try {
            if (typeof callback != "function")
                throw  new Error("Callback must be a function");


            this.consumer = this.connection.consumer({ groupId });
            await this.consumer.connect()

            for(let topic of topics){
                await this.consumer.subscribe({topic, fromBeginning });
            }


            await this.consumer.run({
                partitionsConsumedConcurrently: prefetch,
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        console.log({
                            topic,
                            partition,
                            key: message?.key?.toString(),
                            value: message.value.toString(),
                            headers: message.headers,
                        })
                        return callback(null, message.value.toString(), {
                            topic,
                            partition,
                            key: message?.key?.toString(),
                            value: message.value.toString(),
                            headers: message.headers,
                        });
                    } catch (e) {
                        console.log("Kafka consumer error", e)
                        this.consumer.pause([{ topic }])
                        setTimeout(() => this.consumer.resume([{ topic }]), (e.retryAfter || 50) * 1000);
                        return callback(e.message);
                    }

                },
            })
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