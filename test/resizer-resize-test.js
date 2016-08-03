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
      let file = helper.readFile('large.png');
      let small = resizer.resize(file, [50, 50]);
      let medium = resizer.resize(file, [100, 100]);
      let large = resizer.resize(file, [150, 150]);

      return Q.all([small, medium, large]).then(resized => {
        expect(resized.length).to.equal(3);
        expect(resized[0]).to.be.an.instanceof(Stream);

        let waitForBuffers = resized.map(r => bufferStream(r));
        return Q.all(waitForBuffers).then(buffers => {
          expect(buffers.length).to.equal(3);
          expect(buffers[0].length).to.be.above(0);
          expect(buffers[1].length).to.be.above(buffers[0].length);
          expect(buffers[2].length).to.be.above(buffers[1].length);
        });
      });
    });

  });

  describe('resizeAll', () => {

    afterEach(() => resizer.upload.restore());

    it('produces 3 thumbnails and the original', () => {
      let file = helper.readFile('large.png');
      sinon.stub(resizer, 'upload');
      return resizer.resizeAll(file, '/some/where', 'foobar.jpg').then(() => {
        expect(resizer.upload.callCount).to.equal(4);

        let streams = resizer.upload.args.map(args => args[0]);
        let paths = resizer.upload.args.map(args => args[1]);
        let names = resizer.upload.args.map(args => args[2]);
        let keys = resizer.upload.args.map(args => args[3]);

        expect(paths).to.have.members(['/some/where']);
        expect(names).to.have.members(['foobar.jpg']);
        expect(keys).to.have.members(['square', 'small', 'medium', undefined]);
      });
    });

  });

});
