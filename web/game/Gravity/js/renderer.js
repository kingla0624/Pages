/* ======================================
   renderer.js - Canvas Rendering + Particles
   ====================================== */

const Renderer = (() => {
    let canvas, ctx;
    let bgStars = [];
    let particles = [];
    let trailPoints = [];
    const MAX_PARTICLES = 400;
    const MAX_TRAIL = 200;

    function init(canvasEl) {
        canvas = canvasEl;
        ctx = canvas.getContext('2d');
        resize();
        generateBgStars();
    }

    function resize() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        generateBgStars();
    }

    function generateBgStars() {
        bgStars = [];
        const w = window.innerWidth;
        const h = window.innerHeight;
        for (let i = 0; i < 200; i++) {
            bgStars.push({
                x: Math.random() * w,
                y: Math.random() * h,
                size: Math.random() * 1.5 + 0.3,
                alpha: Math.random() * 0.6 + 0.2,
                twinkleSpeed: Math.random() * 0.02 + 0.005,
                twinklePhase: Math.random() * Math.PI * 2
            });
        }
    }

    // ===== Particle System =====
    function emitParticle(x, y, vx, vy, color, life = 1.0, size = 2) {
        if (particles.length >= MAX_PARTICLES) particles.shift();
        particles.push({ x, y, vx, vy, color, life, maxLife: life, size });
    }

    function updateParticles(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) {
                particles.splice(i, 1);
            }
        }
    }

    function addTrailPoint(x, y) {
        if (trailPoints.length >= MAX_TRAIL) trailPoints.shift();
        trailPoints.push({ x, y, alpha: 1.0 });
    }

    function updateTrail(dt) {
        for (let i = trailPoints.length - 1; i >= 0; i--) {
            trailPoints[i].alpha -= dt * 1.5;
            if (trailPoints[i].alpha <= 0) {
                trailPoints.splice(i, 1);
            }
        }
    }

    function clearParticles() {
        particles = [];
        trailPoints = [];
    }

    // ===== Drawing Functions =====

    function drawBackground(time) {
        const w = window.innerWidth;
        const h = window.innerHeight;

        // Deep space gradient
        const grad = ctx.createRadialGradient(w / 2, h * 0.3, 0, w / 2, h * 0.3, w * 0.8);
        grad.addColorStop(0, 'hsl(260, 30%, 12%)');
        grad.addColorStop(0.5, 'hsl(230, 25%, 9%)');
        grad.addColorStop(1, 'hsl(230, 25%, 6%)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Background stars with twinkle
        for (const star of bgStars) {
            const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase);
            const alpha = star.alpha + twinkle * 0.2;
            ctx.globalAlpha = Math.max(0.05, Math.min(1, alpha));
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    function drawGravityWell(well, time) {
        const { x, y, strength } = well;
        const maxR = 30 + strength * 8;

        // Concentric ripples
        for (let i = 0; i < 3; i++) {
            const phase = (time * 0.001 + i * 0.33) % 1;
            const r = maxR * phase;
            const alpha = (1 - phase) * 0.3;
            ctx.strokeStyle = `hsla(270, 80%, 65%, ${alpha})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Core glow
        const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, 12);
        coreGrad.addColorStop(0, 'hsla(270, 90%, 75%, 0.9)');
        coreGrad.addColorStop(0.5, 'hsla(270, 80%, 60%, 0.4)');
        coreGrad.addColorStop(1, 'hsla(270, 70%, 50%, 0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();

        // Strength indicator
        ctx.fillStyle = 'hsla(270, 80%, 80%, 0.8)';
        ctx.font = '10px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText(strength.toFixed(0), x, y + 24);
    }

    function drawNebula(nebula, time) {
        if (nebula.collected) return;
        const { x, y, radius } = nebula;
        const pulse = 1 + Math.sin(time * 0.002) * 0.08;
        const r = radius * pulse;

        // Outer glow
        const grad = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 1.5);
        grad.addColorStop(0, 'hsla(190, 90%, 60%, 0.5)');
        grad.addColorStop(0.5, 'hsla(190, 80%, 50%, 0.2)');
        grad.addColorStop(1, 'hsla(190, 70%, 40%, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Inner core
        ctx.fillStyle = 'hsla(190, 90%, 70%, 0.6)';
        ctx.beginPath();
        ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Ring
        ctx.strokeStyle = 'hsla(190, 90%, 65%, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    function drawCollectedNebula(nebula) {
        const { x, y, radius } = nebula;
        // Dimmed version
        ctx.fillStyle = 'hsla(190, 40%, 40%, 0.15)';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Checkmark
        ctx.fillStyle = 'hsla(190, 80%, 70%, 0.5)';
        ctx.font = `${radius * 0.8}px Outfit`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓', x, y);
        ctx.textBaseline = 'alphabetic';
    }

    function drawBlackHole(bh, time) {
        const { x, y, radius } = bh;

        // Accretion disk
        const rot = time * 0.001;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 / 4) * i;
            const armLen = radius * 2;
            ctx.strokeStyle = `hsla(0, 70%, 35%, ${0.15 + Math.sin(time * 0.003 + i) * 0.05})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, radius + 5 + i * 4, angle, angle + Math.PI * 0.4);
            ctx.stroke();
        }
        ctx.restore();

        // Event horizon
        const bhGrad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        bhGrad.addColorStop(0, 'hsla(0, 0%, 0%, 1)');
        bhGrad.addColorStop(0.7, 'hsla(0, 50%, 10%, 0.9)');
        bhGrad.addColorStop(1, 'hsla(0, 70%, 20%, 0.3)');
        ctx.fillStyle = bhGrad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Red glow ring
        ctx.strokeStyle = 'hsla(0, 80%, 40%, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
    }

    function drawGate(gate, time, allNebulaeCollected) {
        const { x, y, radius } = gate;
        const pulse = 1 + Math.sin(time * 0.003) * 0.1;
        const r = radius * pulse;

        const hue = allNebulaeCollected ? 150 : 150;
        const alpha = allNebulaeCollected ? 0.8 : 0.3;
        const glowAlpha = allNebulaeCollected ? 0.4 : 0.1;

        // Outer glow
        const grad = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2);
        grad.addColorStop(0, `hsla(${hue}, 90%, 60%, ${glowAlpha})`);
        grad.addColorStop(1, `hsla(${hue}, 90%, 50%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r * 2, 0, Math.PI * 2);
        ctx.fill();

        // Rotating arcs
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(time * 0.002);
        ctx.strokeStyle = `hsla(${hue}, 90%, 60%, ${alpha})`;
        ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
            const start = (Math.PI * 2 / 3) * i;
            ctx.beginPath();
            ctx.arc(0, 0, r, start, start + Math.PI * 0.4);
            ctx.stroke();
        }
        ctx.restore();

        // Label
        if (!allNebulaeCollected) {
            ctx.fillStyle = 'hsla(150, 60%, 50%, 0.5)';
            ctx.font = '10px Outfit';
            ctx.textAlign = 'center';
            ctx.fillText('需收集星云', x, y + r + 18);
        }
    }

    function drawStardust(sd, time) {
        if (sd.collected) return;
        const { x, y } = sd;
        const twinkle = 0.5 + Math.sin(time * 0.005 + x * 0.1) * 0.3;
        ctx.globalAlpha = twinkle;
        ctx.fillStyle = 'hsl(45, 100%, 80%)';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    function drawStar(star, time) {
        const { x, y } = star;

        // Glow
        const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, 20);
        glowGrad.addColorStop(0, 'hsla(45, 100%, 80%, 0.9)');
        glowGrad.addColorStop(0.3, 'hsla(45, 100%, 70%, 0.4)');
        glowGrad.addColorStop(1, 'hsla(45, 100%, 60%, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = 'hsl(45, 100%, 90%)';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawTrail() {
        if (trailPoints.length < 2) return;
        for (let i = 1; i < trailPoints.length; i++) {
            const p = trailPoints[i];
            const prev = trailPoints[i - 1];
            ctx.strokeStyle = `hsla(45, 100%, 70%, ${p.alpha * 0.6})`;
            ctx.lineWidth = 2 * p.alpha;
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
        }
    }

    function drawParticles() {
        for (const p of particles) {
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    function drawTrajectoryPreview(points) {
        if (points.length < 2) return;
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = 'hsla(45, 80%, 70%, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }

    function drawStartIndicator(star, time) {
        const { x, y, vx, vy } = star;
        const speed = Math.sqrt(vx * vx + vy * vy);
        const dirX = vx / speed;
        const dirY = vy / speed;

        // Arrow base
        const arrowLen = 30;
        const ex = x + dirX * arrowLen;
        const ey = y + dirY * arrowLen;

        // Pulsing line
        const pulse = 0.4 + Math.sin(time * 0.004) * 0.2;
        ctx.strokeStyle = `hsla(45, 100%, 70%, ${pulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // Arrowhead
        const angle = Math.atan2(vy, vx);
        ctx.fillStyle = `hsla(45, 100%, 70%, ${pulse})`;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - 8 * Math.cos(angle - 0.4), ey - 8 * Math.sin(angle - 0.4));
        ctx.lineTo(ex - 8 * Math.cos(angle + 0.4), ey - 8 * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fill();

        // Star at origin
        const starPulse = 1 + Math.sin(time * 0.003) * 0.15;
        const sGrad = ctx.createRadialGradient(x, y, 0, x, y, 15 * starPulse);
        sGrad.addColorStop(0, 'hsla(45, 100%, 85%, 0.7)');
        sGrad.addColorStop(0.4, 'hsla(45, 100%, 70%, 0.3)');
        sGrad.addColorStop(1, 'hsla(45, 100%, 60%, 0)');
        ctx.fillStyle = sGrad;
        ctx.beginPath();
        ctx.arc(x, y, 15 * starPulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'hsl(45, 100%, 90%)';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // ===== Collection burst effect =====
    function burstAt(x, y, color, count = 20) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 30 + Math.random() * 80;
            emitParticle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                color,
                0.6 + Math.random() * 0.5,
                2 + Math.random() * 3
            );
        }
    }

    // ===== Main Render =====
    function render(state, time) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        ctx.clearRect(0, 0, w, h);

        drawBackground(time);

        const level = state.level;
        if (!level) return;

        const allNebulaeCollected = level.nebulae.every(n => n.collected);

        // Draw game objects
        for (const sd of level.stardust) drawStardust(sd, time);
        for (const n of level.nebulae) {
            if (n.collected) drawCollectedNebula(n);
            else drawNebula(n, time);
        }
        for (const bh of level.blackHoles) drawBlackHole(bh, time);
        drawGate(level.gate, time, allNebulaeCollected);

        // Draw wells
        for (const well of state.wells) {
            drawGravityWell(well, time);
        }

        // Draw trajectory preview (only in placement phase)
        if (state.phase === 'placing' && state.wells.length > 0) {
            const preview = Physics.predictTrajectory(
                level.star.x, level.star.y,
                level.star.vx, level.star.vy,
                state.wells
            );
            drawTrajectoryPreview(preview);
        }

        // Draw star
        if (state.phase === 'placing') {
            drawStartIndicator(level.star, time);
        } else if (state.phase === 'flying' && state.star) {
            drawTrail();
            drawParticles();
            drawStar(state.star, time);

            // Emit trail particles
            emitParticle(
                state.star.x + (Math.random() - 0.5) * 6,
                state.star.y + (Math.random() - 0.5) * 6,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20,
                `hsl(${35 + Math.random() * 20}, 100%, ${60 + Math.random() * 30}%)`,
                0.4 + Math.random() * 0.3,
                1 + Math.random() * 2
            );
        }

        // Update particles and trail
        updateParticles(1 / 60);
        updateTrail(1 / 60);
    }

    return {
        init, resize, render, clearParticles, burstAt, addTrailPoint,
        get width() { return window.innerWidth; },
        get height() { return window.innerHeight; }
    };
})();
