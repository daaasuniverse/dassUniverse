/* ═══════════════════════════════════════════════════
   stars.js — Animated star field + scroll reveal
   ═══════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─── STARS ─── */
  const canvas = document.getElementById('stars-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let stars = [];
  let shootingStars = [];
  let w, h;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = document.documentElement.scrollHeight;
  }

  function createStars() {
    stars = [];
    const count = Math.floor((w * h) / 8000);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.6 + 0.3,
        baseO: Math.random() * 0.5 + 0.1,
        o: 0,
        speed: Math.random() * 0.008 + 0.003,
        phase: Math.random() * Math.PI * 2,
        color: Math.random() > 0.85 ? 'rgba(39,70,144,' : 'rgba(230,222,209,',
      });
    }
  }

  function maybeShoot() {
    if (Math.random() < 0.003 && shootingStars.length < 2) {
      shootingStars.push({
        x: Math.random() * w,
        y: Math.random() * h * 0.4,
        len: Math.random() * 60 + 40,
        speed: Math.random() * 4 + 3,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3,
        life: 1,
        decay: Math.random() * 0.015 + 0.01,
      });
    }
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, w, h);
    frame++;

    // Stars
    for (const s of stars) {
      s.o = s.baseO + Math.sin(frame * s.speed + s.phase) * s.baseO * 0.6;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = s.color + Math.max(0, s.o).toFixed(2) + ')';
      ctx.fill();
    }

    // Shooting stars
    maybeShoot();
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const ss = shootingStars[i];
      const ex = ss.x + Math.cos(ss.angle) * ss.len;
      const ey = ss.y + Math.sin(ss.angle) * ss.len;

      const grad = ctx.createLinearGradient(ss.x, ss.y, ex, ey);
      grad.addColorStop(0, 'rgba(230,222,209,' + (ss.life * 0.7).toFixed(2) + ')');
      grad.addColorStop(1, 'rgba(39,70,144,0)');

      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ss.x += Math.cos(ss.angle) * ss.speed;
      ss.y += Math.sin(ss.angle) * ss.speed;
      ss.life -= ss.decay;

      if (ss.life <= 0) shootingStars.splice(i, 1);
    }

    requestAnimationFrame(draw);
  }

  resize();
  createStars();
  draw();

  let resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resize();
      createStars();
    }, 200);
  });


  /* ─── SCROLL REVEAL ─── */
  const reveals = document.querySelectorAll('[data-reveal]');
  if (reveals.length) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    reveals.forEach(function (el) { observer.observe(el); });
  }
})();
