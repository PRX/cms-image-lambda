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
    return resizer.validate(helper.readFile('mp3.png')).then(meta => {
      expect(meta).to.be.null;
    });
  });

  it('rejects non-image text files', () => {
    return resizer.validate(helper.readFile('created.json')).then(meta => {
      expect(meta).to.be.null;
    });
  });

  it('rejects corrupt image files', () => {
    return resizer.validate(helper.readFile('corrupt.png')).then(meta => {
      expect(meta).to.be.null;
    });
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
