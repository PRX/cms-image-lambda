'use strict';

const fs = require('fs');
const s3 = new (require('aws-sdk')).S3();
const Buffer = require('buffer').Buffer;
const ImageEvent = require('../../lib/image-event');

// test env configuration
require('dotenv').config({path: `${__dirname}/../../config/test.env`});

// global includes
global.expect = require('chai').expect;
global.Q = require('q');

// helper methods
exports.minutesFromNow = (mins) => {
  return new Date((new Date()).getTime() + mins * 60000);
}
exports.readFile = (name) => {
  return fs.readFileSync(`${__dirname}/${name}`);
}
exports.readStream = (name) => {
  return fs.createReadStream(`${__dirname}/${name}`);
}

// temp file to s3
const putFiles = {};
exports.putS3TestFile = (fileName) => {
  if (!putFiles[fileName]) {
    putFiles[fileName] = true;
    before(function() {
      this.timeout(4000);
      return Q.ninvoke(s3, 'upload', {
        ACL: 'public-read',
        Body: exports.readFile(fileName),
        Bucket: process.env.TEST_BUCKET,
        Expires: exports.minutesFromNow(5),
        Key: `${process.env.TEST_FOLDER}/${fileName}`
      });
    });
  }
  return `${process.env.TEST_BUCKET}/${process.env.TEST_FOLDER}/${fileName}`;
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
exports.deleteS3 = (keys) => {
  if (keys.length < 1) return;
  return Q.ninvoke(s3, 'deleteObjects', {
    Bucket: process.env.DESTINATION_BUCKET,
    Delete: {Objects: keys.map(k => { return {Key: k}; })}
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
  return new ImageEvent({
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
  });
}
