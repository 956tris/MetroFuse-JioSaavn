import assert from 'node:assert/strict';
import test from 'node:test';
import '../javascript/index.js';

test('Home discovery and fallback search', async () => {
  const song = {id:'song1',type:'song',title:'Public song'};
  const artist = {id:'artist1',type:'artist',title:'Public artist'};
  let emptyLaunch = false;
  const callbacks = {};
  await globalThis.plugin.init({
    settings:{get:async () => true},
    home: value => { callbacks.home = value; },
    search: (_,value) => { callbacks.search = value; },
    metadataSource() {}, catalog() {}, audioSource() {},
    http: async request => {
      const url = new URL(request.url);
      const call = url.searchParams.get('__call');
      assert.equal(url.origin,'https://www.jiosaavn.com');
      assert.equal(url.pathname,'/api.php');
      let data;
      switch (call) {
        case 'webapi.getLaunchData':
          assert.equal(request.headers.Cookie,'L=english');
          data = emptyLaunch ? {} : {modules:{main:{title:'Discover'}},main:[song,artist]};
          break;
        case 'content.getTrending':
          assert.equal(url.searchParams.get('entity_language'),'english');
          data = [song];
          break;
        case 'autocomplete.get':
          assert.equal(url.searchParams.get('query'),'one & two');
          assert.equal(url.searchParams.has('api_version'),false);
          data = {songs:{data:[{...song,description:'Found artist'}]},artists:{data:[artist]}};
          break;
        default:
          return {status:503,body:''};
      }
      return {status:200,body:JSON.stringify(data)};
    }
  });
  try {
    const home = () => callbacks.home({language:'en-GB',country:'GB'});
    assert.deepEqual((await home()).map(shelf => shelf.title),['Discover']);
    emptyLaunch = true;
    assert.deepEqual((await home()).map(shelf => shelf.title),['Trending songs']);
    emptyLaunch = false;
    const results = await callbacks.search({query:' one & two ',limit:2});
    assert.equal(results.tracks[0].artist,'Found artist');
    assert.equal(results.artists[0].id,artist.id);
  } finally {
    globalThis.plugin.dispose();
  }
});
