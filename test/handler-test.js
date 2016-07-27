'use strict';

const helper = require('./support/test-helper');
const handler = require('../index').handler;

describe('handler', () => {

  it('rejects insane inputs', (done) => {
    handler({foo: 'bar'}, null, (err, result) => {
      expect(err).to.be.an.instanceof(Error);
      expect(err).to.match(/invalid event input/i);
      done();
    });
  });

  it('refuses to work on invalid image-events', (done) => {
    handler({Records: [{foo: 'bar'}, {foo: 'bar'}]}, null, (err, result) => {
      expect(err).to.be.an.instanceof(Error);
      expect(err).to.match(/invalid records/i);
      expect(err).to.match(/bad event format/i);
      done();
    });
  });

  it('skips images without an uploadPath', (done) => {
    let okayRecord = helper.buildRaw('create', {id: 1234, destinationPath: 'foo'});
    handler({Records: [okayRecord]}, null, (err, result) => {
      expect(err).to.be.null;
      expect(result).to.have.keys('completed', 'skipped');
      expect(result.completed).to.equal(0);
      expect(result.skipped).to.equal(1);
      done();
    });
  });

  it('throws errors for images with no destinationPath', (done) => {
    let badRecord = helper.buildRaw('create', {id: 1234, uploadPath: 'foo'});
    handler({Records: [badRecord]}, null, (err, result) => {
      expect(err).to.be.an.instanceof(Error);
      expect(err).to.match(/invalid records/i);
      expect(err).to.match(/no destinationPath present/i);
      done();
    });
  });

});
