/* AnimeSense AI — Particles & Background Effects */

(function () {
    const container = document.getElementById('particles');
    if (!container) return;

    const colors = ['rgba(124,58,237,0.6)', 'rgba(6,182,212,0.5)', 'rgba(236,72,153,0.5)', 'rgba(167,139,250,0.4)'];

    for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.top = Math.random() * 100 + '%';
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.width = (Math.random() * 3 + 1) + 'px';
        p.style.height = p.style.width;
        p.style.animationDelay = (Math.random() * 8) + 's';
        p.style.animationDuration = (Math.random() * 6 + 6) + 's';
        container.appendChild(p);
    }
})();
