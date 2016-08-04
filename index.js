'use strict';

const Q = require('q');
const ImageEvent = require('./lib/image-event');
const resizer = require('./lib/resizer');
const deleter = require('./lib/deleter');

module.exports.handler = (event, context, callback) => {
  if (!event || !event.Records) {
    return callback(new Error('Invalid event input: ' + JSON.stringify(event, null, 2)));
  }
  if (process.env.DEBUG) {
    console.log('Incoming:', JSON.stringify(event, null, 2));
  }

  // sort by task
  let invalids = [], resizes = [], deletes = [], skips = [];
  event.Records.map(rec => new ImageEvent(rec)).forEach(ie => {
    if (ie.invalid) {
      invalids.push(ie);
    } else if (ie.doResize) {
      resizes.push(ie);
    } else if (ie.doDelete) {
      deletes.push(ie);
    } else {
      skips.push(ie);
    }
  });

  // invalid is insanity, so actually throw an error and abort
  if (invalids.length) {
    let invalidMsgs = invalids.map(ie => ie.invalid).join(', ');
    return callback(new Error(`Invalid records: ${invalidMsgs}`));
  }

  // process valid records
  let resizeWork = resizes.map(ie => resizer.work(ie));
  let deleteWork = deletes.map(ie => deleter.work(ie));
  Q.all(resizeWork.concat(deleteWork)).done(
    results => {
      let out = {resized: resizes.length, deleted: deletes.length, skipped: skips.length};
      if (process.env.DEBUG) {
        console.log('Out:', JSON.stringify(out));
      }
      callback(null, out);
    },
    err => callback(err)
  );
}
