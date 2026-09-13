/* Generează înregistrările naratoarei.
   1. Ia din index.html blocul NAR-COMMON (curățare + amprentă) și datele poveștii,
      le rulează exact ca în joc și adună toate textele citite cu voce tare.
   2. Scrie tools/texte-narate.json (amprentă → text curățat).
   3. Cheamă tools/sintetizeaza.py, care face audio/<amprentă>.mp3 pentru textele
      noi, șterge înregistrările rămase fără text și scrie audio/manifest.js.

   Rulare:  node tools/genereaza-audio.mjs [--voce ro-RO-AlinaNeural] [--rata -5%]
   Cerințe: python 3 cu  pip install edge-tts mutagen                              */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const RAD=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const src=fs.readFileSync(path.join(RAD,'index.html'),'utf8');

function felie(a,b){
  const i=src.indexOf(a); if(i<0) throw new Error('nu găsesc în index.html: '+a);
  const j=src.indexOf(b,i); if(j<0) throw new Error('nu găsesc în index.html: '+b);
  return src.slice(i,j);
}
const comun=felie('/* NAR-COMMON-START','/* NAR-COMMON-END');
const date=felie('var COCO=','/* ═══════════ STARE');
const prolog=(src.match(/^var TEXT_PROLOG=.*$/m)||[''])[0];
if(!prolog) throw new Error('nu găsesc TEXT_PROLOG');

const ctx=vm.createContext({});
vm.runInContext(comun+'\n'+date+'\n'+prolog,ctx,{filename:'index.html'});

const brute=[]
  .concat(ctx.texteDin(ctx.INSULE))
  .concat([ctx.TEXT_PROLOG])
  .concat(Object.keys(ctx.NAR_FIXE).map(k=>ctx.NAR_FIXE[k]))
  .concat(ctx.INSULE.map(I=>I.obiect&&ctx.textPrimit(I.obiect.n)))
  .filter(Boolean);

const texte={};
for(const t of brute){
  const c=ctx.curataText(t); if(!c) continue;
  const h=ctx.amprenta(c);
  if(texte[h]!==undefined&&texte[h]!==c) throw new Error('coliziune de amprentă: '+h+'\n'+texte[h]+'\n'+c);
  texte[h]=c;
}
const ordonat={}; for(const h of Object.keys(texte).sort()) ordonat[h]=texte[h];
const out=path.join(RAD,'tools','texte-narate.json');
fs.writeFileSync(out,JSON.stringify(ordonat,null,1)+'\n');
const cuv=Object.values(ordonat).reduce((n,t)=>n+t.split(' ').length,0);
console.log(Object.keys(ordonat).length+' texte, ~'+cuv+' cuvinte → '+path.relative(RAD,out));

const argv=process.argv.slice(2);
const r=spawnSync(process.platform==='win32'?'python':'python3',[path.join(RAD,'tools','sintetizeaza.py'),...argv],{cwd:RAD,stdio:'inherit'});
process.exit(r.status===null?1:r.status);
