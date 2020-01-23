"use strict";
require("dotenv").config();
const expect = require('chai').expect;
const audit = require("../index");
const RabbitMQ = require("../src/RabbitMQ");
const rabbitMQ = new RabbitMQ();
const channelName = "test-channel";
let exchangeName = "test-exchange";
describe('# Test AMPQ connection', function () {
    let channel = null;
    let connection = null;
    before(async function() {
        connection = await rabbitMQ.init();
        channel = await rabbitMQ.createChannel(channelName, {
            durable: true
        });
    });

    it.only("Should Create A Channel", async () => {
        expect(connection).to.not.be.null;
        expect(channel).to.not.be.null;
    });

    it("Should Push data to the queue", async () => {
        const payload = {
            timestamp: Date.now(),
            name: "A Name",
            email: "Email"
        };
        const data = await rabbitMQ.queue(channelName, payload,{persistent: true});
        console.log("Payload", data);
        expect(connection).to.not.be.null;
        expect(channel).to.not.be.null;
        expect(data).to.not.be.an("object");
        expect(data).to.be.equal(true);
    });

    it("Should listen for data coming into the queue", async () => {
        rabbitMQ.listen(channelName,{noAck: false}, (payload, channel) => {
            expect(payload).to.not.be.null;
            expect(payload.content).to.not.be.null;
            expect(payload.content.toString()).to.not.be.null;
            channel.ack(payload);
            expect(connection).to.not.be.null;
            expect(channel).to.not.be.null;
        });
    });



    it("Should assert an exchange", async () => {
        const exchange =  await rabbitMQ.assertExchange(exchangeName,"fanout", {durable: true});
        expect(exchange).to.not.be.null;
        expect(exchange).to.be.an("object");
        expect(exchange.exchange).to.be.equal(exchangeName);
        console.log("Exchange", {exchange});
    });


    it("Should publish to an exchange", async () => {
        const exchange =  await rabbitMQ.assertExchange(exchangeName,"fanout", {durable: true});
        const push = await rabbitMQ.publish(exchangeName,'',{
            timestamp: Date.now(),
            name: "A Name",
            email: "Email"
        });
        expect(exchange).to.not.be.null;
        expect(exchange).to.be.an("object");
        expect(exchange.exchange).to.be.equal(exchangeName);
        console.log("Exchange", {exchange}, {push});
    });

    it("Should assert an exchange Queue", async () => {
        const queue =  await rabbitMQ.assertQueue(exchangeName,"test-exchange-queue");
        expect(queue).to.not.be.null;
        expect(queue.queue).not.null;
        console.log("Queue", {queue});
    });



    it("Should listen for data coming into the exchange queue", async () => {
        rabbitMQ.listen("test-exchange-queue",{noAck: false}, (payload, channel) => {
            console.log(payload.content.toString());
            expect(payload).to.not.be.null;
            expect(payload.content).to.not.be.null;
            expect(payload.content.toString()).to.not.be.null;
            channel.ack(payload);
            expect(connection).to.not.be.null;
            expect(channel).to.not.be.null;
        });
    });

    after(async () => {
       await rabbitMQ.close() ;
    });
});