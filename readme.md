message-broker-lib 
===========
Connection management for amqplib. This is a wrapper around `amqplib` and `amqp-connection-manager` which provides automatic reconnects. 
Responses are always objects returning `error` or `data`


## Features
- Uses `amqp-connection-manager` for connection management
- Easy Installation and Use
- Simple Exposed Functions
- Clear Error Response

## Installation
```json
"dependencies": {
    "message-broker-lib": "^1.0.3"
}
```
```npm install message-broker-lib```

## Initialization
```javascript
const broker = require('message-broker-lib').RabbitMQ;
//when initializing RabbitMQ, pass in the url
//When no url is passed, RABBITMQ_CLUSTER_URL and/or RABBITMQ_URL from process.env is used
//When using cluster, URL should be passed as "amqp://localhost-1,amqp://localhost-2,amqp://localhost-3"
const connection = await broker.init({
    url: "amqp://localhost",
    heartbeat: 60 //in seconds
})

```


### Basic functionality
- Create A Channel
```javascript
const {error, data} = await rabbitMQ.createChannel((channel) => {
    return Promise.all([
        //all queue and exchange assertions and creation that needs tobe done, can be done here.
        channel.assertQueue(channelName, {durable: true})
    ])
});
```

- Create A Queue
```javascript
//(async/await)
const {error, data} = await broker.createQueue(channelName, {
    durable: true //options: checkout https://www.rabbitmq.com for more options
});
```
- To queue a data for processing
```javascript
//(async/await)
const payload = {
    timestamp: Date.now(),
    name: "A Name",
    email: "Email"
};
const {error, data} = await broker.queue(channelName, payload, {persistent: true});

```
-- To assert/create an exchange 
```javascript
const exchangeName = "logs";
const {error, data} =  await broker.assertExchange(exchangeName,"fanout", {durable: true}); //exchange types includes fanout, direct, topic and header.checkout https://www.rabbitmq.com for more exchange types. 
console.log({error, data});

```
-- To Publish to an exchange
```javascript
const exchangeName = "logs";
const {error, data} = await broker.publish(exchangeName,'',{
    timestamp: Date.now(),
    name: "A Name",
    email: "Email"
});

```

-- To create/assert A queue
```javascript
const exchangeName = "logs";
const queueName = "test-exchange-queue";
const queueOption = {exclusive: true, autoDelete: true};//if you want temporary queue
const bindKey = ""; //read more on routing here https://rabbitmq.com/tutorials/tutorial-four-javascript.html
const {error, data} =  await broker.assertQueue(exchangeName, queueName, queueOption, bindKey);
console.log({queue});
//   queue: { queue: 'test-exchange-queue', messageCount: 0, consumerCount: 0 }

```
-- To listen to a queue and pull data for processing
```javascript
//(async/await)
const prefetch = 1;
rabbitMQ.listen(channelName,{
    noAck: false // listen options:checkout https://www.rabbitmq.com for more options
}, (error, raw, channel) => {
    const stringPayload = raw.content.toString();
    const objectPayload = JSON.parse(stringPayload);
    //....process payload .../
    channel.ack(payload); //acknowledge that processing has been done and remove from queue
}, prefetch);

//Warning: If you enable acknowledgement {noAck: false}, the next data on the queue 
//won't be released by the queue until the current data is acknowledge.
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
