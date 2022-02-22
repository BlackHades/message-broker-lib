message-broker-lib 
===========
Connection management for amqplib. This is a wrapper around `kafkajs`. 
Responses are always objects returning `error` or `data`


## Features
- Easy Installation and Use
- Simple Exposed Functions
- Clear Error Response

## Installation
```json
"dependencies": {
    "message-broker-lib": "^2.1.0"
}
```
```npm install message-broker-lib```

## Initialization
```javascript
const broker = require('message-broker-lib').Kafka;
//when initializing RabbitMQ, pass in the url
//When no url is passed, KAFKA_CLUSTER_URL from process.env is used
//When using cluster, URL should be passed as "localhost-1,localhost-2,localhost-3"
const connection = await broker.init()

```


### Basic functionality
- Create A Topic
```javascript
const {error, data} = await broker.createTopics([{
    name: "users",
    replicationFactor: 1,
    numberOfPartitions: 3
}]);
```

- Produce a message
```javascript
//(async/await)
const payload = {
    timestamp: Date.now(),
    name: "A Name",
    email: "Email"
};
await broker.createProducer();
const {error, data} = await broker.publish(topic, key, payload);
```


-- To listen to a queue and pull data for processing
```javascript
//(async/await)
const prefetch = 1;
broker.listen(["user.created"], "users-9", (error, payload, args) => {
    expect(payload).not.toBe(null);
    expect(error).toBe(null);
}, true);

```

-- To close a connection
```javascript
    broker.close();
```


### Tests
#### Cli
```bash
npm install
npm test
```

#### Contributors
- [Micheal Akinwonmi](https://github.com/blackhades)
