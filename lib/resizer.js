'use strict';

const url = require('url');
const path = require('path');
const Q = require('q');
const bytes = require('bytes');
const request = require('request');
const s3 = new (require('aws-sdk')).S3();
const gm = require('gm').subClass({imageMagick: true});
const PassThrough = require('stream').PassThrough;
const Buffer = require('buffer').Buffer;

const RESIZES = {
  square: [75, 75],
  small: [120, 120],
  medium: [240, 240]
};

// do all the things
exports.work = (imgEvent) => {
  let fileDest = imgEvent.imageDestinationPath;

  return exports.download(imgEvent.body.upload_url).then(data => {
    let fileName = data.name;

    return exports.validate(data.buffer).then(info => {
      if (info) {
        let resizeThenUploads = [];

        // move original file
        resizeThenUploads.push(exports.upload(data.buffer, fileDest, fileName));

        // resize then move thumbnails
        Object.keys(RESIZES).forEach(key => {
          let thumb = exports.resize(data.buffer, RESIZES[key]).then(resizedStream => {
            return exports.upload(resizedStream, fileDest, fileName, key);
          });
          resizeThenUploads.push(thumb);
        });

        return Q.all(resizeThenUploads).then(() => {
          // TODO: sns that resizing/moving finished
          return true;
        });
      } else {
        // TODO: sns that this is an invalid image file
        return false;
      }
    });
  });
}

// upload to final s3 destination
exports.upload = (fileStream, filePath, fileName, variation) => {
  if (variation) {
    let parts = path.parse(fileName);
    fileName = `${parts.name}_${variation}${parts.ext}`;
  }
  return Q.ninvoke(s3, 'upload', {
    ACL: 'public-read',
    Body: fileStream,
    Bucket: process.env.DESTINATION_BUCKET,
    Key: `${filePath}/${fileName}`
  });
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
        mime: info['Mime type'].toLowerCase(),
        format: info['format'].toLowerCase()
      };
      return meta;
    },
    err => {
      if (err.message.match(/no decode delegate for this image format/)) {
        return null;
      } else if (err.message.match(/corrupt image/)) {
        return null;
      } else {
        throw err; // re-throws unknown imagemagick errors
      }
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
    return Q.ninvoke(s3, 'getObject', {Bucket: m[1], Key: m[2]}).then(data => {
      return {name: fileName, buffer: data.Body};
    });
  } else if (uploadUrl.match(/^https?:\/\//)) {
    return Q.ninvoke(request, 'get', {url: uploadUrl, encoding: null}).then(resps => {
      if (resps[0].statusCode === 200) {
        return {name: fileName, buffer: resps[1]};
      } else {
        return Q.reject(new Error(`Got ${resps[0].statusCode} for url: ${uploadUrl}`));
      }
    });
  } else {
    return Q.reject(new Error(`Unrecognized url format: ${url}`));
  }
}
