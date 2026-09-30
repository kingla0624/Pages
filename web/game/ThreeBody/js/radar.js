/**
 * Real-time Tri-Solar Ephemeris Gravitational Radar
 * Visualizes the orbital trajectory, barycenter, and tidal pull vectors of the three suns.
 */
export class CelestialRadar {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    // High-DPI retina crisp rendering
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 96;
    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.ctx.scale(dpr, dpr);

    this.width = size;
    this.height = size;
    this.center = size / 2;
    this.sweepAngle = 0;
    this.scale = 0.082; // Maps world units (500 units) cleanly inside radar circle
  }

  update(suns, delta) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const cx = this.center;
    const cy = this.center;
    const radius = cx - 6;

    this.sweepAngle = (this.sweepAngle + delta * 2.2) % (Math.PI * 2);

    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Radar Circular Grid & Concentric Rings
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.22)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.65, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.32, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.stroke();

    // 2. Rotating Radar Sweep Scanline
    const sweepX = cx + Math.cos(this.sweepAngle) * radius;
    const sweepY = cy + Math.sin(this.sweepAngle) * radius;
    const sweepGrad = ctx.createLinearGradient(cx, cy, sweepX, sweepY);
    sweepGrad.addColorStop(0, 'rgba(245, 158, 11, 0.4)');
    sweepGrad.addColorStop(1, 'rgba(245, 158, 11, 0.0)');

    ctx.strokeStyle = sweepGrad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(sweepX, sweepY);
    ctx.stroke();

    // 3. Central Planet (Trisolaris Prime)
    ctx.fillStyle = '#4ade80';
    ctx.shadowColor = '#4ade80';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();

    // 4. Draw Tri-Solar Gravitational Barycenter & Sun Nodes
    let netForceX = 0;
    let netForceY = 0;

    const sunColors = {
      0: { fill: '#fbbf24', shadow: '#f59e0b', label: 'α' }, // Alpha (Gold)
      1: { fill: '#ef4444', shadow: '#dc2626', label: 'β' }, // Beta (Red)
      2: { fill: '#38bdf8', shadow: '#0284c7', label: 'γ' }  // Gamma (Cyan)
    };

    suns.forEach((sun, idx) => {
      const pos = sun.group.position;
      const rx = cx + pos.x * this.scale;
      const ry = cy + pos.z * this.scale;

      const style = sunColors[idx] || { fill: '#fff', shadow: '#fff', label: '' };

      // Gravitational vector connecting sun to planet
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(rx, ry);
      ctx.stroke();

      // Sun blip
      ctx.fillStyle = style.fill;
      ctx.shadowColor = style.shadow;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(rx, ry, 4, 0, Math.PI * 2);
      ctx.fill();

      // Greek label
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#f8fafc';
      ctx.font = '9px monospace';
      ctx.fillText(style.label, rx + 6, ry + 3);

      // Accumulate gravitational tide direction
      const dist = Math.sqrt(pos.x * pos.x + pos.z * pos.z) || 1;
      const mass = (idx === 1 ? 2.5 : (idx === 0 ? 1.5 : 1.0));
      netForceX += (pos.x / dist) * mass;
      netForceY += (pos.z / dist) * mass;
    });

    // 5. Net Gravitational Tidal Vector (Red Arrow)
    const tideLen = Math.min(radius * 0.9, Math.sqrt(netForceX * netForceX + netForceY * netForceY) * 12);
    const tideAngle = Math.atan2(netForceY, netForceX);
    const tx = cx + Math.cos(tideAngle) * tideLen;
    const ty = cy + Math.sin(tideAngle) * tideLen;

    ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}
