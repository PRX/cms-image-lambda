"use strict";

module.exports.buildRecord = (messageData, action) => {
  if (typeof messageData === 'string') {
    messageData = require(`./${messageData}`);
  }
  let message = {
    message_id: '11cba7cb-12af-4d46-9247-0b88949803db',
    app: 'cms',
    sent_at: '2016-07-20T17:57:06.762Z',
    subject: 'image',
    action: action || 'create',
    body: JSON.stringify(messageData)
  };
  let topic = 'test_announce_image_' + (action || 'create');
  return {
    EventSource: 'aws:sns',
    EventVersion: '1.0',
    EventSubscriptionArn: `arn:aws:sns:us-east-1:1234:${topic}:49d1d24f-e873-45f9-b9c0-ea50f8a118f3`,
    Sns: {
      Type: 'Notification',
      MessageId: '526e76d4-781e-55be-8e01-26ddc5ad17af',
      TopicArn: `arn:aws:sns:us-east-1:561178107736:${topic}`,
      Subject: null,
      Message: JSON.stringify(message),
      Timestamp: '2016-07-20T17:57:07.176Z',
      SignatureVersion: '1',
      Signature: 'something',
      SigningCertUrl: 'something',
      UnsubscribeUrl: 'something',
      MessageAttributes: {}
    }
  };
}
