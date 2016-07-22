'use strict';

module.exports = class ImageEvent {

  constructor(data) {
    try {
      this.validateInput(data);
      this.topic = data.Sns.TopicArn;
      this.env = this.decodeEnvironment(data.Sns.TopicArn);

      // message and message-body properties
      let msg = this.decodeMessage(data.Sns.Message);
      this.id = msg.message_id;
      this.app = msg.app;
      this.sentAt = new Date(msg.sent_at);
      this.subject = msg.subject;
      this.action = msg.action;
      this.body = msg.body;
      this.validate();
    } catch (e) {
      if (typeof(e) === 'string') {
        this.invalid = e;
      } else {
        throw e;
      }
    }
  }

  validateInput(data) {
    if (data.EventSource && data.EventSource !== 'aws:sns') {
      throw `Unknown event source: ${data.EventSource}`;
    }
    if (!data.Sns || !data.Sns.TopicArn || !data.Sns.Message) {
      throw 'Bad event format: ' + JSON.stringify(data);
    }
  }

  validate() {
    if (this.env !== process.env.ENVIRONMENT) {
      throw `Environment mismatch for topic: ${this.topic}`;
    }
    if (this.subject !== 'image') {
      throw `Invalid message subject: ${this.subject}`;
    }
    if (['create', 'update', 'destroy'].indexOf(this.action) < 0) {
      throw `Invalid message action: ${this.action}`;
    }
  }

  decodeEnvironment(topicArn) {
    let topic = (topicArn || '').split(':').pop();
    if (topic.includes('_announce_')) {
      return topic.split('_announce_').shift();
    } else {
      return null;
    }
  }

  decodeMessage(msgString) {
    let msgObject;
    try {
      msgObject = JSON.parse(msgString);
    } catch(e) {
      throw `Invalid json for message: ${msgString}`;
    }
    if (msgObject.body) {
      try {
        msgObject.body = JSON.parse(msgObject.body);
      } catch(e) {
        throw `Invalid json message-body: ${msgObject.body}`;
      }
    }
    return msgObject;
  }

}
