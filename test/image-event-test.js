'use strict';

const helper = require('./support/test-helper');
const ImageEvent = require('../lib/image-event');

describe('image-event', () => {

  const build = (data) => { return helper.buildEvent(data); }

  let ie;
  beforeEach(() => ie = build('created.json'));

  it('parses sns event data', () => {
    expect(ie.invalid).to.equal(undefined);
    expect(ie.topic).to.match(/test_announce_image_create/);
    expect(ie.env).to.equal('test');
    expect(ie.id).to.equal('26ee6b69-37ac-4d5c-a15d-d567f5c2d12b');
    expect(ie.app).to.equal('cms');
    expect(ie.sentAt).to.be.a('Date');
    expect(ie.subject).to.equal('image');
    expect(ie.action).to.equal('create');
    expect(ie.body.filename).to.equal('self.jpg');
    expect(ie.imageId).to.equal(123456);
    expect(ie.imageUploadPath).to.equal('s3://something.jpg');
    expect(ie.imageDestinationPath).to.equal('public/piece_images/123456');
  });

  it('only handles sns events', () => {
    expect(build({}).invalid).to.match(/bad event format/i);
    expect(build({EventSource: 'aws:foo'}).invalid).to.match(/unknown event source/i);
  });

  it('parses environments from topic arns', () => {
    expect(ie.decodeEnvironment('some:stuff:test_announce_image_create')).to.equal('test');
    expect(ie.decodeEnvironment('whatev:foobar_announce_blah_blah')).to.equal('foobar');
    expect(ie.decodeEnvironment('whatev:foobar_blah')).to.equal(null);
  });

  it('validates the message subject', () => {
    ie.subject = 'foobar';
    expect(ie.validate).to.throw(/invalid message subject/i);
    ie.subject = null;
    expect(ie.validate).to.throw(/invalid message subject/i);
    ie.subject = 'image';
    expect(ie.validate).to.not.throw();
  });

  it('validates the message action', () => {
    ie.action = 'foobar';
    expect(ie.validate).to.throw(/invalid message action/i);
    ie.action = null;
    expect(ie.validate).to.throw(/invalid message action/i);
    ie.action = 'create';
    expect(ie.validate).to.not.throw();
    ie.action = 'update';
    expect(ie.validate).to.not.throw();
    ie.action = 'delete';
    expect(ie.validate).to.not.throw();
  });

  it('does not require an uploadPath', () => {
    ie.body.uploadPath = null;
    expect(ie.validate).to.not.throw();
  });

  it('requires a destinationPath, if there is an uploadPath', () => {
    ie.body.destinationPath = null;
    ie.body.uploadPath = null;
    expect(ie.validate).to.not.throw();
    ie.body.uploadPath = 'something';
    expect(ie.validate).to.throw(/no destinationpath present/i);
  });

  it('requires an image id', () => {
    ie.body.id = '';
    expect(ie.validate).to.throw(/no id present/i);
  });

  it('parses the image type when possible', () => {
    ie.body.destinationPath = 'public/something/1234';
    expect(ie.imageType).to.equal('something');
    ie.body.destinationPath = 'foo/bar/it';
    expect(ie.imageType).to.be.null;
    ie.body.destinationPath = null;
    expect(ie.imageType).to.be.null;
  });

});
