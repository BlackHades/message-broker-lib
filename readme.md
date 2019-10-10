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
