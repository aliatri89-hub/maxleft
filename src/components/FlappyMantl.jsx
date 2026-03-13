import { useEffect, useRef } from "react";

function FlappyMantl({ onClose }) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width = 360;
    const H = canvas.height = 640;

    const GRAVITY = 0.45;
    const FLAP = -7.5;
    const PIPE_W = 52;
    const GAP_BASE = 155;
    const SPEED_BASE = 2.5;
    const BIRD_SIZE = 28;
    const getSpeed = () => SPEED_BASE + game.score * 0.15;
    const getGap = () => Math.max(115, GAP_BASE - game.score * 2.5);

    const game = {
      bird: { x: 80, y: H / 2, vy: 0, rotation: 0 },
      pipes: [],
      score: 0,
      best: parseInt(localStorage.getItem("flappy_mantl_best") || "0"),
      state: "ready", // ready, playing, dead
      frame: 0,
      groundX: 0,
    };
    gameRef.current = game;

    const spawnPipe = () => {
      const gap = getGap();
      const minTop = 80;
      const maxTop = H - gap - 120;
      const topH = minTop + Math.random() * (maxTop - minTop);
      game.pipes.push({ x: W + 20, topH, gap, scored: false });
    };

    const flap = () => {
      if (game.state === "ready") {
        game.state = "playing";
        game.bird.vy = FLAP;
        spawnPipe();
      } else if (game.state === "playing") {
        game.bird.vy = FLAP;
      } else if (game.state === "dead" && game.frame > 20) {
        // Restart
        game.bird = { x: 80, y: H / 2, vy: 0, rotation: 0 };
        game.pipes = [];
        game.score = 0;
        game.state = "ready";
        game.frame = 0;
      }
    };

    const handleTap = (e) => { e.preventDefault(); flap(); };
    canvas.addEventListener("touchstart", handleTap, { passive: false });
    canvas.addEventListener("mousedown", handleTap);
    const handleKey = (e) => { if (e.code === "Space") { e.preventDefault(); flap(); } };
    window.addEventListener("keydown", handleKey);

    const drawBird = () => {
      const { bird } = game;
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate(Math.min(bird.rotation, Math.PI / 4));

      // Body — terracotta circle
      ctx.beginPath();
      ctx.arc(0, 0, BIRD_SIZE / 2, 0, Math.PI * 2);
      ctx.fillStyle = "#C4734F";
      ctx.fill();
      ctx.strokeStyle = "#A05A3A";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Eye
      ctx.beginPath();
      ctx.arc(6, -5, 5, 0, Math.PI * 2);
      ctx.fillStyle = "white";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(7, -5, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#2C2420";
      ctx.fill();

      // Beak
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(20, -2);
      ctx.lineTo(20, 4);
      ctx.closePath();
      ctx.fillStyle = "#E8A838";
      ctx.fill();

      // Wing
      ctx.beginPath();
      ctx.ellipse(-4, 4, 10, 6, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = "#D4896A";
      ctx.fill();

      // "M" on body
      ctx.font = "bold 10px 'Barlow Condensed', sans-serif";
      ctx.fillStyle = "#F5F0E8";
      ctx.textAlign = "center";
      ctx.fillText("M", -1, 4);

      ctx.restore();
    };

    const drawPipe = (pipe) => {
      const grad = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_W, 0);
      grad.addColorStop(0, "#7A9A6A");
      grad.addColorStop(0.5, "#8FB07E");
      grad.addColorStop(1, "#6B8A5B");

      // Top pipe
      ctx.fillStyle = grad;
      ctx.fillRect(pipe.x, 0, PIPE_W, pipe.topH);
      // Top pipe cap
      ctx.fillStyle = "#6B8A5B";
      ctx.fillRect(pipe.x - 4, pipe.topH - 20, PIPE_W + 8, 20);
      ctx.strokeStyle = "#5A7A4A";
      ctx.lineWidth = 1;
      ctx.strokeRect(pipe.x - 4, pipe.topH - 20, PIPE_W + 8, 20);

      // Bottom pipe
      const botY = pipe.topH + pipe.gap;
      ctx.fillStyle = grad;
      ctx.fillRect(pipe.x, botY, PIPE_W, H - botY);
      // Bottom pipe cap
      ctx.fillStyle = "#6B8A5B";
      ctx.fillRect(pipe.x - 4, botY, PIPE_W + 8, 20);
      ctx.strokeStyle = "#5A7A4A";
      ctx.strokeRect(pipe.x - 4, botY, PIPE_W + 8, 20);
    };

    const collides = (pipe) => {
      const b = game.bird;
      const r = BIRD_SIZE / 2 - 3;
      const inX = b.x + r > pipe.x && b.x - r < pipe.x + PIPE_W;
      const hitTop = b.y - r < pipe.topH;
      const hitBot = b.y + r > pipe.topH + pipe.gap;
      return inX && (hitTop || hitBot);
    };

    const loop = () => {
      ctx.clearRect(0, 0, W, H);

      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#87CEEB");
      sky.addColorStop(0.7, "#E0F0FF");
      sky.addColorStop(1, "#F5F0E8");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // Scrolling ground
      const groundH = 60;
      const groundY = H - groundH;
      if (game.state === "playing") game.groundX = (game.groundX - getSpeed()) % 40;
      ctx.fillStyle = "#D4C4A8";
      ctx.fillRect(0, groundY, W, groundH);
      ctx.strokeStyle = "#C4B498";
      ctx.lineWidth = 1;
      for (let x = game.groundX; x < W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, groundY); ctx.lineTo(x + 20, groundY + 15); ctx.stroke();
      }
      ctx.fillStyle = "#8B7D6B";
      ctx.fillRect(0, groundY, W, 3);

      if (game.state === "playing") {
        // Update bird
        game.bird.vy += GRAVITY;
        game.bird.y += game.bird.vy;
        game.bird.rotation = Math.min(game.bird.vy * 0.08, Math.PI / 3);

        // Update pipes
        game.pipes.forEach(p => p.x -= getSpeed());

        // Spawn new pipes
        if (game.pipes.length === 0 || game.pipes[game.pipes.length - 1].x < W - 200) {
          spawnPipe();
        }

        // Score
        game.pipes.forEach(p => {
          if (!p.scored && p.x + PIPE_W < game.bird.x) {
            p.scored = true;
            game.score++;
          }
        });

        // Remove off-screen
        game.pipes = game.pipes.filter(p => p.x > -PIPE_W - 10);

        // Collision
        const hitGround = game.bird.y + BIRD_SIZE / 2 > groundY;
        const hitCeiling = game.bird.y - BIRD_SIZE / 2 < 0;
        const hitPipe = game.pipes.some(p => collides(p));

        if (hitGround || hitCeiling || hitPipe) {
          game.state = "dead";
          game.frame = 0;
          if (game.score > game.best) {
            game.best = game.score;
            try { localStorage.setItem("flappy_mantl_best", String(game.best)); } catch {}
          }
        }
      }

      // Draw pipes
      game.pipes.forEach(p => drawPipe(p));

      // Draw bird
      if (game.state === "ready") {
        game.bird.y = H / 2 + Math.sin(Date.now() / 300) * 10;
      }
      drawBird();

      // Score display
      if (game.state === "playing" || game.state === "dead") {
        ctx.font = "bold 48px 'Barlow Condensed', sans-serif";
        ctx.textAlign = "center";
        ctx.strokeStyle = "#2C2420";
        ctx.lineWidth = 4;
        ctx.strokeText(game.score, W / 2, 70);
        ctx.fillStyle = "white";
        ctx.fillText(game.score, W / 2, 70);
      }

      // Ready screen
      if (game.state === "ready") {
        ctx.font = "bold 32px 'Barlow Condensed', sans-serif";
        ctx.fillStyle = "#2C2420";
        ctx.textAlign = "center";
        ctx.fillText("FLAPPY MANTL", W / 2, 160);
        ctx.font = "16px 'IBM Plex Mono', monospace";
        ctx.fillStyle = "#8a7e72";
        ctx.fillText("tap to flap", W / 2, 195);
        if (game.best > 0) {
          ctx.font = "14px 'IBM Plex Mono', monospace";
          ctx.fillStyle = "#C4734F";
          ctx.fillText(`best: ${game.best}`, W / 2, 225);
        }
      }

      // Game over
      if (game.state === "dead") {
        game.frame++;
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(0, 0, W, H);

        const panelY = H / 2 - 80;
        ctx.fillStyle = "#F5F0E8";
        ctx.beginPath();
        ctx.roundRect(W / 2 - 110, panelY, 220, 160, 12);
        ctx.fill();
        ctx.strokeStyle = "#D0D0D0";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = "bold 28px 'Barlow Condensed', sans-serif";
        ctx.fillStyle = "#C4734F";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", W / 2, panelY + 38);

        ctx.font = "18px 'IBM Plex Mono', monospace";
        ctx.fillStyle = "#2C2420";
        ctx.fillText(`Score: ${game.score}`, W / 2, panelY + 75);

        ctx.font = "14px 'IBM Plex Mono', monospace";
        ctx.fillStyle = "#8a7e72";
        ctx.fillText(`Best: ${game.best}`, W / 2, panelY + 100);

        ctx.font = "14px 'IBM Plex Mono', monospace";
        ctx.fillStyle = "#C4734F";
        ctx.fillText("tap to retry", W / 2, panelY + 135);
      }

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameRef.current);
      canvas.removeEventListener("touchstart", handleTap);
      canvas.removeEventListener("mousedown", handleTap);
      window.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.9)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    }}>
      <canvas ref={canvasRef} style={{ borderRadius: 12, maxWidth: "100%", maxHeight: "85vh", touchAction: "none" }} />
      <button onClick={onClose} style={{
        marginTop: 16, padding: "10px 32px", background: "transparent", border: "1px solid rgba(255,255,255,0.3)",
        color: "white", borderRadius: 8, fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, cursor: "pointer",
      }}>
        Back to Mantl
      </button>
    </div>
  );
}


export default FlappyMantl;
