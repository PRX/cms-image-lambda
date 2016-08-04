'use strict';

const Q = require('q');
const s3 = new (require('aws-sdk')).S3();

// just mark S3 folder as deleted, for now
exports.work = (imgEvent) => {
  if (!imgEvent.imageDestinationPath) {
    return Q(false); // ignore
  }

  // check for existence, then write json body as "deleted.json"
  return Q.ninvoke(s3, 'listObjects', {
    Bucket: process.env.DESTINATION_BUCKET,
    Prefix: imgEvent.imageDestinationPath
  }).then(data => {
    if (data.Contents && data.Contents.length) {
      return Q.ninvoke(s3, 'upload', {
        Body: JSON.stringify(imgEvent.body),
        Bucket: process.env.DESTINATION_BUCKET,
        Key: `${imgEvent.imageDestinationPath}/deleted.json`
      }).then(() => true);
    } else {
      return false;
    }
  });
}
