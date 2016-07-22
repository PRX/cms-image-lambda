'use strict';

let helper = require('./support/test-helper');
let ImageEvent = require('../lib/image-event');

describe('image-event', () => {

  const build = (data) => {
    let i = new ImageEvent(typeof(data) == 'string' ? require(`./support/${data}`) : data);
    i.validate = i.validate.bind(i); // chai needs this for to.throw
    return i;
  }

  let ie;
  before(() => ie = build('created.json'));

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

});
