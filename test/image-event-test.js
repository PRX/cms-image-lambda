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
    expect(ie.id).to.equal('11cba7cb-12af-4d46-9247-0b88949803db');
    expect(ie.app).to.equal('cms');
    expect(ie.sentAt).to.be.a('Date');
    expect(ie.subject).to.equal('image');
    expect(ie.action).to.equal('create');
    expect(ie.body.filename).to.equal('self.jpg');
    expect(ie.imageId).to.equal(403987);
    expect(ie.imageType).to.equal('piece');
    expect(ie.imageUploadUrl).to.equal('s3://something.jpg');
    expect(ie.imageDestinationPath).to.equal('public/piece_images/403987');
  });

  it('guesses image types from profile strings', () => {
    ie.body._links.profile.href = 'http://meta.prx.org/model/foo/bar';
    expect(ie.imageType).to.equal(null);
    ie.body._links.profile.href = 'http://meta.prx.org/model/image/account';
    expect(ie.imageType).to.equal('account');
    ie.body._links.profile.href = 'http://meta.prx.org/model/image/series';
    expect(ie.imageType).to.equal('series');
    ie.body._links.profile.href = 'http://meta.prx.org/model/image/story';
    expect(ie.imageType).to.equal('piece');
    ie.body._links.profile.href = 'http://meta.prx.org/model/image/user';
    expect(ie.imageType).to.equal('user');
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

  it('validates the topic environment', () => {
    ie.env = 'production';
    expect(ie.validate).to.throw(/environment mismatch for topic/i);
    ie.env = null;
    expect(ie.validate).to.throw(/environment mismatch for topic/i);
    ie.env = 'test';
    expect(ie.validate).to.not.throw();
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
    ie.action = 'destroy';
    expect(ie.validate).to.not.throw();
  });

  it('requires an upload_url', () => {
    ie.body.upload_url = null;
    expect(ie.validate).to.throw(/no upload_url present/i);
  });

  it('requires an image id', () => {
    ie.body.id = '';
    expect(ie.validate).to.throw(/no id present/i);
  });

  it('requires a known profile link', () => {
    ie.body._links.profile = null;
    expect(ie.validate).to.throw(/no profile link/i);
    ie.body._links.profile = {href: ''};
    expect(ie.validate).to.throw(/unable to determine image type from profile link/i);
    ie.body._links.profile = {href: 'http://meta.prx.org/model/foo/bar'};
    expect(ie.validate).to.throw(/unable to determine image type from profile link/i);
  });

});
