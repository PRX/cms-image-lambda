'use strict';

const helper = require('./support/test-helper');
const resizer = require('../lib/resizer');
const Buffer = require('buffer').Buffer;

describe('resizer-download', () => {

  let s3Path = helper.putS3TestFile('small.png');

  it('downloads files from s3', () => {
    let url = `s3://${s3Path}`;
    return resizer.download(url).then(data => {
      expect(data.name).to.equal('small.png');
      expect(data.buffer).to.be.an.instanceof(Buffer)
    });
  });

  it('downloads a file via http', () => {
    let url = `https://s3.amazonaws.com/${s3Path}`;
    return resizer.download(url).then(data => {
      expect(data.name).to.equal('small.png');
      expect(data.buffer).to.be.an.instanceof(Buffer)
    });
  });

  it('handles s3 errors', () => {
    let url = 's3://foo/bar.jpg';
    return resizer.download(url).then(
      (data) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/access denied/i);
      }
    );
  });

  it('handles http errors', () => {
    let url = 'http://google.com/nothing.jpg';
    return resizer.download(url).then(
      (data) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/got 404 for/i);
      }
    );
  });

  it('does not recognize other formats', () => {
    let url = `foobar://${s3Path}`;
    return resizer.download(url).then(
      (data) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/unrecognized url format/i);
      }
    );
  });

});
