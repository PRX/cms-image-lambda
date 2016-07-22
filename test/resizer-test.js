'use strict';

let helper = require('./support/test-helper');
let s3 = new (require('aws-sdk')).S3();
let fs = require('fs');
let resizer = require('../lib/resizer');

const BUCKET = process.env.TEST_BUCKET;
const FOLDER = process.env.TEST_FOLDER;
const FILE = 'prx-logo_large.png';

describe('resizer', () => {

  before(() => Q.ninvoke(s3, 'upload', {
    ACL: 'public-read',
    Body: helper.readTestFile(FILE),
    Bucket: BUCKET,
    Expires: helper.minutesFromNow(5),
    Key: `${FOLDER}/${FILE}`
  }));

  it('downloads files from s3', () => {
    let s3Event = {body: {upload_url: `s3://${BUCKET}/${FOLDER}/${FILE}`}};
    return resizer.validate(s3Event).then((stuff) => {
      console.log('ok');
    });
  });

});
