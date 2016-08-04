'use strict';

const helper = require('./support/test-helper');
const deleter = require('../lib/deleter');

describe('deleter', () => {

  let TEST_BUCKET = process.env.DESTINATION_BUCKET;
  let TEST_FOLDER = 'public/piece_images/9876'
  let TEST_IMAGE = helper.putS3TestFile('small.png', TEST_BUCKET, TEST_FOLDER);

  let ie;
  beforeEach(() => {
    ie = helper.buildMessage('delete', {
      id: 9876,
      filename: 'small.png',
      status: 'complete',
      pieceId: 5678,
      destinationPath: TEST_FOLDER,
      _links: {profile: {href: 'image/story'}}
    });
  });

  beforeEach(() => {
    return helper.listS3Path(TEST_FOLDER).then(keys => {
      return helper.deleteS3(keys.filter((k) => k.includes('deleted.json')));
    });
  });

  after(() => {
    return helper.listS3Path(TEST_FOLDER).then(keys => {
      return helper.deleteS3(keys);
    });
  });

  it('marks the image folder as deleted', function() {
    this.timeout(5000);
    expect(ie.invalid).to.be.undefined;
    expect(ie.doDelete).to.be.true;

    return deleter.work(ie).then(success => {
      expect(success).to.be.true;
      return helper.listS3Path(TEST_FOLDER);
    }).then(keys => {
      expect(keys.length).to.equal(2);
      expect(keys).to.include(`${TEST_FOLDER}/small.png`);
      expect(keys).to.include(`${TEST_FOLDER}/deleted.json`);
      return helper.fetchS3(`${TEST_FOLDER}/deleted.json`);
    }).then(file => {
      let json = JSON.parse(file.toString());
      expect(json.id).to.equal(9876);
      expect(json.filename).to.equal('small.png');
      expect(json.pieceId).to.equal(5678);
    });
  });

  it('ignores images without a destination path', () => {
    ie.body.destinationPath = null;
    expect(ie.imageDestinationPath).to.be.null;

    return deleter.work(ie).then(success => {
      expect(success).to.be.false;
      return helper.listS3Path(TEST_FOLDER)
    }).then(keys => {
      expect(keys.length).to.equal(1);
      expect(keys).to.include(`${TEST_FOLDER}/small.png`);
    });
  });

  it('ignores images that do not actually exist in s3', () => {
    ie.body.destinationPath = `${TEST_FOLDER}1234`;
    return deleter.work(ie).then(success => {
      expect(success).to.be.false;
      return helper.listS3Path(`${TEST_FOLDER}1234`)
    }).then(keys => {
      expect(keys.length).to.equal(0);
    });
  });

});
