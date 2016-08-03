'use strict';

let match = process.env.SQS_CALLBACK.match(/sqs\.(.+)\.amazonaws\.com/);
const region = match && match[1];
const sqs = new (require('aws-sdk')).SQS({region: region});
const Q = require('q');

module.exports = class UploadedFile {

  constructor(imgEvent) {
    this.id = imgEvent.imageId;
    this.path = imgEvent.imageDestinationPath;
    this.name = null;
    this.width = null;
    this.height = null;
    this.size = null;
    this.format = null;

    // the binary file buffer
    this.buffer = null;

    // state
    this.downloaded = false;
    this.valid = false;
    this.resized = false;
  }

  setDownloaded(downloadData) {
    if (downloadData) {
      this.name = downloadData.name;
      this.buffer = downloadData.buffer;
      this.downloaded = true;
    } else {
      this.downloaded = false;
    }
  }

  setValidated(validData) {
    if (validData) {
      this.width = validData.width;
      this.height = validData.height;
      this.size = validData.filesize;
      this.format = validData.format;
      this.valid = true;
    } else {
      this.valid = false;
    }
  }

  setResized(resizeSuccess) {
    if (resizeSuccess) {
      this.resized = true;
    } else {
      this.resized = false;
    }
  }

  toJSON() {
    return JSON.stringify({
      id: this.id,
      path: this.path,
      name: this.name,
      width: this.width,
      height: this.height,
      size: this.size,
      format: this.format,
      downloaded: this.downloaded,
      valid: this.valid,
      resized: this.resized
    });
  }

  callback() {
    return Q.ninvoke(sqs, 'sendMessage', {
      MessageBody: this.toJSON(),
      QueueUrl: process.env.SQS_CALLBACK
    });
  }

}
