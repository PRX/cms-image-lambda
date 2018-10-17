'use strict';

const Q = require('q');
const logger = require('./lib/logger');
const ImageEvent = require('./lib/image-event');
const resizer = require('./lib/resizer');
const deleter = require('./lib/deleter');

module.exports.handler = (event, context, callback) => {
  if (!event || !event.Records) {
    logger.error(`Invalid event input: ${JSON.stringify(event)}`);
    return callback(null); // don't retry
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

  // invalid is insanity, so log those errors and skip them
  if (invalids.length) {
    invalids.forEach(ie => logger.error(`Invalid record: ${ie.invalid}`));
  }

  // process valid records
  let resizeWork = resizes.map(ie => resizer.work(ie));
  let deleteWork = deletes.map(ie => deleter.work(ie));
  Q.all(resizeWork.concat(deleteWork)).done(
    results => {
      logger.info(`Resized: ${resizes.length}`);
      logger.info(`Deleted: ${deletes.length}`);
      logger.info(`Skipped: ${skips.length}`);
      callback(null, {
        invalid: invalids.length,
        resized: resizes.length,
        deleted: deletes.length,
        skipped: skips.length
      });
    },
    err => {
      logger.error(err.message || `${err}`);
      callback(err);
    }
  );
}
