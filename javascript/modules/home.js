/* Metrolist Project (C) 2026, GPL-3.0. See SOURCE. */
import {decodeHtml,parseSong,parseAlbum,parseArtist,parsePlaylist} from './catalog.js';

const languages = {
  en:'english', hi:'hindi', pa:'punjabi', ta:'tamil', te:'telugu', bn:'bengali',
  mr:'marathi', gu:'gujarati', kn:'kannada', ml:'malayalam', ur:'urdu', or:'odia',
  as:'assamese', bh:'bhojpuri', raj:'rajasthani', bgc:'haryanvi'
};

export function languageCookie(language) {
  const code = String(language ?? '').toLowerCase().split(/[-_]/)[0];
  return 'L=' + (languages[code] ?? (Object.values(languages).includes(code) ? code : 'hindi,english'));
}

export function itemsFor(values, type, cardsOnly = false) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  return values.flatMap(value => {
    const key = type ?? value?.type;
    const [kind, item] = key === 'song' ? ['track',parseSong(value)] :
      key === 'album' ? ['album',parseAlbum(value,'')] :
      key === 'artist' ? ['artist',parseArtist(value,'')] :
      key === 'playlist' ? ['playlist',parsePlaylist(value,'')] : [];
    if (!item?.id || seen.has(kind + ':' + item.id)) return [];
    seen.add(kind + ':' + item.id);
    if (kind !== 'track') {
      if (!(item.name ?? item.title)?.trim()) return [];
      if (cardsOnly) {
        item.tracks = [];
        if (kind === 'artist') item.albums = [];
      }
    }
    return [{[kind]:item}];
  });
}

export function shelf(title, items) {
  return {title,items,layout:items.every(item => item.track) ? 'ROWS_GRID' : 'CARDS'};
}

export function homeShelves(data) {
  return Object.entries(data.modules ?? {}).filter(([,module]) => module && typeof module === 'object')
    .sort(([,a],[,b]) => (Number(a.position) || 0) - (Number(b.position) || 0))
    .flatMap(([key,module]) => {
      const title = decodeHtml(module.title).trim();
      const items = itemsFor(Array.isArray(data[key]) ? data[key] : data[module.source],undefined,true).slice(0,40);
      return title && items.length ? [shelf(title,items)] : [];
    }).slice(0,20);
}
