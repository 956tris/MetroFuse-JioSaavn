/* Metrolist Project (C) 2026, GPL-3.0. See SOURCE. */
const API = 'https://www.jiosaavn.com/api.php';

export function catalogUrl(call, parameters, version = '4') {
  const query = {__call:call,_format:'json',_marker:'0',ctx:'web6dot0',...(version && {api_version:version}),...parameters};
  return API + '?' + Object.keys(query).map(key => encodeURIComponent(key) + '=' + encodeURIComponent(query[key])).join('&');
}

// Keep the upstream provider's catalog routing stable for one activation.
// These headers belong only to api.php requests, never CDN audio requests.
export function catalogRoutingIp() {
  return '103.57.226.' + (1 + Math.floor(Math.random() * 254));
}

export function catalogHeaders(regionalCatalog, routingIp) {
  return {Accept:'application/json',Referer:'https://www.jiosaavn.com/',
    'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ...(regionalCatalog && {'X-Forwarded-For':routingIp,'X-Real-IP':routingIp})};
}
