'use strict';

const helper = require('./support/test-helper');
const resizer = require('../lib/resizer');

describe('resizer work', () => {

  const TEST_DEST = `${process.env.TEST_FOLDER}/1234`;

  let s3ImagePath = helper.putS3TestFile('small.png');
  let s3AudioPath = helper.putS3TestFile('mp3.png');

  let ie;
  beforeEach(() => {
    ie = helper.buildMessage('create', {
      id: 1234,
      uploadPath: `https://s3.amazonaws.com/${s3ImagePath}`,
      destinationPath: TEST_DEST,
      _links: {profile: {href: 'image/story'}}
    });
  });

  before(() => {
    return helper.listS3Path(TEST_DEST).then(keys => {
      return helper.deleteS3(keys);
    });
  });

  after(() => {
    return helper.listS3Path(TEST_DEST).then(keys => {
      return helper.deleteS3(keys);
    });
  });

  it('creates thumbnails and uploads them to s3', function() {
    this.timeout(5000);

    expect(ie.invalid).to.be.undefined;
    return resizer.work(ie).then(success => {
      expect(success).to.be.true;
      return helper.listS3Path(TEST_DEST).then(keys => {
        expect(keys.length).to.equal(4);
        expect(keys).to.include(`${TEST_DEST}/small.png`);
        expect(keys).to.include(`${TEST_DEST}/small_medium.png`);
        expect(keys).to.include(`${TEST_DEST}/small_small.png`);
        expect(keys).to.include(`${TEST_DEST}/small_square.png`);
      });
    });
  });

  it('catches non-image validation errors', function() {
    ie.body.uploadPath = `https://s3.amazonaws.com/${s3AudioPath}`;
    expect(ie.invalid).to.be.undefined;
    return resizer.work(ie).then(success => {
      expect(success).to.be.false;
    });
  });

  xit('catches non-downloadable upload urls', function() {
    ie.body.uploadPath = `https://s3.amazonaws.com/foo/bar/nothing.jpg`;
    expect(ie.invalid).to.be.undefined;
    return resizer.work(ie).then(success => {
      expect(success).to.be.false;
    });
  });

});
