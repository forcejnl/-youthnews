const $=id=>document.getElementById(id);
async function api(u){let r=await fetch(u);return r.json()}
async function init(){
const [s,c,a,f]=await Promise.all([api('/api/settings'),api('/api/categories'),api('/api/articles?limit=6'),api('/api/articles?featured=1&limit=2')]);
$('tagline').textContent=s.tagline;$('contact').textContent=s.contact;$('breaking').textContent=s.breaking;
$('nav').innerHTML=c.slice(0,5).map(x=>`<a href="/?category=${x.slug}">${x.name}</a>`).join('');
$('chips').innerHTML=c.map(x=>`<a href="/?category=${x.slug}">${x.name}</a>`).join('');
const featured=f[0]||a[0]; if(featured)$('hero').innerHTML=`<div class="heroCard"><img src="${featured.image}"><div class="heroText"><span class="badge">${featured.category_name||'ข่าว'}</span><h1>${esc(featured.title)}</h1><div>${esc(featured.excerpt||'')}</div></div></div><div class="side">${(f.length?f:a).slice(1,3).map(card).join('')}</div>`;
$('latest').innerHTML=a.map(card).join(''); $('interesting').innerHTML=(f.length?f:a.slice(0,3)).map(card).join('');
}
function card(a){return `<a class="card" href="/article.html?slug=${encodeURIComponent(a.slug)}"><img src="${a.image}"><div class="ct"><span class="badge">${a.category_name||'ข่าว'}</span><h3>${esc(a.title)}</h3></div></a>`}
function toggleSearch(){$('searchPanel').classList.toggle('open');if($('searchPanel').classList.contains('open'))$('search').focus()}
function doSearch(){let q=$('search').value.trim();if(q)location.href='/?search='+encodeURIComponent(q)}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
async function filtered(){
const p=new URLSearchParams(location.search); if(!p.toString())return;
const a=await api('/api/articles?'+p.toString());$('hero').innerHTML='';$('latest').innerHTML=a.map(card).join('');document.querySelector('.sectionHead h2').textContent=p.get('search')?`ผลการค้นหา: ${p.get('search')}`:'ข่าวทั้งหมด';
}
init().then(filtered);
