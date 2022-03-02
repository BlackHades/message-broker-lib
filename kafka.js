const { Kafka, logLevel} = require('kafkajs')

const kafka = new Kafka({
    clientId: 'my-app',
    brokers: ['194.99.21.222:9092'],
    // ssl: true,
    // sasl: {
    //     mechanism: 'plain', // scram-sha-256 or scram-sha-512
    //     username: "RFYODITNTCAMOUHA",
    //     password: "+2RHsqskk/7iEQEi93b5J3o8pJbCPQE0/NO73ePDN6IYZdYQI24O4qSOKtRfETqn"
    // },
    connectionTimeout: parseInt(process.env.KAFKA_CONNECTION_TIMEOUT || 3000),
    requestTimeout: parseInt(process.env.KAFKA_REQUEST_TIMEOUT || 25000),
    logLevel: parseInt(process.env.KAFKA_LOG_LEVEL || logLevel.INFO),
    retry: {
        initialRetryTime: 100,
        retries: 10,
    }
})

async function produce(){
    const admin = kafka.admin()
    await admin.connect()
    await admin.createTopics({
        waitForLeaders: true,
        topics: [
            { topic: 'user.created' },
        ],
    })
    const producer = kafka.producer()

    await producer.connect()

    for(let i = 0; i < 10; i++){
        const res = await producer.send({
            topic: 'user.created',
            messages: [
                { value: 'Hello KafkaJS user! ' + (i+10), key: "users"},
            ],
        });

        console.log(res, i)

    }

    await producer.disconnect()
}

async function consume(){
    const consumer = kafka.consumer({ groupId: 'my-group-2' })
    await consumer.connect()

    await consumer.subscribe({ topic: 'user.created', fromBeginning: true })

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            console.log({
                h: "here",
                topic,
                partition,
                key: message.key.toString(),
                value: message.value.toString(),
                headers: message.headers,
            })
        },
    })
}
produce();
// consume();
