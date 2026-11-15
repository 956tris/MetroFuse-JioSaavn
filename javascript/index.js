/* Metrolist Project (C) 2026, GPL-3.0. See SOURCE for source attribution. */
import {catalogId,parseSong,parseAlbum,parseArtist,parsePlaylist} from './modules/catalog.js';
import {resolveSongStream} from './modules/media.js';
import {catalogUrl,catalogHeaders,catalogRoutingIp} from './modules/request.js';
import {homeShelves,itemsFor,languageCookie,shelf} from './modules/home.js';

const cache = new Map();
let host;
let routingIp;

async function api(call, parameters, options = {}) {
  const regionalCatalog = options.regionalCatalog ?? await host.settings.get('regionalCatalog');
  const headers = catalogHeaders(regionalCatalog,routingIp);
  const cookie = options.language;
  if (cookie) headers.Cookie = cookie;
  const response = await host.http({url:catalogUrl(call,parameters,options.version),headers,maxBytes:2097152,timeoutMs:options.timeoutMs ?? 6500});
  if (response.status !== 200) throw Error('JioSaavn HTTP ' + response.status);
  const data = JSON.parse(response.body);
  if (!data || typeof data !== 'object') throw Error('Invalid JioSaavn response');
  return Array.isArray(data) ? {results:data} : data;
}

async function song(identity) {
  const id = catalogId(identity);
  if (!id) return null;
  const regionalCatalog = await host.settings.get('regionalCatalog');
  const key = String(regionalCatalog) + ':' + id;
  const existing = cache.get(key);
  if (existing && existing.expires > Date.now()) return existing.value;
  const data = await api('song.getDetails',{pids:id},{regionalCatalog,timeoutMs:10000});
  const value = (data.songs ?? []).find(candidate => String(candidate.id) === id && parseSong(candidate));
  if (value) {
    cache.set(key,{value,expires:Date.now()+60000});
    while (cache.size > 80) cache.delete(cache.keys().next().value);
  }
  return value ?? null;
}

async function discover(request) {
  const language = languageCookie(request.language);
  let shelves = [];
  try {
    shelves = homeShelves(await api('webapi.getLaunchData',{hl:request.language,gl:request.country},{language}));
  } catch {}
  if (shelves.length) return shelves;
  const trending = await api('content.getTrending',{entity_type:'song',entity_language:language.slice(2).split(',')[0]});
  const items = itemsFor(trending.results,'song').slice(0,30);
  if (!items.length) throw Error('JioSaavn returned no Home shelves');
  return [shelf('Trending songs',items)];
}

globalThis.plugin = {
  async init(context) {
    host = context;
    routingIp = catalogRoutingIp();
    host.home(discover);
    host.search('jiosaavn.search', async request => {
      const query = String(request.query ?? '').trim();
      if (!query) return {tracks:[]};
      const limit = Math.max(1,Math.min(request.limit ?? 30,30));
      const params = {q:query,n:String(limit),p:'1'};
      const responses = await Promise.allSettled([
        api('search.getResults', params),
        api('search.getAlbumResults', params),
        api('search.getArtistResults', params),
        api('search.getPlaylistResults', params)
      ]);
      const groups = [['songs','song','tracks','track'],['albums','album','albums','album'],
        ['artists','artist','artists','artist'],['playlists','playlist','playlists','playlist']];
      const items = groups.map(([,type],i) => itemsFor(responses[i].value?.results,type));
      let quick;
      if (!items[0].length || responses.some(result => result.status === 'rejected')) {
        try { quick = await api('autocomplete.get',{query},{version:null}); }
        catch (error) { if (responses.every(result => result.status === 'rejected')) throw error; }
      }
      return Object.fromEntries(groups.map(([section,type,key,kind],i) =>
        [key,(items[i].length ? items[i] : itemsFor(quick?.[section]?.data,type)).slice(0,limit).map(item => item[kind])]));
    });
    host.metadataSource('jiosaavn.metadata', async request => {
      const value = parseSong(await song(request.identity));
      if (!value) return null;
      const {id,extras,...fields} = value;
      return {identity:{...request.identity,identifiers:{...request.identity.identifiers,jiosaavn:extras.jiosaavn}},fields,confidence:1};
    });
    host.catalog('jiosaavn.catalog', {
      album: async id => parseAlbum(await api('content.getAlbumDetails',{albumid:id}),id),
      artist: async id => parseArtist(await api('artist.getArtistPageDetails',{artistId:id,n_song:'25',n_album:'20'}),id),
      playlist: async id => parsePlaylist(await api('playlist.getDetails',{listid:id}),id)
    });
    host.audioSource('jiosaavn.audio',{transports:['DIRECT']},async request => {
      if (!catalogId(request.identity)) return {error:{code:'IDENTITY_REQUIRED'}};
      return resolveSongStream(await song(request.identity),request.quality,await host.settings.get('previewEnabled'));
    });
  },
  dispose() { cache.clear(); host = null; routingIp = null; }
};
