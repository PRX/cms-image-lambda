'use strict';

// test env configuration
require('dotenv').config({path: `${__dirname}/../../config/test.env`});
let match = process.env.SQS_CALLBACK.match(/sqs\.(.+)\.amazonaws\.com/);

const region = match && match[1];
const fs = require('fs');
const s3 = new (require('aws-sdk')).S3();
const sqs = new (require('aws-sdk')).SQS({region: region});
const Buffer = require('buffer').Buffer;
const ImageEvent = require('../../lib/image-event');

// global includes
global.expect = require('chai').expect;
global.Q = require('q');
global.sinon = require('sinon');

// helper methods
exports.minutesFromNow = (mins) => {
  return new Date((new Date()).getTime() + mins * 60000);
}
exports.path = (name) => {
  return `${__dirname}/${name}`;
}
exports.readFile = (name) => {
  return fs.readFileSync(`${__dirname}/${name}`);
}
exports.readStream = (name) => {
  return fs.createReadStream(`${__dirname}/${name}`);
}

// temp file to s3
const putFiles = {};
exports.putS3TestFile = (fileName, bucket, folder) => {
  bucket = bucket || process.env.TEST_BUCKET;
  folder = folder || process.env.TEST_FOLDER;

  if (!putFiles[fileName]) {
    putFiles[fileName] = true;
    before(function() {
      this.timeout(4000);
      return Q.ninvoke(s3, 'upload', {
        ACL: 'public-read',
        Body: exports.readFile(fileName),
        Bucket: bucket,
        Expires: exports.minutesFromNow(5),
        Key: `${folder}/${fileName}`
      });
    });
  }
  return `${bucket}/${folder}/${fileName}`;
}

// list files in a bucket folder
exports.listS3Path = (pathPrefix) => {
  return Q.ninvoke(s3, 'listObjects', {
    Bucket: process.env.DESTINATION_BUCKET,
    Prefix: pathPrefix
  }).then(data => {
    return data.Contents.map(c => c.Key);
  });
}
exports.getContentTypes = (keys) => {
  return Q.all(keys.map(k => {
    let params = {Bucket: process.env.DESTINATION_BUCKET, Key: k};
    return Q.ninvoke(s3, 'headObject', params).then(data => data.ContentType);
  }));
}
exports.fetchS3 = (key) => {
  return Q.ninvoke(s3, 'getObject', {
    Bucket: process.env.DESTINATION_BUCKET,
    Key: key
  }).then(data => data.Body);
}
exports.deleteS3 = (keys) => {
  if (keys.length < 1) return;
  return Q.ninvoke(s3, 'deleteObjects', {
    Bucket: process.env.DESTINATION_BUCKET,
    Delete: {Objects: keys.map(k => { return {Key: k}; })}
  });
}

// get messages from sqs
exports.fetchSQS = (appendTo) => {
  return Q.ninvoke(sqs, 'receiveMessage', {
    QueueUrl: process.env.SQS_CALLBACK,
    MaxNumberOfMessages: 10
  }).then(resp => {
    if (resp.Messages) {
      return Q.ninvoke(sqs, 'deleteMessageBatch', {
        QueueUrl: process.env.SQS_CALLBACK,
        Entries: resp.Messages.map(msg => {
          return {Id: msg.MessageId, ReceiptHandle: msg.ReceiptHandle};
        })
      }).then(() => {
        if (resp.Messages.length == 10) {
          return exports.fetchSQS((appendTo || []).concat(resp.Messages));
        } else {
          return (appendTo || []).concat(resp.Messages).map(msg => JSON.parse(msg.Body));
        }
      });
    } else {
      return [];
    }
  });
}

// load or build an image-event fixture
exports.buildEvent = (data) => {
  if (typeof(data) === 'string') {
    data = require(`./${data}`);
  }
  let i = new ImageEvent(data);
  i.validate = i.validate.bind(i); // chai needs this for to.throw
  return i;
}
exports.buildMessage = (action, msgBody) => {
  return new ImageEvent(exports.buildRaw(action, msgBody));
}
exports.buildRaw = (action, msgBody) => {
  return {
    EventSource: 'aws:sns',
    Sns: {
      TopicArn: `arn:aws:sns:us-east-1:1234:test_announce_image_${action}`,
      Subject: null,
      Message: JSON.stringify({
        app: 'cms',
        subject: 'image',
        action: action,
        body: JSON.stringify(msgBody)
      }),
      Timestamp: '2016-07-20T17:57:07.176Z'
    }
  };
}
