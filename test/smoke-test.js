// Offline smoke test: verifies the module and all providers load and expose
// the public API without hitting any external geocoding service.
// The nodeunit suites in this directory require network access and API keys;
// run those with `npm run test:live`.

var assert = require('assert');
var geocoder = require('../index.js');

assert.strictEqual(typeof geocoder.geocode, 'function');
assert.strictEqual(typeof geocoder.reverseGeocode, 'function');
assert.strictEqual(typeof geocoder.selectProvider, 'function');
assert.strictEqual(typeof geocoder.version, 'string');

assert.strictEqual(geocoder.provider, 'google');

geocoder.selectProvider('geonames', { username: 'demo' });
assert.strictEqual(geocoder.provider, 'geonames');
assert.deepStrictEqual(geocoder.providerOpts, { username: 'demo' });

geocoder.selectProvider('yahoo', { appid: 'demo' });
assert.strictEqual(geocoder.provider, 'yahoo');

geocoder.selectProvider('google');
assert.strictEqual(geocoder.provider, 'google');
assert.deepStrictEqual(geocoder.providerOpts, {});

['geocode', 'reverseGeocode'].forEach(function (name) {
  ['google', 'geonames', 'yahoo'].forEach(function (provider) {
    assert.strictEqual(typeof require('../providers/' + provider)[name], 'function');
  });
});

console.log('smoke tests passed');
