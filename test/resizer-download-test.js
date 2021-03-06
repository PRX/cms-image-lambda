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

  it('follows http redirects', () => {
    let url = `https://s3.amazonaws.com/${s3Path}`;
    nock('http://foo.bar').get('/redirect.jpg').reply(302, 'redirect', {'Location': url});
    return resizer.download('http://foo.bar/redirect.jpg').then(data => {
      expect(data.name).to.equal('redirect.jpg');
      expect(data.path).to.match(/\/redirect\.jpg$/);
    });
  });

  it('handles missing download errors', () => {
    return resizer.download(null).then(
      (data) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/no url set/i);
        expect(err.fromDownload).to.be.true;
      }
    );
  });

  it('handles s3 errors', () => {
    let url = 's3://foo/bar.jpg';
    return resizer.download(url).then(
      (data) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/access denied/i);
        expect(err.fromDownload).to.equal.true;
      }
    );
  });

  it('handles http 404 errors', () => {
    let url = 'http://google.com/nothing.jpg';
    return resizer.download(url).then(
      (data) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/got 404 for/i);
        expect(err.fromDownload).to.equal.true;
      }
    );
  });

  it('handles http host errors', () => {
    let url = 'http://foo.bar.gov/nothing.jpg';
    return resizer.download(url).then(
      (data) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/ENOTFOUND/i);
        expect(err.fromDownload).to.equal.true;
      }
    );
  });

  it('handles s3 not found errors', () => {
    let url = `s3://${s3Path}/doesnotexist`;
    return resizer.download(url).then(
      (data) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/key does not exist/i);
        expect(err.fromDownload).to.equal.true;
      }
    );
  });

  it('does not recognize other formats', () => {
    let url = `foobar://${s3Path}`;
    return resizer.download(url).then(
      (data) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/unrecognized url format/i);
        expect(err.fromDownload).to.equal.true;
      }
    );
  });

  it('throws content-length mismatch errors', () => {
    nock('http://foo.bar').get('/mismatch.jpg').reply(200, '--jpg--', {'Content-Length': 11});
    return resizer.download('http://foo.bar/mismatch.jpg').then(
      (data) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/expected 11 bytes/i);
        expect(err.message).to.match(/got 7/i);
        expect(err.fromDownload).to.be.falsey;
      }
    );
  });

  it('is okay with matching content-length', () => {
    nock('http://foo.bar').get('/okay.jpg').reply(200, '--jpg--', {'Content-Length': 7});
    return resizer.download('http://foo.bar/okay.jpg').then(data => {
      expect(data.name).to.equal('okay.jpg');
      expect(data.path).to.match(/\/okay\.jpg$/);
      expect(data.contentType).to.be.undefined;
    });
  });

});
