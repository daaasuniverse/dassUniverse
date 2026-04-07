(function(){
'use strict';

var PASS_KEY='sd-admin-pass';
var SESSION_KEY='sd-admin-session';
var DEFAULT_PASS='daaas2025';

function getPass(){
  try{return localStorage.getItem(PASS_KEY)||DEFAULT_PASS}catch(e){return DEFAULT_PASS}
}
function setPass(p){
  try{localStorage.setItem(PASS_KEY,p)}catch(e){}
}
function isLoggedIn(){
  try{return sessionStorage.getItem(SESSION_KEY)==='1'}catch(e){return false}
}
function setLoggedIn(){
  try{sessionStorage.setItem(SESSION_KEY,'1')}catch(e){}
}

var loginScreen=document.getElementById('login-screen');
var adminWrap=document.getElementById('admin-wrap');

loginScreen.style.display='';
adminWrap.style.display='none';

if(isLoggedIn()){
  loginScreen.style.display='none';
  adminWrap.style.display='';
}

document.getElementById('login-btn').addEventListener('click',tryLogin);
document.getElementById('login-pass').addEventListener('keydown',function(e){
  if(e.key==='Enter')tryLogin();
});

function tryLogin(){
  var val=document.getElementById('login-pass').value;
  var err=document.getElementById('login-error');
  if(val===getPass()){
    setLoggedIn();
    loginScreen.style.display='none';
    adminWrap.style.display='';
  }else{
    err.textContent='Senha incorreta';
    document.getElementById('login-pass').value='';
    document.getElementById('login-pass').focus();
  }
}

var data={};
var cur='destaque';
var modalRoot=document.getElementById('modal-root');
var ghConfig={owner:'',repo:'',token:'',branch:'main'};
var CONFIG_KEY='sd-admin-github';

function esc(s){var d=document.createElement('div');d.textContent=s||'';return d.innerHTML}

function loadGHConfig(){
  try{var r=localStorage.getItem(CONFIG_KEY);if(r)ghConfig=JSON.parse(r)}catch(e){}
}
function saveGHConfig(){
  try{localStorage.setItem(CONFIG_KEY,JSON.stringify(ghConfig))}catch(e){}
}
loadGHConfig();

fetch('../data.json')
  .then(function(r){return r.json()})
  .then(function(d){
    data=d;
    var need=data.videos.filter(function(v){return !v.title});
    if(need.length){
      return Promise.all(need.map(function(v){
        return fetch('https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v='+v.youtubeId+'&format=json')
          .then(function(r){return r.json()})
          .then(function(i){v.title=i.title||'Sem título';v.thumbnail=i.thumbnail_url||''})
          .catch(function(){v.title='Vídeo '+v.youtubeId})
      }));
    }
  })
  .then(function(){render()})
  .catch(function(e){console.error('Erro ao carregar data.json',e)});

function showStatus(msg, type){
  var el=document.getElementById('saved');
  el.textContent=msg;
  el.className='saved-msg '+type;
  if(type!=='loading') setTimeout(function(){el.textContent='';el.className='saved-msg'},3000);
}

document.getElementById('btn-save').addEventListener('click',function(){
  var btn=this;
  if(!ghConfig.owner||!ghConfig.repo||!ghConfig.token){
    showStatus('Configure o GitHub na aba ⚙ Config','err');
    return;
  }

  btn.disabled=true;
  showStatus('Salvando...','loading');

  var json=JSON.stringify(data,null,2);
  var content=btoa(unescape(encodeURIComponent(json)));
  var apiUrl='https://api.github.com/repos/'+ghConfig.owner+'/'+ghConfig.repo+'/contents/data.json';

  fetch(apiUrl+'?ref='+ghConfig.branch,{
    headers:{'Authorization':'Bearer '+ghConfig.token,'Accept':'application/vnd.github.v3+json'}
  })
  .then(function(r){return r.json()})
  .then(function(file){
    var sha=file.sha||'';
    return fetch(apiUrl,{
      method:'PUT',
      headers:{
        'Authorization':'Bearer '+ghConfig.token,
        'Accept':'application/vnd.github.v3+json',
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        message:'Atualizar data.json via admin',
        content:content,
        sha:sha,
        branch:ghConfig.branch
      })
    });
  })
  .then(function(r){
    if(!r.ok) throw new Error('HTTP '+r.status);
    return r.json();
  })
  .then(function(){
    showStatus('Salvo com sucesso! ✓','ok');
  })
  .catch(function(e){
    console.error(e);
    showStatus('Erro ao salvar. Verifique as configurações.','err');
  })
  .finally(function(){
    btn.disabled=false;
  });
});

function showModal(title,fields,onConfirm,confirmLabel){
  confirmLabel=confirmLabel||'Confirmar';
  var html='<div class="modal-bg" id="modal-overlay"><div class="modal"><h4>'+esc(title)+'</h4>';
  fields.forEach(function(f){
    html+='<label class="lbl">'+esc(f.label)+'</label>';
    if(f.type==='select'){
      html+='<select class="inp-select" id="m-'+f.key+'">';
      f.options.forEach(function(o){html+='<option value="'+esc(o)+'"'+(f.value===o?' selected':'')+'>'+esc(o)+'</option>'});
      html+='</select>';
    }else if(f.type==='textarea'){
      html+='<textarea class="txa" id="m-'+f.key+'" placeholder="'+esc(f.placeholder||'')+'">'+esc(f.value||'')+'</textarea>';
    }else{
      html+='<input class="inp" id="m-'+f.key+'" type="'+(f.type||'text')+'" value="'+esc(f.value||'')+'" placeholder="'+esc(f.placeholder||'')+'">';
    }
  });
  html+='<div class="modal-status" id="m-status"></div>'+
    '<div class="modal-btns"><button class="modal-cancel" id="m-cancel">Cancelar</button>'+
    '<button class="modal-confirm" id="m-confirm">'+esc(confirmLabel)+'</button></div></div></div>';
  modalRoot.innerHTML=html;
  var ov=document.getElementById('modal-overlay');
  requestAnimationFrame(function(){ov.classList.add('show')});
  var first=ov.querySelector('.inp,.txa,.inp-select');
  if(first)setTimeout(function(){first.focus()},100);
  function close(){ov.classList.remove('show');setTimeout(function(){modalRoot.innerHTML=''},200)}
  document.getElementById('m-cancel').addEventListener('click',close);
  ov.addEventListener('click',function(e){if(e.target===ov)close()});
  document.getElementById('m-confirm').addEventListener('click',function(){
    var vals={};fields.forEach(function(f){var el=document.getElementById('m-'+f.key);vals[f.key]=el?el.value.trim():''});
    onConfirm(vals,close,document.getElementById('m-status'),this);
  });
}

document.getElementById('tabs').addEventListener('click',function(e){
  var btn=e.target.closest('.tab-btn');if(!btn)return;
  cur=btn.dataset.t;
  document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.toggle('on',b===btn)});
  document.querySelectorAll('.panel').forEach(function(p){p.classList.toggle('on',p.id==='p-'+cur)});
  render();
});

function render(){
  switch(cur){
    case'destaque':rDestaque();break;
    case'faixas':rFaixas();break;
    case'videos':rVideos();break;
    case'agenda':rAgenda();break;
    case'sobre':rSobre();break;
    case'links':rLinks();break;
    case'config':rConfig();break;
  }
}

function rDestaque(){
  var el=document.getElementById('p-destaque');
  var prev='';
  if(data.heroMedia){
    if(data.heroMediaType==='video')prev='<div class="preview"><video src="'+esc(data.heroMedia)+'" muted autoplay loop playsinline></video></div>';
    else prev='<div class="preview"><img src="'+esc(data.heroMedia)+'" alt="preview"></div>';
  }
  el.innerHTML=
    '<h3>Imagem de Destaque</h3><p class="desc">A imagem ou vídeo que aparece na tela inicial, atrás do seu nome.</p>'+
    '<label class="lbl">URL da imagem, GIF ou vídeo</label>'+
    '<input class="inp" id="i-media" value="'+esc(data.heroMedia)+'" placeholder="Cole o link aqui...">'+
    '<div class="type-btns">'+
    '<button class="type-btn'+(data.heroMediaType==='image'?' on':'')+'" data-v="image">Imagem / GIF</button>'+
    '<button class="type-btn'+(data.heroMediaType==='video'?' on':'')+'" data-v="video">Vídeo MP4</button>'+
    '</div>'+prev+
    '<label class="lbl">Texto de destaque</label>'+
    '<input class="inp" id="i-hl" value="'+esc(data.heroHighlight)+'" placeholder="Ex: Novo single disponível!">'+
    '<label class="lbl">Tagline</label>'+
    '<input class="inp" id="i-tag" value="'+esc(data.tagline)+'" placeholder="Ex: K-POP × BR-POP">';
  el.querySelector('#i-media').addEventListener('input',function(){data.heroMedia=this.value});
  el.querySelector('#i-hl').addEventListener('input',function(){data.heroHighlight=this.value});
  el.querySelector('#i-tag').addEventListener('input',function(){data.tagline=this.value});
  el.querySelectorAll('.type-btn').forEach(function(b){b.addEventListener('click',function(){data.heroMediaType=this.dataset.v;rDestaque()})});
}

function rFaixas(){
  var el=document.getElementById('p-faixas');
  var h='<h3>Faixas</h3><p class="desc">Todas as faixas aparecem no site. Faixas disponíveis podem ter um link pro ouvinte.</p>';
  data.tracks.forEach(function(item){
    var st=item.status==='Disponível'?'🟢 Disponível':'⏳ Em breve';
    var lk=item.link?'🔗 Com link':'';
    h+='<div class="row"><div class="row-l"><div class="row-info"><div class="row-t">'+esc(item.title)+'</div>'+
      '<div class="row-s">'+st+(lk?' · '+lk:'')+'</div></div></div>'+
      '<div class="row-actions"><button class="edit-btn" data-id="'+item.id+'">Editar</button>'+
      '<button class="rm" data-id="'+item.id+'">Remover</button></div></div>';
  });
  h+='<button class="add" id="add-track">+ Adicionar Faixa</button>';
  el.innerHTML=h;
  bindRemove(el,'tracks',rFaixas);
  el.querySelectorAll('.edit-btn').forEach(function(b){
    b.addEventListener('click',function(){
      var item=data.tracks.find(function(t){return t.id===b.dataset.id});if(!item)return;
      showModal('Editar Faixa',[
        {key:'title',label:'Nome da faixa',value:item.title,placeholder:'Nome da música'},
        {key:'status',label:'Status',type:'select',value:item.status,options:['Disponível','Em breve']},
        {key:'link',label:'Link (Spotify, YouTube, etc.)',value:item.link||'',placeholder:'Cole o link da música (opcional)'}
      ],function(v,close){if(!v.title)return;item.title=v.title;item.status=v.status;item.link=v.link||'';close();rFaixas()},'Salvar');
    });
  });
  document.getElementById('add-track').addEventListener('click',function(){
    showModal('Adicionar Faixa',[
      {key:'title',label:'Nome da faixa',placeholder:'Ex: Minha Música'},
      {key:'status',label:'Status',type:'select',value:'Em breve',options:['Disponível','Em breve']},
      {key:'link',label:'Link (Spotify, YouTube, etc.)',placeholder:'Cole o link (opcional)'}
    ],function(v,close){if(!v.title)return;data.tracks.push({id:'t'+Date.now(),title:v.title,status:v.status,link:v.link||''});close();rFaixas()},'Adicionar');
  });
}

function rVideos(){
  var el=document.getElementById('p-videos');
  var h='<h3>Vídeos</h3><p class="desc">Adicione vídeos do YouTube. O título e thumbnail são buscados automaticamente.</p>';
  data.videos.forEach(function(item){
    h+='<div class="row"><div class="row-l"><div class="row-info"><div class="row-t">'+esc(item.title||'(carregando...)')+'</div>'+
      '<div class="row-s">youtube.com/watch?v='+esc(item.youtubeId)+'</div></div></div>'+
      '<div class="row-actions"><button class="edit-btn" data-id="'+item.id+'">Editar</button>'+
      '<button class="rm" data-id="'+item.id+'">Remover</button></div></div>';
  });
  h+='<button class="add" id="add-video">+ Adicionar Vídeo</button>';
  el.innerHTML=h;
  bindRemove(el,'videos',rVideos);
  el.querySelectorAll('.edit-btn').forEach(function(b){
    b.addEventListener('click',function(){
      var item=data.videos.find(function(v){return v.id===b.dataset.id});if(!item)return;
      showModal('Editar Vídeo',[
        {key:'title',label:'Título',value:item.title,placeholder:'Título do vídeo'},
        {key:'url',label:'URL do YouTube',value:'https://www.youtube.com/watch?v='+item.youtubeId,placeholder:'https://youtube.com/watch?v=...'}
      ],function(v,close){
        if(v.title)item.title=v.title;
        if(v.url){var m=v.url.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]+)/);
          if(m&&m[1]!==item.youtubeId){item.youtubeId=m[1];item.title='';item.thumbnail='';
            fetch('https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v='+m[1]+'&format=json')
              .then(function(r){return r.json()}).then(function(i){item.title=i.title||'Sem título';item.thumbnail=i.thumbnail_url||'';rVideos()})
              .catch(function(){item.title=v.title||'Vídeo';rVideos()});
          }}
        close();rVideos();
      },'Salvar');
    });
  });
  document.getElementById('add-video').addEventListener('click',function(){
    showModal('Adicionar Vídeo',[{key:'url',label:'URL do YouTube',placeholder:'Cole o link do vídeo aqui'}],
    function(v,close,statusEl,confirmBtn){
      if(!v.url){statusEl.textContent='Cole uma URL do YouTube.';return}
      var m=v.url.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]+)/);
      if(!m){statusEl.textContent='URL inválida.';return}
      var ytId=m[1];statusEl.textContent='Buscando...';confirmBtn.disabled=true;
      fetch('https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v='+ytId+'&format=json')
        .then(function(r){return r.json()})
        .then(function(info){data.videos.push({id:'v'+Date.now(),title:info.title||'Sem título',youtubeId:ytId,thumbnail:info.thumbnail_url||''});close();rVideos()})
        .catch(function(){data.videos.push({id:'v'+Date.now(),title:'Vídeo',youtubeId:ytId,thumbnail:''});close();rVideos()});
    },'Adicionar');
  });
}

function rAgenda(){
  var el=document.getElementById('p-agenda');
  var h='<h3>Agenda</h3><p class="desc">Adicione datas de shows e eventos.</p>';
  data.shows.forEach(function(item){
    h+='<div class="row"><div class="row-l"><div class="row-info"><div class="row-t">'+esc(item.venue)+'</div>'+
      '<div class="row-s">'+esc(item.date)+' — '+esc(item.city)+'</div></div></div>'+
      '<div class="row-actions"><button class="edit-btn" data-id="'+item.id+'">Editar</button>'+
      '<button class="rm" data-id="'+item.id+'">Remover</button></div></div>';
  });
  h+='<button class="add" id="add-show">+ Adicionar Show</button>';
  el.innerHTML=h;
  bindRemove(el,'shows',rAgenda);
  el.querySelectorAll('.edit-btn').forEach(function(b){
    b.addEventListener('click',function(){
      var item=data.shows.find(function(s){return s.id===b.dataset.id});if(!item)return;
      showModal('Editar Show',[
        {key:'date',label:'Data',value:item.date,placeholder:'Ex: 15/08/2026'},
        {key:'venue',label:'Local',value:item.venue,placeholder:'Nome do local'},
        {key:'city',label:'Cidade',value:item.city,placeholder:'Cidade / Estado'}
      ],function(v,close){if(!v.venue)return;item.date=v.date;item.venue=v.venue;item.city=v.city;close();rAgenda()},'Salvar');
    });
  });
  document.getElementById('add-show').addEventListener('click',function(){
    showModal('Adicionar Show',[
      {key:'date',label:'Data',placeholder:'Ex: 15/08/2026'},
      {key:'venue',label:'Local',placeholder:'Nome do local'},
      {key:'city',label:'Cidade',placeholder:'Cidade / Estado'}
    ],function(v,close){if(!v.date||!v.venue)return;data.shows.push({id:'s'+Date.now(),date:v.date,venue:v.venue,city:v.city||''});close();rAgenda()},'Adicionar');
  });
}

function rSobre(){
  var el=document.getElementById('p-sobre');
  el.innerHTML='<h3>Sobre Mim</h3><p class="desc">Sua biografia na seção "Sobre" do site.</p>'+
    '<textarea class="txa" id="i-bio">'+esc(data.bio)+'</textarea>';
  el.querySelector('#i-bio').addEventListener('input',function(){data.bio=this.value});
}

function rLinks(){
  var el=document.getElementById('p-links');
  var h='<h3>Links e Contato</h3><p class="desc">Edite suas redes sociais, plataformas e e-mail.</p>'+
    '<label class="lbl">E-mail de contato</label><input class="inp" id="i-email" value="'+esc(data.contact)+'">';
  h+='<div class="sec-t">Redes Sociais</div>';
  ['instagram','facebook','twitter','tiktok','telegram'].forEach(function(k){
    h+='<label class="sub-l">'+k+'</label><input class="inp soc" data-k="'+k+'" value="'+esc(data.socials[k])+'">';
  });
  h+='<div class="sec-t">Plataformas Digitais</div>';
  var pn={spotify:'Spotify',youtubeMusic:'YouTube Music'};
  Object.keys(data.platforms).forEach(function(k){
    h+='<label class="sub-l">'+(pn[k]||k)+'</label><input class="inp plat" data-k="'+k+'" value="'+esc(data.platforms[k])+'">';
  });
  el.innerHTML=h;
  el.querySelector('#i-email').addEventListener('input',function(){data.contact=this.value});
  el.querySelectorAll('.soc').forEach(function(i){i.addEventListener('input',function(){data.socials[this.dataset.k]=this.value})});
  el.querySelectorAll('.plat').forEach(function(i){i.addEventListener('input',function(){data.platforms[this.dataset.k]=this.value})});
}

function rConfig(){
  var el=document.getElementById('p-config');
  var connected=ghConfig.owner&&ghConfig.repo&&ghConfig.token;
  var statusHTML=connected
    ?'<div class="config-status ok">✓ Conectado — '+esc(ghConfig.owner)+'/'+esc(ghConfig.repo)+'</div>'
    :'<div class="config-status no">✗ Não configurado</div>';

  el.innerHTML=
    '<h3>Configuração do GitHub</h3>'+
    '<p class="desc">Conecte ao repositório do GitHub para que o botão "Salvar" atualize o site automaticamente.</p>'+
    statusHTML+
    '<div class="config-box">'+
    '<strong style="color:#E6DED1;font-size:14px">Como configurar:</strong>'+
    '<ol class="steps">'+
    '<li>Acesse <a href="https://github.com/settings/tokens" target="_blank">github.com/settings/tokens</a></li>'+
    '<li>Clique em <strong>"Generate new token (classic)"</strong></li>'+
    '<li>Marque a permissão <strong>"repo"</strong> e gere o token</li>'+
    '<li>Copie o token e cole abaixo</li>'+
    '</ol></div>'+
    '<label class="lbl">Usuário do GitHub</label>'+
    '<input class="inp" id="c-owner" value="'+esc(ghConfig.owner)+'" placeholder="Ex: samuelldaaas">'+
    '<label class="lbl">Nome do repositório</label>'+
    '<input class="inp" id="c-repo" value="'+esc(ghConfig.repo)+'" placeholder="Ex: samuelldaaas.com.br">'+
    '<label class="lbl">Token do GitHub</label>'+
    '<input class="inp" id="c-token" type="password" value="'+esc(ghConfig.token)+'" placeholder="ghp_xxxxxxxxxxxx">'+
    '<label class="lbl">Branch</label>'+
    '<input class="inp" id="c-branch" value="'+esc(ghConfig.branch||'main')+'" placeholder="main">'+
    '<button class="add" id="c-save" style="margin-top:22px">Salvar Configuração do GitHub</button>'+

    '<div class="sec-t" style="margin-top:40px">Senha do Painel</div>'+
    '<p class="desc" style="margin-bottom:12px">Troque a senha de acesso ao painel admin. A senha atual é necessária para confirmar.</p>'+
    '<label class="lbl">Senha atual</label>'+
    '<input class="inp" id="c-oldpass" type="password" placeholder="Digite a senha atual">'+
    '<label class="lbl">Nova senha</label>'+
    '<input class="inp" id="c-newpass" type="password" placeholder="Digite a nova senha">'+
    '<label class="lbl">Confirmar nova senha</label>'+
    '<input class="inp" id="c-newpass2" type="password" placeholder="Repita a nova senha">'+
    '<div class="login-error" id="pass-error" style="margin-top:8px"></div>'+
    '<button class="add" id="c-passave" style="margin-top:12px">Trocar Senha</button>';

  document.getElementById('c-save').addEventListener('click',function(){
    ghConfig.owner=document.getElementById('c-owner').value.trim();
    ghConfig.repo=document.getElementById('c-repo').value.trim();
    ghConfig.token=document.getElementById('c-token').value.trim();
    ghConfig.branch=document.getElementById('c-branch').value.trim()||'main';
    saveGHConfig();
    rConfig();
    showStatus('Configuração salva!','ok');
  });

  document.getElementById('c-passave').addEventListener('click',function(){
    var errEl=document.getElementById('pass-error');
    var old=document.getElementById('c-oldpass').value;
    var n1=document.getElementById('c-newpass').value;
    var n2=document.getElementById('c-newpass2').value;
    errEl.textContent='';

    if(old!==getPass()){errEl.textContent='Senha atual incorreta.';return}
    if(!n1||n1.length<4){errEl.textContent='A nova senha deve ter pelo menos 4 caracteres.';return}
    if(n1!==n2){errEl.textContent='As senhas não coincidem.';return}

    setPass(n1);
    document.getElementById('c-oldpass').value='';
    document.getElementById('c-newpass').value='';
    document.getElementById('c-newpass2').value='';
    errEl.style.color='#4ade80';
    errEl.textContent='Senha alterada com sucesso!';
    setTimeout(function(){errEl.textContent='';errEl.style.color=''},2500);
  });
}

function bindRemove(el,sec,renderFn){
  el.querySelectorAll('.rm').forEach(function(b){
    b.addEventListener('click',function(){
      var id=b.dataset.id;
      showModal('Tem certeza?',[],function(v,close){
        data[sec]=data[sec].filter(function(i){return i.id!==id});
        close();renderFn();
      },'Confirmar Remoção');
    });
  });
}

})();
