'use strict';

const helper = require('./support/test-helper');
const resizer = require('../lib/resizer');

describe('resizer-validate', () => {

  it('returns image file metadata', () => {
    return resizer.validate(helper.path('large.png')).then(meta => {
      expect(meta.width).to.equal(1823);
      expect(meta.height).to.equal(665);
      expect(meta.filesize).to.equal(58603);
      expect(meta.format).to.equal('png');
    });
  });

  it('rejects non-image binary files', () => {
    return resizer.validate(helper.path('mp3.png')).then(
      (meta) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/unsupported image format/i);
        expect(err.fromValidate).to.equal(true);
      }
    );
  });

  it('rejects non-image text files', () => {
    return resizer.validate(helper.path('created.json')).then(
      (meta) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/unsupported image format/i);
        expect(err.fromValidate).to.equal(true);
      }
    );
  });

  it('rejects corrupt image files', () => {
    return resizer.validate(helper.path('corrupt.png')).then(
      (meta) => { throw 'should have gotten an error'; },
      (err) => {
        expect(err.message).to.match(/has corrupt header/i);
        expect(err.fromValidate).to.equal(true);
      }
    );
  });

  it('recognizes image formats', () => {
    return resizer.validate(helper.path('jpg.png')).then(meta => {
      expect(meta.width).to.equal(100);
      expect(meta.height).to.equal(36);
      expect(meta.filesize).to.equal(5057);
      expect(meta.format).to.equal('jpeg');
    });
  });

});
