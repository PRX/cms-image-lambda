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
