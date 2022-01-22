"use strict";
require("dotenv").config();
const Broker = require("../index").Kafka
const broker = new Broker();

const channelName = "test-channel";
let exchangeName = "test-exchange";

describe('# Test AMPQ connection', function () {
    let channel = null;
    let connection = null;
    beforeEach(async function () {
        connection = await broker.init();
    });

    it("Should Create A connection", async () => {
        expect(connection).not.toBe(null);
    });

    it("Should Create a  Queue", async () => {
        const {error, data} = await rabbitMQ.createQueue(channelName + "-1", {durable: true});
        console.log("Payload", data);
        expect(connection).not.toBe(null);
        expect(channel).not.toBe(null);
        expect(error).toBe(undefined)
        expect(data).toBe(true)
    });


    it("Should Push data to the queue", async () => {
        const payload = {
            timestamp: Date.now(),
            name: "A Name",
            email: "Email"
        };
        const {error, data} = await rabbitMQ.queue(channelName, payload, {persistent: true});
        expect(connection).not.toBe(null);
        expect(channel).not.toBe(null);
        expect(error).toBe(undefined)
        expect(data).toBe(true)
    });

    it("Should listen for data coming into the queue", async () => {
        rabbitMQ.listen(channelName, {noAck: false}, (payload, channel) => {
            expect(payload).not.toBe(null);
            expect(payload.content).not.toBe(null);
            expect(payload.content.toString()).not.toBe(null);
            channel.ack(payload);
        });

    });


    it("Should assert an exchange", async () => {
        const {error, data} = await rabbitMQ.assertExchange(exchangeName, "fanout", {durable: true});
        expect(error).toBe(undefined)
        expect(data).not.toBe(null);
        expect(data).not.toBe(null);
        expect(data.exchange).toBe(exchangeName)
    });


    it("Should publish to an exchange", async () => {
        const {error, data} = await rabbitMQ.assertExchange(exchangeName, "fanout", {durable: true});
        expect(error).toBe(undefined)
        expect(data).not.toBe(null)

        const {error: pushError, data: push} = await rabbitMQ.publish(exchangeName, '', {
            timestamp: Date.now(),
            name: "A Name",
            email: "Email"
        });
        expect(pushError).toBe(undefined)
        expect(push).not.toBe(null)
    });

    it("Should assert an exchange Queue", async () => {
        const {error, data} = await rabbitMQ.assertQueue(exchangeName, channelName);
        expect(error).toBe(undefined)
        expect(data).not.toBe(null)

        console.log("Queue", {error, data});
    });


    it("Should listen for data coming into the exchange queue", async () => {
        rabbitMQ.listen("test-exchange-queue", {noAck: false}, (payload, channel) => {
            console.log(payload.content.toString());
            expect(payload).to.not.be.null;
            expect(payload.content).to.not.be.null;
            expect(payload.content.toString()).to.not.be.null;
            channel.ack(payload);
            expect(connection).to.not.be.null;
            expect(channel).to.not.be.null;
        });
    });

    afterEach(async () => {
        await rabbitMQ.close();
    });
});
