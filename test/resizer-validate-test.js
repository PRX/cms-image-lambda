'use strict';

const helper = require('./support/test-helper');
const resizer = require('../lib/resizer');

describe('resizer-validate', () => {

  it('returns image file metadata', () => {
    return resizer.validate(helper.readFile('large.png')).then(meta => {
      expect(meta.width).to.equal(1823);
      expect(meta.height).to.equal(665);
      expect(meta.filesize).to.equal(58603);
      expect(meta.format).to.equal('png');
    });
  });

  it('rejects non-image binary files', () => {
    return resizer.validate(helper.readFile('mp3.png')).then(
      (meta) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/no decode delegate for this image format/i);
        expect(err.fromValidate).to.equal(true);
      }
    );
  });

  it('rejects non-image text files', () => {
    return resizer.validate(helper.readFile('created.json')).then(
      (meta) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/no decode delegate for this image format/i);
        expect(err.fromValidate).to.equal(true);
      }
    );
  });

  it('rejects corrupt image files', () => {
    return resizer.validate(helper.readFile('corrupt.png')).then(
      (meta) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/corrupt image/i);
        expect(err.fromValidate).to.equal(true);
      }
    );
  });

  it('recognizes image formats', () => {
    return resizer.validate(helper.readFile('jpg.png')).then(meta => {
      expect(meta.width).to.equal(100);
      expect(meta.height).to.equal(36);
      expect(meta.filesize).to.equal(5057);
      expect(meta.format).to.equal('jpeg');
    });
  });

});
