'use strict';

const helper = require('./support/test-helper');
const UploadedFile = require('../lib/uploaded-file');

describe('uploaded-file', () => {

  it('parses image event data', () => {
    let file = new UploadedFile({imageId: 1234, imageDestinationPath: 'foo/bar', name: 'wontwork'});
    expect(file.id).to.equal(1234);
    expect(file.path).to.equal('foo/bar');
    expect(file.name).to.be.null;
  });

  it('sets download', () => {
    let file = new UploadedFile({});
    expect(file.downloaded).to.equal(false);
    file.setDownloaded();
    expect(file.downloaded).to.equal(false);
    file.setDownloaded({name: 'foo.bar', buffer: 'something'});
    expect(file.downloaded).to.equal(true);
    expect(file.name).to.equal('foo.bar');
    expect(file.buffer).to.equal('something');
  });

  it('sets validated', () => {
    let file = new UploadedFile({});
    expect(file.valid).to.equal(false);
    file.setValidated();
    expect(file.valid).to.equal(false);
    file.setValidated({width: 1, height: 2, filesize: 123, format: 'jpg'});
    expect(file.valid).to.equal(true);
    expect(file.width).to.equal(1);
    expect(file.height).to.equal(2);
    expect(file.size).to.equal(123);
    expect(file.format).to.equal('jpg');
  });

  it('sets resized', () => {
    let file = new UploadedFile({});
    expect(file.resized).to.equal(false);
    file.setResized();
    expect(file.resized).to.equal(false);
    file.setResized(true);
    expect(file.resized).to.equal(true);
  });

  it('serializes to json', () => {
    let file = new UploadedFile({imageId: 1234, imageDestinationPath: 'foo/bar'});
    file.setDownloaded({name: 'foo.bar'});
    file.setValidated();
    let json = JSON.parse(file.toJSON());
    expect(json).to.have.keys('id', 'path', 'name', 'width', 'height', 'size',
      'format', 'downloaded', 'valid', 'resized');
    expect(json.id).to.equal(1234);
    expect(json.path).to.equal('foo/bar');
  });

  describe('with an sqs queue', () => {

    beforeEach(() => helper.fetchSQS());
    afterEach(() => helper.fetchSQS());

    const retryFetchSQS = (id, attemptsLeft) => {
      return helper.fetchSQS().then(messages => {
        if (attemptsLeft === 0 || messages.find(m => m.id === id)) {
          return messages;
        } else {
          return retryFetchSQS(id, attemptsLeft - 1);
        }
      });
    }

    it('calls back to sqs', function() {
      this.timeout(5000);

      let file = new UploadedFile({imageId: 'some-id-here', imageDestinationPath: 'foo/bar'});
      file.setDownloaded();
      return file.callback().then(() => retryFetchSQS('some-id-here', 3)).then(messages => {
        let msg = messages.find(m => m.id === 'some-id-here');
        expect(msg).to.exist;
        expect(msg.path).to.equal('foo/bar');
        expect(msg.downloaded).to.equal(false);
      });
    });

  });

});
