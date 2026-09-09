/* ======================================
   physics.js - Gravity & Collision Engine
   ====================================== */

const Physics = (() => {

    const G = 20000; // Gravitational constant (tuned for gameplay feel)

    /**
     * Calculate gravitational force vector from a well on the starlight.
     * F = G * m / r²  (direction: toward well)
     */
    function gravityForce(starX, starY, well) {
        const dx = well.x - starX;
        const dy = well.y - starY;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        // Minimum distance clamp to avoid singularity
        const minDist = 20;
        const clampedDistSq = Math.max(distSq, minDist * minDist);

        const forceMag = G * well.strength / clampedDistSq;
        return {
            fx: forceMag * (dx / dist),
            fy: forceMag * (dy / dist)
        };
    }

    /**
     * Update starlight position using Velocity Verlet integration.
     * Returns new { x, y, vx, vy }.
     */
    function updateStar(star, wells, dt) {
        // Calculate total force
        let totalFx = 0, totalFy = 0;
        for (const well of wells) {
            const { fx, fy } = gravityForce(star.x, star.y, well);
            totalFx += fx;
            totalFy += fy;
        }

        // Verlet integration
        const newVx = star.vx + totalFx * dt;
        const newVy = star.vy + totalFy * dt;
        const newX = star.x + newVx * dt;
        const newY = star.y + newVy * dt;

        return { x: newX, y: newY, vx: newVx, vy: newVy };
    }

    /**
     * Check if a point is inside a circle.
     */
    function pointInCircle(px, py, cx, cy, r) {
        const dx = px - cx;
        const dy = py - cy;
        return dx * dx + dy * dy <= r * r;
    }

    /**
     * Check if starlight path segment crosses a circle (line-circle intersection).
     * Used for thin obstacles that the star might skip over in one frame.
     */
    function segmentCircleIntersect(x1, y1, x2, y2, cx, cy, r) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const fx = x1 - cx;
        const fy = y1 - cy;

        const a = dx * dx + dy * dy;
        const b = 2 * (fx * dx + fy * dy);
        const c = fx * fx + fy * fy - r * r;

        let disc = b * b - 4 * a * c;
        if (disc < 0) return false;

        disc = Math.sqrt(disc);
        const t1 = (-b - disc) / (2 * a);
        const t2 = (-b + disc) / (2 * a);

        return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) ||
            (t1 < 0 && t2 > 1);
    }

    /**
     * Check collisions between star and all game objects.
     * Returns an event object or null.
     */
    function checkCollisions(star, prevStar, level, canvasW, canvasH) {
        // Check nebulae (collection zones)
        for (let i = 0; i < level.nebulae.length; i++) {
            const n = level.nebulae[i];
            if (n.collected) continue;
            if (pointInCircle(star.x, star.y, n.x, n.y, n.radius) ||
                segmentCircleIntersect(prevStar.x, prevStar.y, star.x, star.y, n.x, n.y, n.radius)) {
                return { type: 'nebula', index: i };
            }
        }

        // Check stardust
        for (let i = 0; i < level.stardust.length; i++) {
            const s = level.stardust[i];
            if (s.collected) continue;
            if (pointInCircle(star.x, star.y, s.x, s.y, s.radius) ||
                segmentCircleIntersect(prevStar.x, prevStar.y, star.x, star.y, s.x, s.y, s.radius)) {
                return { type: 'stardust', index: i };
            }
        }

        // Check black holes
        for (const bh of level.blackHoles) {
            if (pointInCircle(star.x, star.y, bh.x, bh.y, bh.radius) ||
                segmentCircleIntersect(prevStar.x, prevStar.y, star.x, star.y, bh.x, bh.y, bh.radius)) {
                return { type: 'blackhole' };
            }
        }

        // Check gate (goal)
        const gate = level.gate;
        if (pointInCircle(star.x, star.y, gate.x, gate.y, gate.radius) ||
            segmentCircleIntersect(prevStar.x, prevStar.y, star.x, star.y, gate.x, gate.y, gate.radius)) {
            // Check if all nebulae collected
            const allCollected = level.nebulae.every(n => n.collected);
            if (allCollected) {
                return { type: 'gate' };
            } else {
                // Pass through gate without completing — star just passes through
                return null;
            }
        }

        // Check out of bounds
        const margin = 100;
        if (star.x < -margin || star.x > canvasW + margin ||
            star.y < -margin || star.y > canvasH + margin) {
            return { type: 'outofbounds' };
        }

        return null;
    }

    /**
     * Predict the trajectory for preview (dotted line).
     * Returns array of {x, y} points.
     */
    function predictTrajectory(startX, startY, vx, vy, wells, steps = 300, dt = 0.016) {
        const points = [];
        let x = startX, y = startY;
        let cvx = vx, cvy = vy;

        for (let i = 0; i < steps; i++) {
            let totalFx = 0, totalFy = 0;
            for (const well of wells) {
                const { fx, fy } = gravityForce(x, y, well);
                totalFx += fx;
                totalFy += fy;
            }
            cvx += totalFx * dt;
            cvy += totalFy * dt;
            x += cvx * dt;
            y += cvy * dt;

            if (i % 3 === 0) {
                points.push({ x, y });
            }
        }
        return points;
    }

    return {
        gravityForce,
        updateStar,
        pointInCircle,
        segmentCircleIntersect,
        checkCollisions,
        predictTrajectory
    };
})();
