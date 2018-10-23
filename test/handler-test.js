'use strict';

const helper = require('./support/test-helper');
const handler = require('../index').handler;

describe('handler', () => {

  let logs = helper.spyLogger();

  it('skips insane inputs', (done) => {
    handler({foo: 'bar'}, null, (err, result) => {
      expect(err).to.be.null;
      expect(logs.error.length).to.equal(1);
      expect(logs.error[0]).to.match(/invalid event input/i);
      done();
    });
  });

  it('refuses to work on invalid image-events', (done) => {
    handler({Records: [{foo: 'bar'}, {foo: 'bar'}]}, null, (err, result) => {
      expect(err).to.be.null;
      expect(logs.error.length).to.equal(2);
      expect(logs.error[0]).to.match(/invalid record:.*bad event format/i);
      expect(logs.error[1]).to.match(/invalid record:.*bad event format/i);
      expect(result.resized).to.equal(0);
      expect(result.deleted).to.equal(0);
      done();
    });
  });

  it('skips images without an uploadPath', (done) => {
    let okayRecord = helper.buildRaw('create', {id: 1234, destinationPath: 'foo'});
    handler({Records: [okayRecord]}, null, (err, result) => {
      expect(err).to.be.null;
      expect(result).to.have.keys('invalid', 'resized', 'deleted', 'skipped');
      expect(result.invalid).to.equal(0);
      expect(result.resized).to.equal(0);
      expect(result.deleted).to.equal(0);
      expect(result.skipped).to.equal(1);
      done();
    });
  });

  it('handle multiple tasks', (done) => {
    let proc = helper.buildRaw('create', {id: 1234, destinationPath: 'foo', uploadPath: 'bar'});
    let skip = helper.buildRaw('update', {id: 2345, destinationPath: 'foo'});
    let del = helper.buildRaw('delete', {id: 3456});
    handler({Records: [proc, skip, del]}, null, (err, result) => {
      expect(err).to.be.null;
      expect(result.invalid).to.equal(0);
      expect(result.resized).to.equal(1);
      expect(result.deleted).to.equal(1);
      expect(result.skipped).to.equal(1);
      done();
    });
  });

  it('logs errors for images with no destinationPath', (done) => {
    let badRecord = helper.buildRaw('create', {id: 1234, uploadPath: 'foo'});
    handler({Records: [badRecord]}, null, (err, result) => {
      expect(err).to.be.null;
      expect(logs.error.length).to.equal(1);
      expect(logs.error[0]).to.match(/invalid record:.+no destinationpath present/i);
      done();
    });
  });

  it('retries download errors thrown by the worker', (done) => {
    nock('http://foo.bar').get('/503.mp3').reply(503);
    let retryable = helper.buildRaw('create', {id: 1234, destinationPath: 'foo', uploadPath: 'http://foo.bar/503.mp3'});
    handler({Records: [retryable]}, null, (err, result) => {
      expect(err).to.be.an.instanceof(Error);
      expect(err).to.match(/got 503/i);
      expect(logs.error.length).to.equal(1);
      expect(logs.error[0]).to.match(/got 503/i);
      done();
    });
  });

});
