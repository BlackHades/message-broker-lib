RabbitMQ 
===========
 RabbitMQ - an AMQP client for NodeJS

## Installation
```json
"dependencies": {
    "amqplib": "^0.5.5",
    "dotenv": "^8.1.0"
}
```
```npm install amqp-library```
## Requirements
- set the rabbitmq url in your .env.
```dotenv
RABBITMQ_URL=amqp://localhost
```
or
```javascript
//when initializing RabbitMQ, pass in the url
rabbitMQ.init("amqp://localhost")
.then(connection => {})
.catch(err => {});

```
## Initialization
```javascript
const RabbitMQ = require('rabbitmq');
```


### Basic functionality
- Create A Channel
```javascript
//(async/await)
const rabbitMQ = new RabbitMQ();
const connection = await rabbitMQ.init();
const channel = await rabbitMQ.createChannel(channelName, {
    durable: true //options: checkout https://www.rabbitmq.com for more options
});
```
- To queue a data for processing
```javascript
//(async/await)
const rabbitMQ = new RabbitMQ();
const connection = await rabbitMQ.init();
const channel = await rabbitMQ.createChannel(channelName, {
    durable: true //options: checkout https://www.rabbitmq.com for more options
});

const payload = {
            timestamp: Date.now(),
            name: "A Name",
            email: "Email"
        };
const data = await rabbitMQ.queue(channelName, payload,{persistent: true});
console.log("Payload", data); //{data: true}

```
-- To assert/create an exchange 
```javascript
const exchangeName = "logs";
const rabbitMQ = new RabbitMQ();
const connection = await rabbitMQ.init();
const exchange =  await rabbitMQ.assertExchange(exchangeName,"fanout", {durable: true}); //exchange types includes fanout, direct, topic and header.checkout https://www.rabbitmq.com for more exchange types. 
console.log({exchange});
//Exchange { exchange: { exchange: 'test-exchange' } }

```
-- To Publish to an exchange
```javascript
const exchangeName = "logs";
const rabbitMQ = new RabbitMQ();
const connection = await rabbitMQ.init();
const exchange =  await rabbitMQ.assertExchange(exchangeName,"fanout", {durable: true});
const push = await rabbitMQ.publish(exchangeName,'',{
    timestamp: Date.now(),
    name: "A Name",
    email: "Email"
});

console.log({push});
//{ push: true }
```

-- To create/assert A queue
```javascript
const exchangeName = "logs";
const queueName = "test-exchange-queue";
const queueOption = {exclusive: true};
const bindKey = "route"; //read more on routing here https://rabbitmq.com/tutorials/tutorial-four-javascript.html
const rabbitMQ = new RabbitMQ();
const connection = await rabbitMQ.init();
const queue =  await rabbitMQ.assertQueue(exchangeName, queueName, queueOption, bindKey);
console.log({queue});
//   queue: { queue: 'test-exchange-queue', messageCount: 0, consumerCount: 0 }

```
-- To listen to a queue and pull data for processing
```javascript
//(async/await)
const rabbitMQ = new RabbitMQ();
const connection = await rabbitMQ.init();
const channel = await rabbitMQ.createChannel(channelName, {
    durable: true //options: checkout https://www.rabbitmq.com for more options
});

rabbitMQ.listen(channelName,{
    noAck: false // listen options:checkout https://www.rabbitmq.com for more options
}, (payload) => {
    channel.ack(payload); //acknowledge that processing has been done and remove from queue
    expect(connection).to.not.be.null;
    expect(channel).to.not.be.null;
});

//Warning: If you enable acknowledgement {noAck: false}, the next data on the queue 
//won't be released by the queue until  the current data is acknowledge.
```

-- To close a connection
```javascript
    rabbitMQ.close();
```


### Tests
#### Cli
```bash
npm install
npm test
```

#### Contributors
- [Micheal Akinwonmi](https://github.com/blackhades)
