(function(){
'use strict';

function esc(s){var d=document.createElement('div');d.textContent=s||'';return d.innerHTML}
function setText(id,v){var e=document.getElementById(id);if(e)e.textContent=v||''}
function setHref(id,v){var e=document.getElementById(id);if(e)e.href=v||'#'}

function fetchYT(videos){
  var need=videos.filter(function(v){return !v.title});
  if(!need.length)return Promise.resolve();
  return Promise.all(need.map(function(v){
    return fetch('https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v='+v.youtubeId+'&format=json')
      .then(function(r){return r.json()})
      .then(function(i){v.title=i.title||'Sem título';v.thumbnail=i.thumbnail_url||''})
      .catch(function(){v.title='Vídeo '+v.youtubeId})
  }));
}

function render(data){
  var heroBg=document.getElementById('hero-bg');
  if(heroBg){
    if(data.heroMedia){
      if(data.heroMediaType==='video'){
        heroBg.innerHTML='<video autoplay muted loop playsinline><source src="'+esc(data.heroMedia)+'" type="video/mp4"></video>';
        heroBg.className='hero-bg';
      }else{
        heroBg.innerHTML='';
        heroBg.className='hero-bg';
        heroBg.style.backgroundImage='url('+esc(data.heroMedia)+')';
      }
    }else{
      heroBg.className='hero-bg-placeholder';
    }
  }

  setText('hero-tagline',data.tagline);
  setText('hero-highlight',data.heroHighlight);
  setHref('btn-spotify',data.platforms.spotify);
  setHref('btn-ytmusic',data.platforms.youtubeMusic);

  var tracksEl=document.getElementById('tracks-list');
  if(tracksEl){
    tracksEl.innerHTML=data.tracks.map(function(t,i){
      var cls=t.status==='Disponível'?'available':'soon';
      var isLink=t.status==='Disponível'&&t.link;
      var tag=isLink?'a':'div';
      var attr=isLink?' href="'+esc(t.link)+'" target="_blank" rel="noopener noreferrer"':'';
      return '<'+tag+' class="track-row'+(isLink?' clickable':'')+'"'+attr+'>'+
        '<div style="display:flex;align-items:center">'+
        '<span class="track-num">'+String(i+1).padStart(2,'0')+'</span>'+
        '<span class="track-name">'+esc(t.title)+'</span></div>'+
        '<span class="track-status '+cls+'">'+esc(t.status)+(isLink?' ↗':'')+'</span>'+
        '</'+tag+'>';
    }).join('');
  }

  var vidsEl=document.getElementById('videos-grid');
  if(vidsEl){
    vidsEl.innerHTML=data.videos.map(function(v){
      var thumb=v.thumbnail||('https://i.ytimg.com/vi/'+esc(v.youtubeId)+'/hqdefault.jpg');
      var fb='https://img.youtube.com/vi/'+esc(v.youtubeId)+'/hqdefault.jpg';
      return '<a class="video-card" href="https://www.youtube.com/watch?v='+esc(v.youtubeId)+'" target="_blank" rel="noopener noreferrer">'+
        '<img src="'+esc(thumb)+'" alt="'+esc(v.title)+'" onerror="this.onerror=null;this.src=\''+fb+'\'">'+
        '<div class="video-card-overlay">'+
        '<div class="video-play"><img src="img/amuleto2.png" alt="" class="video-play-bg"><svg viewBox="0 0 24 24" fill="#fff" width="22" height="22"><polygon points="6,3 20,12 6,21"/></svg></div>'+
        '<span class="video-name">'+esc(v.title)+'</span></div></a>';
    }).join('');
  }

  var showsEl=document.getElementById('shows-list');
  if(showsEl){
    showsEl.innerHTML=data.shows.map(function(s){
      return '<div class="show-row">'+
        '<div class="show-date">'+esc(s.date)+'</div>'+
        '<div><div class="show-venue">'+esc(s.venue)+'</div>'+
        '<div class="show-city">'+esc(s.city)+'</div></div></div>';
    }).join('');
  }

  var galleryEl=document.getElementById('gallery-grid');
  if(galleryEl && data.gallery && data.gallery.length){
    galleryEl.innerHTML=data.gallery.map(function(g){
      return '<div class="gallery-item" data-src="'+esc(g.url)+'">'+
        '<img src="'+esc(g.url)+'" alt="'+esc(g.caption||'')+'" loading="lazy">'+
        (g.caption?'<div class="gallery-caption">'+esc(g.caption)+'</div>':'')+
        '</div>';
    }).join('');

    galleryEl.querySelectorAll('.gallery-item').forEach(function(item){
      item.addEventListener('click',function(){
        var src=this.dataset.src;
        var lb=document.createElement('div');
        lb.className='gallery-lightbox';
        lb.innerHTML='<img src="'+src+'">';
        lb.addEventListener('click',function(){
          lb.classList.remove('show');
          setTimeout(function(){lb.remove()},300);
        });
        document.body.appendChild(lb);
        requestAnimationFrame(function(){lb.classList.add('show')});
      });
    });
  } else if(galleryEl){
    var galSection=document.getElementById('gallery');
    if(galSection) galSection.style.display='none';
  }

  var bioEl=document.getElementById('bio-text');
  if(bioEl){
    bioEl.innerHTML=data.bio.split('\n\n').map(function(p){return '<p>'+esc(p)+'</p>'}).join('');
  }

  setHref('social-ig',data.socials.instagram);
  setHref('social-fb',data.socials.facebook);
  setHref('social-tw',data.socials.twitter);
  setHref('social-tt',data.socials.tiktok);
  setHref('social-tg',data.socials.telegram);
}

var nav=document.querySelector('.nav');
if(nav){
  window.addEventListener('scroll',function(){
    nav.classList.toggle('scrolled',window.scrollY>50);
  });
}

var burger=document.getElementById('nav-burger');
var mm=document.getElementById('mobile-menu');
if(burger&&mm){
  burger.addEventListener('click',function(){
    var open=mm.classList.toggle('open');
    burger.innerHTML=open
      ?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
      :'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
  });
  mm.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click',function(){
      mm.classList.remove('open');
      burger.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
    });
  });
}

fetch('data.json')
  .then(function(r){return r.json()})
  .then(function(data){
    return fetchYT(data.videos).then(function(){return data});
  })
  .then(function(data){
    render(data);
  })
  .catch(function(err){
    console.error('Erro ao carregar data.json:', err);
  });

})();
