"use strict";



const RabbitMQ = require("./src/RabbitMQ")
const rabbitMQ = new RabbitMQ();


async function init(){
    const payload = {
        timestamp: Date.now(),
        name: "A Name",
        email: "Email"
    };
    const connection = await  rabbitMQ.init({
        url: "amqp://guest:guest@194.99.21.28:5672"
    });

    const channel = await  rabbitMQ.createChannel();

    const {error, data} = await rabbitMQ.queue("test-channel", payload, {persistent: true});
    console.log("Error", error, data)
}

init()
    .then(console.log)
    .catch(console.log)
// init();
module.exports = {
    RabbitMQ: require("./src/RabbitMQ")
}
