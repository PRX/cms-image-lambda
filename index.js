'use strict';

let Q = require('q');
let ImageEvent = require('lib/image-event');
let resizer = require('lib/resizer');

module.exports.handler = (event, context, callback) => {
  if (!event || !event.Records) {
    callback(new Error('Invalid event input: ' + JSON.stringify(event, null, 2)));
  }

  let imageEvents = event.Records.map(rec => new ImageEvent(rec));
  let invalids = events.filter(ie => ie.invalid);
  if (invalids.length) {
    let invalidMsgs = invalids.map(ie => ie.invalid).join(', ');
    callback(new Error(`Invalid records: ${invalidMsgs}`));
  } else {
    Q.all(imageEvents.map(imgEvent => resizer.work(imgEvent))).done(
      results => callback(null, 'that worked!'),
      err => callback(err)
    );
  }
}
