import { expect } from 'chai';
import { rtcFactory, rtcCleanup } from '../../src/lib/rtc';

describe('rtc factory', () => {
  after(() => rtcCleanup());

  it('creates a standard-shaped RTCPeerConnection', function () {
    this.timeout(10000);
    const pc = rtcFactory()({ iceServers: [] });
    expect(pc.createDataChannel).to.be.a('function');
    expect(pc.createOffer).to.be.a('function');
    const ch = pc.createDataChannel('probe');
    expect(ch.send).to.be.a('function');
    pc.close();
  });

  it('cleanup is idempotent', () => {
    rtcCleanup();
    rtcCleanup();
  });
});
