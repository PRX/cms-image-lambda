'use strict';

const url = require('url');
const os = require('os');
const fs = require('fs');
const path = require('path');
const Q = require('q');
const request = require('request');
const s3 = new (require('aws-sdk')).S3();
const sharp = require('sharp');
const UploadedFile = require('./uploaded-file');

const RESIZES = [
  {key: 'original'},
  {key: 'square', width: 75, height: 75, exact: true},
  {key: 'small', width: 120, height: 120},
  {key: 'medium', width: 240, height: 240}
];

// do all the things
exports.work = (imgEvent) => {
  let file = new UploadedFile(imgEvent);

  // process file - catch all but resize errors
  return exports.download(imgEvent.imageUploadPath).then(data => {
    file.setDownloaded(data);
    return exports.validate(file.tmpPath);
  }).then(info => {
    file.setValidated(info);
    let type = file.format ? `image/${file.format}` : undefined;
    return exports.resizeAll(file.tmpPath, file.tmpS3Bucket, file.tmpS3Key, file.destPath, type);
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
exports.upload = (tmpFile, destPath, contentType) => {
  let fileName = path.basename(tmpFile);
  return Q.ninvoke(s3, 'upload', {
    Body: fs.createReadStream(tmpFile),
    Bucket: process.env.DESTINATION_BUCKET,
    Key: `${destPath}/${fileName}`,
    ContentType: contentType
  });
}

// copy between s3 locations
exports.copy = (tmpBucket, tmpKey, destPath, contentType) => {
  let fileName = path.basename(tmpKey);
  return Q.ninvoke(s3, 'copyObject', {
    CopySource: `${tmpBucket}/${tmpKey}`,
    Bucket: process.env.DESTINATION_BUCKET,
    Key: `${destPath}/${fileName}`,
    MetadataDirective: 'REPLACE',
    ContentType: contentType
  });
}

// resize thumbs, then move to the destination
exports.resizeAll = (tmpFile, tmpS3Bucket, tmpS3Key, destPath, contentType) => {
  return Q.all(RESIZES.map(size => {
    if (size.key === 'original' && tmpS3Bucket && tmpS3Key) {
      return exports.copy(tmpS3Bucket, tmpS3Key, destPath, contentType);
    } else if (size.key === 'original') {
      return exports.upload(tmpFile, destPath, contentType);
    } else {
      return exports.resize(tmpFile, size).then(data => {
        return exports.upload(data.path, destPath, contentType);
      });
    }
  }));
}

// resize a file, returning metadata about the file
exports.resize = (tmpFile, size) => {
  let resize = sharp(tmpFile).resize(size.width, size.height);
  if (size.exact) {
    resize = resize.crop(sharp.strategy.entropy);
  } else {
    resize = resize.max();
  }

  let parts = path.parse(tmpFile);
  let dest = os.tmpdir() + `/${parts.name}_${size.key}${parts.ext}`;
  return resize.toFile(dest).then(data => {
    data.path = dest;
    return data;
  });
}

// identify and validate a file
exports.validate = (tmpFile) => {
  let stat = Q.ninvoke(fs, 'stat', tmpFile);
  let info = sharp(tmpFile).metadata();
  return Q.all([stat, info]).then(
    res => {
      return {
        width: res[1].width,
        height: res[1].height,
        filesize: res[0].size,
        format: res[1].format
      };
    },
    err => {
      err.fromValidate = true;
      throw err;
    }
  );
}

// get a remote file source
exports.download = (uploadUrl) => {
  let result = {};
  result.name = path.basename(url.parse(uploadUrl || 'unknown').pathname);
  result.path = os.tmpdir() + '/' + result.name;
  let tmpStream = fs.createWriteStream(result.path);

  // pipe response to file, and return path
  return Q.Promise((resolve, reject) => {
    if (!uploadUrl) {
      reject(new Error('No url set for event'));
    } else if (uploadUrl.startsWith('s3://')) {
      let m = uploadUrl.match(/s3:\/\/([^\/]+)\/(.*)/);
      result.s3Bucket = m[1];
      result.s3Key = m[2];
      s3.getObject({Bucket: m[1], Key: m[2]})
        .createReadStream()
        .on('end', () => resolve(result))
        .on('error', err => reject(err))
        .pipe(tmpStream);
    } else if (uploadUrl.match(/^https?:\/\//)) {
      let req = request(uploadUrl, {timeout: 10000});
      req.pause();
      req.on('response', resp => {
        if (resp.statusCode === 200) {
          tmpStream.on('finish', () => resolve(result));
          req.pipe(tmpStream);
          req.resume();
        } else {
          reject(new Error(`Got ${resp.statusCode} for url: ${uploadUrl}`));
        }
      });
      req.on('error', err => reject(err));
    } else {
      reject(new Error(`Unrecognized url format: ${uploadUrl}`));
    }
  }).catch(err => {
    err.fromDownload = true;
    throw err;
  });
}
