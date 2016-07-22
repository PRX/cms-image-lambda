'use strict';

let Q = require('q');
let request = require('request');
let s3 = new (require('aws-sdk')).S3();
let gm = require('gm').subClass({imageMagick: true});

module.exports.validate = (imgEvent) => {
  return getFile(imgEvent.body.upload_url).then(file => {
    return Q.ninvoke(gm(file), 'identify', {bufferStream: true}).then(info => {
      console.log('info:', info);
      return true;
    });
  });
}

const getFile = (url) => {
  if (!url) {
    return Q.reject('No upload_url set for event');
  } else if (url.startsWith('s3://')) {
    let m = url.match(/s3:\/\/([^\/]+)\/(.*)/);
    return Q.ninvoke(s3, 'getObject', {Bucket: m[1], Key: m[2]}).then(data => data.Body);
  } else if (url.match(/^https?:\/\//)) {
    return Q.ninvoke(request, 'get', url);
  } else {
    return Q.reject(`Unrecognized upload_url format: ${url}`);
  }
}
