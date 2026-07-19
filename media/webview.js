/**
 * ROAST BUDDY — Webview-side JavaScript
 * Controls SVG robot walking, cheer/roast animations, and speech bubbles.
 */
(function () {
    const speechBubble = document.getElementById('speech-bubble');
    const bubbleText = document.getElementById('bubble-text');
    const particlesCanvas = document.getElementById('particles-canvas');
    const ctx = particlesCanvas.getContext('2d');
    const walker = document.getElementById('robot-walker');
    const robotSvg = document.getElementById('robot-svg');
    const stage = document.getElementById('character-stage');

    let isAnimating = false;
    let particles = [];
    let animationFrameId = null;
    let currentCharacter = 'robot';

    // ── Walk state ──
    let walkX = 0;
    let walkDirection = 1; // 1 = right, -1 = left
    const walkSpeed = 0.25; // slower, gentler walk (pixels per frame)
    let walkRAF = null;
    let isWalking = true;
    let minX = 0;
    let maxX = 0;
    const edgePadding = 8; // allow a slight overshoot so the visual sprite touches the panel edge

    function resizeCanvas() {
        particlesCanvas.width = window.innerWidth;
        particlesCanvas.height = window.innerHeight;
    }

    resizeCanvas();
    function recomputeBounds() {
        minX = -edgePadding;
        maxX = stage.clientWidth - walker.clientWidth + edgePadding;
        if (walkX > maxX) walkX = maxX;
        if (walkX < minX) walkX = minX;
    }

    window.addEventListener('resize', () => {
        resizeCanvas();
        recomputeBounds();
    });

    // ── Message handler ──
    window.addEventListener('message', (event) => {
        const data = event.data;

        if (data.command === 'updateCharacter') {
            setCharacter(data.character);
            return;
        }

        if (data.command === 'react') {
            handleReaction(data.type, data.message, data.intensity, data.character);
        }
    });

    function setCharacter(character) {
        const nextCharacter = character === 'girlBot' ? 'girlBot' : 'robot';
        if (currentCharacter === nextCharacter && walker.dataset.character === nextCharacter) {
            return;
        }

        currentCharacter = nextCharacter;
        walker.dataset.character = nextCharacter;
        walker.classList.toggle('girl-bot', nextCharacter === 'girlBot');
        robotSvg.setAttribute(
            'aria-label',
            nextCharacter === 'girlBot' ? 'Roast Buddy girl bot' : 'Roast Buddy robot'
        );

        const existingAccessories = document.getElementById('girlBot-accessories');
        if (existingAccessories) {
            existingAccessories.remove();
        }

        if (nextCharacter !== 'girlBot') {
            return;
        }

        const head = document.getElementById('head');
        if (!head) {
            return;
        }

        head.insertAdjacentHTML('beforeend', `
            <g id="girlBot-accessories">
                <g transform="translate(304 165)">
                    <path d="M 0 28 Q -8 2 12 -14 Q 36 -34 60 -10 Q 70 0 64 20 Q 56 42 34 44 Q 14 44 0 28 Z"
                          fill="#ff63b2" class="outline"></path>
                    <path d="M 82 28 Q 90 2 70 -14 Q 46 -34 22 -10 Q 12 0 18 20 Q 26 42 48 44 Q 68 44 82 28 Z"
                          fill="#ff63b2" class="outline"></path>
                    <circle cx="41" cy="18" r="14" fill="#ff5fab" class="outline"></circle>
                    <circle cx="46" cy="13" r="4" fill="#fff" opacity=".5"></circle>
                </g>
                <path d="M 400 264 L 387 257" fill="none" class="outline" stroke-width="7"></path>
                <path d="M 415 255 L 408 244" fill="none" class="outline" stroke-width="7"></path>
                <path d="M 463 265 L 478 257" fill="none" class="outline" stroke-width="7"></path>
                <path d="M 623 264 L 636 257" fill="none" class="outline" stroke-width="7"></path>
                <path d="M 608 255 L 615 244" fill="none" class="outline" stroke-width="7"></path>
                <path d="M 561 265 L 546 257" fill="none" class="outline" stroke-width="7"></path>
                <ellipse cx="394" cy="349" rx="14" ry="8" fill="#ffb1d9"></ellipse>
                <ellipse cx="630" cy="349" rx="14" ry="8" fill="#ffb1d9"></ellipse>
            </g>
        `);
    }

    // ── Walking loop ──
    function startWalking() {
        if (walkRAF) {
            return;
        }
        isWalking = true;
        walker.classList.add('walking');
        walker.classList.remove('cheering', 'roasting');
        walkLoop();
    }

    // Grab skateboard group so we can add a small rocking transform synced to walkX
    const skateboard = document.getElementById('skateboard');

    function walkLoop() {
        if (!isWalking) {
            return;
        }

        // Update bounds if not set
        if (maxX === 0) recomputeBounds();

        walkX += walkSpeed * walkDirection;

        // Bounce at edges
        if (walkX >= maxX) {
            walkX = maxX;
            walkDirection = -1;
            walker.classList.add('facing-left');
        } else if (walkX <= minX) {
            walkX = minX;
            walkDirection = 1;
            walker.classList.remove('facing-left');
        }

        // Move the walker container
        walker.style.transform = `translateX(${walkX}px)`;

        // Rock the skateboard slightly so it looks like the character is skateboarding
        if (skateboard) {
            const tiltY = Math.sin(walkX / 14) * 2; // small vertical bob
            const tiltDeg = Math.sin(walkX / 18) * 2 * (walkDirection || 1); // tiny rotation
            // anchor roughly at deck center near bottom of SVG
            skateboard.setAttribute('transform', `translate(0,${tiltY}) rotate(${tiltDeg} 512 920)`);
        }

        walkRAF = requestAnimationFrame(walkLoop);
    }

    function stopWalking() {
        isWalking = false;
        if (walkRAF) {
            cancelAnimationFrame(walkRAF);
            walkRAF = null;
        }
        walker.classList.remove('walking');
    }

    // ── Position the speech bubble right above the robot (comic-book style) ──
    function positionBubble() {
        const walkerWidth = walker.clientWidth;
        const walkerHeight = walker.clientHeight;
        const bubbleHeight = speechBubble.offsetHeight || 60;

        // Position bubble just above the robot's head with a small gap
        const bubbleBottom = walkerHeight + 8;
        // Center the bubble horizontally relative to the walker's current position,
        // then nudge it slightly left for a better panel placement.
        const bubbleLeft = walkX + (walkerWidth / 2) - 80;

        // Clamp so bubble doesn't go off-screen
        const maxLeft = stage.clientWidth - (speechBubble.offsetWidth || 200);
        const clampedLeft = Math.max(4, Math.min(bubbleLeft, maxLeft));

        speechBubble.style.bottom = bubbleBottom + 'px';
        speechBubble.style.left = clampedLeft + 'px';
    }

    // ── Reaction handler ──
    async function handleReaction(type, message, intensity, character) {
        if (isAnimating) {
            return;
        }

        setCharacter(character);
        isAnimating = true;

        // Stop walking and center the character
        stopWalking();

        // Center the robot for the reaction
        const centerX = (stage.clientWidth - walker.clientWidth) / 2;
        walkX = centerX;
        walker.style.transform = `translateX(${centerX}px)`;
        walker.classList.remove('facing-left');

        // Small delay for settling
        await sleep(150);

        // Apply animation class
        const animClass = type === 'roast' ? 'roasting' : 'cheering';
        walker.classList.add(animClass);

        // Position and show speech bubble above the character
        positionBubble();
        await showBubble(type, message);
        launchParticles(type, intensity);

        // Hold the animation
        const holdTime = Math.min(Math.max(message.length * 50, 3000), 8000);
        await sleep(holdTime);

        // Clean up
        await hideBubble();
        walker.classList.remove('cheering', 'roasting');

        // Resume walking after a brief pause
        await sleep(300);
        isAnimating = false;
        startWalking();
    }

    // ── Speech bubble ──
    async function showBubble(type, message) {
        speechBubble.className = '';
        speechBubble.classList.add(type === 'roast' ? 'roast-mode' : 'cheer-mode');
        bubbleText.innerHTML = '';
        speechBubble.style.display = '';
        speechBubble.style.animation = 'bubbleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
        await typewriterEffect(message);
    }

    async function typewriterEffect(text) {
        return new Promise((resolve) => {
            let index = 0;
            const cursor = document.createElement('span');
            cursor.className = 'cursor';
            bubbleText.textContent = '';
            bubbleText.appendChild(cursor);

            const interval = setInterval(() => {
                if (index < text.length) {
                    bubbleText.insertBefore(document.createTextNode(text[index]), cursor);
                    index++;
                    return;
                }

                clearInterval(interval);
                setTimeout(() => {
                    cursor.remove();
                    resolve();
                }, 650);
            }, 22);
        });
    }

    async function hideBubble() {
        return new Promise((resolve) => {
            speechBubble.classList.add('fade-out');
            setTimeout(() => {
                speechBubble.classList.add('hidden');
                speechBubble.classList.remove('fade-out', 'roast-mode', 'cheer-mode');
                resolve();
            }, 280);
        });
    }

    // ── Particles ──
    class Particle {
        constructor(type, intensity) {
            this.x = Math.random() * particlesCanvas.width;
            this.y = particlesCanvas.height + 8;
            this.size = Math.random() * 5 + 2;
            this.life = 1;
            this.decay = Math.random() * 0.014 + 0.006;
            this.type = type;

            if (type === 'roast') {
                this.vx = (Math.random() - 0.5) * 3;
                this.vy = -(Math.random() * 4 + 2);
                this.color = `hsla(${Math.random() * 25}, 95%, ${52 + Math.random() * 18}%, `;
                this.gravity = -0.018;
                this.wobble = Math.random() * 0.12;
            } else {
                this.vx = (Math.random() - 0.5) * 5;
                this.vy = -(Math.random() * 6 + 3);
                this.color = `hsla(${Math.random() * 360}, 80%, 65%, `;
                this.gravity = 0.08;
                this.rotation = Math.random() * Math.PI * 2;
                this.rotSpeed = (Math.random() - 0.5) * 0.2;
                this.isRect = Math.random() > 0.45;
            }

            if (intensity === 'savage') {
                this.size *= 1.25;
            }
        }

        update() {
            this.x += this.vx;
            this.vy += this.gravity;
            this.y += this.vy;
            this.life -= this.decay;

            if (this.type === 'roast') {
                this.vx += Math.sin(this.y * this.wobble) * 0.08;
            } else {
                this.rotation += this.rotSpeed;
                this.vx *= 0.99;
            }
        }

        draw(ctx) {
            if (this.life <= 0) {
                return;
            }

            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.globalAlpha = this.life;

            if (this.type === 'roast') {
                ctx.fillStyle = this.color + '1)';
                ctx.shadowColor = this.color + '0.8)';
                ctx.shadowBlur = this.size * 2.5;
                ctx.beginPath();
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.rotate(this.rotation);
                ctx.fillStyle = this.color + '1)';
                if (this.isRect) {
                    ctx.fillRect(-this.size, -this.size / 2, this.size * 2, this.size);
                } else {
                    ctx.beginPath();
                    ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            ctx.restore();
        }
    }

    function launchParticles(type, intensity) {
        const count = intensity === 'savage' ? 56 : intensity === 'medium' ? 36 : 18;

        for (let i = 0; i < count; i++) {
            particles.push(new Particle(type, intensity));
        }

        if (!animationFrameId) {
            animateParticles();
        }
    }

    function animateParticles() {
        ctx.clearRect(0, 0, particlesCanvas.width, particlesCanvas.height);
        particles = particles.filter((p) => p.life > 0);
        particles.forEach((p) => {
            p.update();
            p.draw(ctx);
        });

        if (particles.length > 0) {
            animationFrameId = requestAnimationFrame(animateParticles);
            return;
        }

        animationFrameId = null;
        ctx.clearRect(0, 0, particlesCanvas.width, particlesCanvas.height);
    }

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // ── Initialize: Start walking ──
    setCharacter('robot');
    startWalking();
})();
