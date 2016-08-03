'use strict';

const helper = require('./support/test-helper');
const resizer = require('../lib/resizer');
const UploadedFile = require('../lib/uploaded-file');

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

  // spy on uploaded-file callbacks
  beforeEach(() => sinon.spy(UploadedFile.prototype, 'callback'));
  afterEach(() => UploadedFile.prototype.callback.restore());
  const getUploadedFile = () => {
    expect(UploadedFile.prototype.callback.callCount).to.equal(1);
    return UploadedFile.prototype.callback.thisValues[0];
  }

  it('creates thumbnails and uploads them to s3', function() {
    this.timeout(5000);

    expect(ie.invalid).to.be.undefined;
    return resizer.work(ie).then(success => {
      expect(success).to.be.true;

      let file = getUploadedFile();
      expect(file.id).to.equal(ie.imageId);
      expect(file.name).to.equal('small.png');
      expect(file.downloaded).to.equal(true);
      expect(file.valid).to.equal(true);
      expect(file.resized).to.equal(true);

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

      let file = getUploadedFile();
      expect(file.downloaded).to.equal(true);
      expect(file.valid).to.equal(false);
      expect(file.resized).to.equal(false);
    });
  });

  it('catches non-downloadable upload urls', function() {
    ie.body.uploadPath = `https://s3.amazonaws.com/foo/bar/nothing.jpg`;
    expect(ie.invalid).to.be.undefined;
    return resizer.work(ie).then(success => {
      expect(success).to.be.false;

      let file = getUploadedFile();
      expect(file.downloaded).to.equal(false);
      expect(file.valid).to.equal(false);
      expect(file.resized).to.equal(false);
    });
  });

  it('throws resize errors', function() {
    sinon.stub(resizer, 'resize').returns(Q.reject(new Error('resize-err')));
    return resizer.work(ie).then(
      (success) => { throw 'should have gotten an error'; },
      (err) => {
        resizer.resize.restore()
        expect(err.message).to.match(/resize-err/i);
        let file = getUploadedFile();
        expect(file.downloaded).to.equal(true);
        expect(file.valid).to.equal(true);
        expect(file.resized).to.equal(false);
      }
    );
  });

  it('throws upload errors', function() {
    sinon.stub(resizer, 'upload').returns(Q.reject(new Error('upload-err')));
    return resizer.work(ie).then(
      (success) => { throw 'should have gotten an error'; },
      (err) => {
        resizer.upload.restore();
        expect(err.message).to.match(/upload-err/i);
        let file = getUploadedFile();
        expect(file.downloaded).to.equal(true);
        expect(file.valid).to.equal(true);
        expect(file.resized).to.equal(false);
      }
    );
  });

  it('throws sqs errors', function() {
    this.timeout(5000);
    UploadedFile.prototype.callback.restore();
    sinon.stub(UploadedFile.prototype, 'callback').returns(Q.reject(new Error('sqs-err')));
    return resizer.work(ie).then(
      (success) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/sqs-err/i);
      }
    );
  });

});
