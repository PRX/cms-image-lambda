'use strict';

const Q = require('q');
const ImageEvent = require('./lib/image-event');
const resizer = require('./lib/resizer');

module.exports.handler = (event, context, callback) => {
  if (!event || !event.Records) {
    return callback(new Error('Invalid event input: ' + JSON.stringify(event, null, 2)));
  }
  if (process.env.ENVIRONMENT === 'development') {
    console.log('Debug record:', JSON.stringify(event, null, 2));
  }

  // sort by validity, and presence of an uploadPath
  let all = event.Records.map(rec => new ImageEvent(rec));
  let valids = all.filter(ie => !ie.invalid && ie.imageUploadPath);
  let invalids = all.filter(ie => ie.invalid);
  let noUploads = all.filter(ie => !ie.invalid && !ie.imageUploadPath);

  // invalid is insanity, so actually throw an error and abort
  if (invalids.length) {
    let invalidMsgs = invalids.map(ie => ie.invalid).join(', ');
    return callback(new Error(`Invalid records: ${invalidMsgs}`));
  }

  // process valid records
  Q.all(valids.map(imgEvent => resizer.work(imgEvent))).done(
    results => callback(null, {
      completed: valids.length,
      skipped: noUploads.length
    }),
    err => callback(err)
  );
}
