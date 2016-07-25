'use strict';

const helper = require('./support/test-helper');
const resizer = require('../lib/resizer');

describe('resizer-upload', () => {

  const TEST_PATH = 'public/test_images/1234';

  before(() => {
    return helper.listS3Path(TEST_PATH).then(keys => {
      return helper.deleteS3(keys);
    });
  });

  after(() => {
    return helper.listS3Path(TEST_PATH).then(keys => {
      return helper.deleteS3(keys);
    });
  });

  it('uploads a stream to s3', () => {
    let file = helper.readStream('small.png');
    return resizer.upload(file, TEST_PATH, 'test.jpg').then(() => {
      return helper.listS3Path(TEST_PATH).then(keys => {
        expect(keys.length).to.be.above(0);
        expect(keys).to.include(`${TEST_PATH}/test.jpg`)
      });
    });
  });

  it('uploads a variation on the filename', () => {
    let file = helper.readStream('small.png');
    return resizer.upload(file, TEST_PATH, 'another-thing.jpg', 'medium').then(() => {
      return helper.listS3Path(TEST_PATH).then(keys => {
        expect(keys.length).to.be.above(0);
        expect(keys).to.include(`${TEST_PATH}/another-thing_medium.jpg`)
      });
    });
  });

});
