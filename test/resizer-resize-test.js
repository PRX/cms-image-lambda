'use strict';

const Stream = require('stream').Stream;
const helper = require('./support/test-helper');
const resizer = require('../lib/resizer');

describe('resizer-resize', () => {

  const bufferStream = (stream) => {
    let deferred = Q.defer(), bufs = [];
    stream.on('data', d => bufs.push(d));
    stream.on('end', () => deferred.resolve(Buffer.concat(bufs)));
    stream.on('error', err => deferred.reject(err));
    return deferred.promise;
  }

  describe('resize', () => {

    it('produces thumbnail output streams', () => {
      let file = helper.path('large.png');
      let small = resizer.resize(file, {key: 'small', width: 50, height: 50, exact: true});
      let medium = resizer.resize(file, {key: 'medium', width: 100, height: 100});
      let large = resizer.resize(file, {key: 'large', width: 150, height: 150});

      return Q.all([small, medium, large]).then(resized => {
        expect(resized.length).to.equal(3);
        expect(resized[0]).to.be.an.instanceof(Object);
        expect(resized[0]).to.include.keys('format', 'width', 'height');
        expect(resized[0].width).to.equal(50);
        expect(resized[0].height).to.equal(50);
        expect(resized[0].format).to.equal('png');
        expect(resized[1].width).to.equal(100);
        expect(resized[2].width).to.equal(150);
      });
    });

  });

  describe('resizeAll', () => {

    afterEach(() => resizer.upload.restore());

    it('produces 3 thumbnails and the original', () => {
      let file = helper.path('large.png');
      sinon.stub(resizer, 'upload');
      return resizer.resizeAll(file, null, null, '/some/where', 'foobar.jpg').then(() => {
        expect(resizer.upload.callCount).to.equal(4);

        let tmpFiles = resizer.upload.args.map(args => args[0].split('/').pop());
        let destPaths = resizer.upload.args.map(args => args[1]);

        expect(tmpFiles).to.have.members(['large.png', 'large_small.png', 'large_medium.png', 'large_square.png']);
        expect(destPaths).to.have.members(['/some/where']);
      });
    });

  });

});
