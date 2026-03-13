// ─── WORLD MAP & GEO HELPERS ──────────────────────────────

export const WORLD_MAP_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export const ISO_NUM_A2 = {"004":"AF","008":"AL","010":"AQ","012":"DZ","016":"AS","020":"AD","024":"AO","028":"AG","031":"AZ","032":"AR","036":"AU","040":"AT","044":"BS","048":"BH","050":"BD","051":"AM","052":"BB","056":"BE","060":"BM","064":"BT","068":"BO","070":"BA","072":"BW","076":"BR","084":"BZ","090":"SB","092":"VG","096":"BN","100":"BG","104":"MM","108":"BI","112":"BY","116":"KH","120":"CM","124":"CA","132":"CV","140":"CF","144":"LK","148":"TD","152":"CL","156":"CN","158":"TW","170":"CO","174":"KM","178":"CG","180":"CD","184":"CK","188":"CR","191":"HR","192":"CU","196":"CY","203":"CZ","204":"BJ","208":"DK","212":"DM","214":"DO","218":"EC","222":"SV","226":"GQ","231":"ET","232":"ER","233":"EE","234":"FO","242":"FJ","246":"FI","250":"FR","258":"PF","260":"TF","262":"DJ","266":"GA","268":"GE","270":"GM","275":"PS","276":"DE","288":"GH","296":"KI","300":"GR","304":"GL","308":"GD","316":"GU","320":"GT","324":"GN","328":"GY","332":"HT","336":"VA","340":"HN","344":"HK","348":"HU","352":"IS","356":"IN","360":"ID","364":"IR","368":"IQ","372":"IE","376":"IL","380":"IT","384":"CI","388":"JM","392":"JP","398":"KZ","400":"JO","404":"KE","408":"KP","410":"KR","414":"KW","417":"KG","418":"LA","422":"LB","426":"LS","428":"LV","430":"LR","434":"LY","438":"LI","440":"LT","442":"LU","450":"MG","454":"MW","458":"MY","462":"MV","466":"ML","470":"MT","478":"MR","480":"MU","484":"MX","492":"MC","496":"MN","498":"MD","499":"ME","504":"MA","508":"MZ","512":"OM","516":"NA","520":"NR","524":"NP","528":"NL","540":"NC","554":"NZ","558":"NI","562":"NE","566":"NG","570":"NU","578":"NO","582":"MP","586":"PK","591":"PA","598":"PG","600":"PY","604":"PE","608":"PH","616":"PL","620":"PT","624":"GW","626":"TL","630":"PR","634":"QA","642":"RO","643":"RU","646":"RW","659":"KN","662":"LC","666":"PM","670":"VC","674":"SM","678":"ST","682":"SA","686":"SN","690":"SC","694":"SL","702":"SG","703":"SK","704":"VN","705":"SI","706":"SO","710":"ZA","716":"ZW","724":"ES","728":"SS","729":"SD","732":"EH","740":"SR","748":"SZ","752":"SE","756":"CH","760":"SY","762":"TJ","764":"TH","768":"TG","776":"TO","780":"TT","784":"AE","788":"TN","792":"TR","795":"TM","798":"TV","800":"UG","804":"UA","807":"MK","818":"EG","826":"GB","834":"TZ","840":"US","854":"BF","858":"UY","860":"UZ","862":"VE","876":"WF","882":"WS","887":"YE","894":"ZM"};

export function decodeTopojson(topo, objName) {
  const obj = topo.objects[objName];
  const { scale, translate } = topo.transform;
  const arcs = topo.arcs;
  function decodeArc(i) {
    const rev = i < 0;
    const arc = arcs[rev ? ~i : i];
    let x = 0, y = 0;
    const pts = arc.map(([dx, dy]) => { x += dx; y += dy; return [x * scale[0] + translate[0], y * scale[1] + translate[1]]; });
    return rev ? pts.reverse() : pts;
  }
  function ring(a) { return a.reduce((p, i) => p.concat(decodeArc(i)), []); }
  return obj.geometries.map(g => ({
    id: g.id,
    type: g.type,
    coords: g.type === "Polygon" ? g.arcs.map(ring) : g.type === "MultiPolygon" ? g.arcs.map(p => p.map(ring)) : []
  }));
}

export function geoPathStr(rings, w, h) {
  return rings.map(r => {
    const pts = r.map(([lon, lat]) => `${(((lon + 180) / 360) * w).toFixed(1)},${(((90 - lat) / 180) * h).toFixed(1)}`);
    return `M${pts.join("L")}Z`;
  }).join("");
}
