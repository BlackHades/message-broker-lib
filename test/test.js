"use strict";
require("dotenv").config();
const expect = require('chai').expect;
const audit = require("../index");
const RabbitMQ = require("../src/RabbitMQ");
const rabbitMQ = new RabbitMQ();
const channelName = "test-channel";
describe('# Test AMPQ connection', function () {
    let channel = null;
    let connection = null;
    before(async function() {
        connection = await rabbitMQ.init();
        channel = await rabbitMQ.createChannel(channelName, {
            durable: true
        });
    });

    it("Should Create A Channel", async () => {
        expect(connection).to.not.be.null;
        expect(channel).to.not.be.null;
    });

    it("Should Create A Channel", async () => {
        expect(connection).to.not.be.null;
        expect(channel).to.not.be.null;
    });

    it("Should Push data to the queue", async () => {
        const payload = {
            timestamp: Date.now(),
            name: "A Name",
            email: "Email"
        };
        const data = await rabbitMQ.queue(payload,{persistent: true});
        console.log("Payload", data);
        expect(connection).to.not.be.null;
        expect(channel).to.not.be.null;
        expect(data).to.not.be.an("object");
        expect(data).to.be.equal(true);
    });

    it("Should listen for data coming into the queue queue", async () => {
        rabbitMQ.listen({noAck: false}, (payload) => {
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