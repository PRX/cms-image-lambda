'use strict';

const helper = require('./support/test-helper');
const resizer = require('../lib/resizer');

describe('resizer-upload', () => {

  const TEST_PATH = 'public/test_images/1234';

  const s3ImagePath = helper.putS3TestFile('small.png');

  beforeEach(() => {
    return helper.listS3Path(TEST_PATH).then(keys => {
      return helper.deleteS3(keys);
    });
  });

  afterEach(() => {
    return helper.listS3Path(TEST_PATH).then(keys => {
      return helper.deleteS3(keys);
    });
  });

  it('uploads a file to s3', () => {
    let file = helper.path('small.png');
    return resizer.upload(file, TEST_PATH).then(() => {
      return helper.listS3Path(TEST_PATH).then(keys => {
        expect(keys.length).to.be.above(0);
        expect(keys).to.include(`${TEST_PATH}/small.png`)
      });
    });
  });

  it('copies between s3 buckets', () => {
    let bucket = process.env.TEST_BUCKET;
    let key = `${process.env.TEST_FOLDER}/small.png`;
    return resizer.copy(bucket, key, TEST_PATH).then(() => {
      return helper.listS3Path(TEST_PATH).then(keys => {
        expect(keys.length).to.be.above(0);
        expect(keys).to.include(`${TEST_PATH}/small.png`)
      });
    });
  });

});
