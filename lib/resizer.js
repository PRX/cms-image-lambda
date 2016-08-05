'use strict';

const url = require('url');
const path = require('path');
const Q = require('q');
const request = require('request');
const s3 = new (require('aws-sdk')).S3();
const gm = require('gm').subClass({imageMagick: true});
const UploadedFile = require('./uploaded-file');

const RESIZES = [
  {key: 'original'},
  {key: 'square', args: [75, 75]},
  {key: 'small', args: [120, 120]},
  {key: 'medium', args: [240, 240]}
];

// do all the things
exports.work = (imgEvent) => {
  let file = new UploadedFile(imgEvent);

  // process file - catch all but resize errors
  return exports.download(imgEvent.imageUploadPath).then(data => {
    file.setDownloaded(data);
    return exports.validate(file.buffer);
  }).then(info => {
    file.setValidated(info);
    return exports.resizeAll(file.buffer, file.path, file.name);
  }).then(resized => {
    file.setResized(resized);
    return true; // success!
  }).catch(err => {
    if (err.fromDownload || err.fromValidate) {
      return false; // non-fatal errors
    }
    throw err;
  }).finally(() => {
    return file.callback();
  });
}

// upload to final s3 destination
exports.upload = (fileStream, filePath, fileName, variation) => {
  if (variation) {
    let parts = path.parse(fileName);
    fileName = `${parts.name}_${variation}${parts.ext}`;
  }
  return Q.ninvoke(s3, 'upload', {
    Body: fileStream,
    Bucket: process.env.DESTINATION_BUCKET,
    Key: `${filePath}/${fileName}`
  });
}

// resize thumbs, then move to the destination
exports.resizeAll = (fileBuffer, filePath, fileName) => {
  return Q.all(RESIZES.map(size => {
    if (size.key === 'original') {
      return exports.upload(fileBuffer, filePath, fileName);
    } else {
      return exports.resize(fileBuffer, size.args).then(resizedStream => {
        return exports.upload(resizedStream, filePath, fileName, size.key);
      });
    }
  }));
}

// resize a file, returning a stream
exports.resize = (fileBuffer, resizeArgs) => {
  let magicker = gm(fileBuffer);
  let sizer = magicker.resize.apply(magicker, resizeArgs);
  return Q.ninvoke(sizer, 'stream').then(results => results[0]);
}

// identify and validate a file
exports.validate = (fileBuffer) => {
  return Q.ninvoke(gm(fileBuffer), 'identify').then(
    info => {
      let meta = {
        width: info.size.width,
        height: info.size.height,
        filesize: fileBuffer.length,
        format: info['format'].toLowerCase()
      };
      return meta;
    },
    err => {
      if (err.message.match(/no decode delegate for this image format/)) {
        err.fromValidate = true;
      } else if (err.message.match(/corrupt image/)) {
        err.fromValidate = true;
      }
      throw err;
    }
  );
}

// get a remote file source
exports.download = (uploadUrl) => {
  let fileName = path.basename(url.parse(uploadUrl || 'unknown').pathname);
  if (!uploadUrl) {
    return Q.reject(new Error('No url set for event'));
  } else if (uploadUrl.startsWith('s3://')) {
    let m = uploadUrl.match(/s3:\/\/([^\/]+)\/(.*)/);
    return Q.ninvoke(s3, 'getObject', {Bucket: m[1], Key: m[2]}).then(
      data => { return {name: fileName, buffer: data.Body}; },
      err => { err.fromDownload = true; throw err; }
    );
  } else if (uploadUrl.match(/^https?:\/\//)) {
    return Q.ninvoke(request, 'get', {url: uploadUrl, encoding: null}).then(resps => {
      if (resps[0].statusCode === 200) {
        return {name: fileName, buffer: resps[1]};
      } else {
        let err = new Error(`Got ${resps[0].statusCode} for url: ${uploadUrl}`);
        err.fromDownload = true;
        return Q.reject(err);
      }
    });
  } else {
    let err = new Error(`Unrecognized url format: ${uploadUrl}`);
    err.fromDownload = true;
    return Q.reject(err);
  }
}
