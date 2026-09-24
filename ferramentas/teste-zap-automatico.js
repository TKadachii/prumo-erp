const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'extensao', 'content.js'), 'utf8');
const ini = src.indexOf('function iniciarZapAuto()');
if (ini < 0) throw new Error('não achei iniciarZapAuto no content.js');
let prof = 0, fim = -1;
for (let i = src.indexOf('{', ini); i < src.length; i++) {
    if (src[i] === '{') prof++;
    else if (src[i] === '}') { prof--; if (prof === 0) { fim = i + 1; break; } }
}
if (fim < 0) throw new Error('não achei o fim de iniciarZapAuto');
const FONTE_ZAP = src.slice(ini, fim);
const estaticos = [
    [!FONTE_ZAP.includes('/send?phone='), 'não usa mais URL /send?phone'],
    [!FONTE_ZAP.includes('location.assign') && !FONTE_ZAP.includes('location.href'), 'não navega nem recarrega a página'],
    [FONTE_ZAP.includes('acharNovaConversa') && FONTE_ZAP.includes('acharLinhaDoNumero'), 'usa Nova conversa + pesquisa interna'],
    [FONTE_ZAP.includes('acharEditorMensagem') && FONTE_ZAP.includes('acharBotaoEnviar'), 'preenche e envia pela interface aberta'],
];
let falhas = 0;
for (const [passou, nome] of estaticos) { console.log(`${passou ? '✅' : '❌'} ${nome}`); if (!passou) falhas++; }
if (falhas) process.exit(1);

let chromium;
try { chromium = require('playwright').chromium; }
catch (e) {
    console.log('⏭️  Teste visual pulado: Playwright não está instalado; verificações estruturais passaram.');
    process.exit(0);
}
const http = require('http');
const enviados = [];
let cargas = 0;
const servidor = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/registrar') { enviados.push(u.searchParams.get('p')); res.end('ok'); return; }
    cargas++;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<!doctype html><html><head><style>
      button,[role=listitem],[contenteditable]{display:block;width:280px;min-height:32px;margin:8px;padding:6px}
      footer{display:none} #friganso-zap-painel{width:290px!important}
    </style></head><body>
      <button aria-label="Nova conversa" id="nova">Nova conversa</button>
      <div contenteditable="true" role="textbox" aria-label="Pesquisar nome ou número" id="busca"></div>
      <div id="resultados"></div>
      <footer><div contenteditable="true" role="textbox" aria-label="Digite uma mensagem" id="editor"></div>
      <button aria-label="Enviar" id="enviar">Enviar</button></footer>
      <script>
        let telefone=''; const busca=document.querySelector('#busca'), resultados=document.querySelector('#resultados');
        document.querySelector('#nova').onclick=()=>busca.focus();
        busca.addEventListener('input',()=>{ const n=(busca.innerText||'').replace(/\\D/g,''); resultados.innerHTML='';
          if(n && n!=='5511000000000'){const r=document.createElement('div');r.setAttribute('role','listitem');r.tabIndex=0;r.textContent='Conversar com +'+n;
            r.onclick=()=>{telefone=n;document.querySelector('footer').style.display='block';resultados.innerHTML='';busca.textContent='';};resultados.appendChild(r);}
        });
        document.querySelector('#enviar').onclick=()=>fetch('/registrar?p='+telefone);
      </script>
    </body></html>`);
});
(async () => {
    await new Promise(r => servidor.listen(0, r));
    const BASE = `http://localhost:${servidor.address().port}`;
    const navegador = await chromium.launch({ headless: true });
    const ctx = await navegador.newContext();
    const pg = await ctx.newPage();
    const campanha = { itens: [
        { telefone:'5522992891542', nome:'Rota do Sol', mensagem:'oi 1', status:'' },
        { telefone:'5511000000000', nome:'Número Ruim', mensagem:'oi 2', status:'' },
        { telefone:'5522988887777', nome:'Bar do Mar', mensagem:'oi 3', status:'' },
    ], idx:0, rodando:false, respiro:2, ts:Date.now() };
    await pg.addInitScript(({ fonte, camp }) => {
        const LS='mock'; localStorage.setItem(LS, JSON.stringify({friganso_zap_campanha:camp}));
        const pegar=()=>JSON.parse(localStorage.getItem(LS)||'{}'), por=o=>localStorage.setItem(LS,JSON.stringify(o));
        window.__store={get:pegar}; window.chrome={storage:{local:{
          get:(ks,cb)=>{const s=pegar();cb(Object.fromEntries(ks.map(k=>[k,s[k]])));},
          set:(o,cb)=>{const s=pegar();Object.assign(s,o);por(s);cb&&cb();},
          remove:k=>{const s=pegar();delete s[k];por(s);}
        }}};
        const teste=fonte.replace('const ESPERA_INTERFACE = 90;', 'const ESPERA_INTERFACE = 8;');
        addEventListener('DOMContentLoaded',()=>new Function('return '+teste)()());
    }, { fonte:FONTE_ZAP, camp:campanha });
    await pg.goto(BASE + '/'); await pg.waitForTimeout(1400);
    const cargasAntes=cargas; await pg.locator('#frig-btn').click(); await pg.waitForTimeout(11000);
    const estado=await pg.evaluate(()=>window.__store.get().friganso_zap_campanha);
    const checar=(c,m)=>{console.log(`${c?'✅':'❌'} ${m}`);if(!c)falhas++;};
    checar(cargas===cargasAntes,'nenhuma recarga durante toda a campanha');
    checar(enviados.join(',')==='5522992891542,5522988887777','enviou primeiro e terceiro sem duplicar');
    checar(estado.itens[1].status==='falhou','número inexistente foi pulado');
    checar(estado.rodando===false,'campanha concluiu');
    await navegador.close(); servidor.close(); process.exit(falhas?1:0);
})().catch(e=>{console.error(e);servidor.close();process.exit(1);});