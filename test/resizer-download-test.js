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
      expect(data.path).to.match(/\/small\.png$/);
      expect(data.s3Bucket).to.equal(process.env.TEST_BUCKET);
      expect(data.s3Key).to.equal(process.env.TEST_FOLDER + '/small.png');
    });
  });

  it('downloads a file via http', () => {
    let url = `https://s3.amazonaws.com/${s3Path}`;
    return resizer.download(url).then(data => {
      expect(data.name).to.equal('small.png');
      expect(data.path).to.match(/\/small\.png$/);
      expect(data.s3Bucket).to.be.undefined;
      expect(data.s3Key).to.be.undefined;
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

  it('handles http 404 errors', () => {
    let url = 'http://google.com/nothing.jpg';
    return resizer.download(url).then(
      (data) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/got 404 for/i);
      }
    );
  });

  it('handles http host errors', () => {
    let url = 'http://foo.bar.gov/nothing.jpg';
    return resizer.download(url).then(
      (data) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/ENOTFOUND/i);
      }
    );
  });

  it('handles s3 not found errors', () => {
    let url = `s3://${s3Path}/doesnotexist`;
    return resizer.download(url).then(
      (data) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/key does not exist/i);
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
