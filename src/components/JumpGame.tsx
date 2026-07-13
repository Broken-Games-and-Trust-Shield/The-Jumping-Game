import { useEffect, useRef } from "react";

declare global {
  interface Window {
    resetBestScores?: () => void;
  }
}

interface Spike {
  x: number;
  tall?: boolean;
}

interface Level {
  spikes: Spike[];
  end: number;
  speed: number;
  isChallenge: boolean;
}

export default function JumpGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const deathSound = new Audio(
      "https://www.myinstants.com/media/sounds/minecraft-damage.mp3",
    );
    deathSound.volume = 0.4;

    const xpSound = new Audio(
      "https://www.myinstants.com/media/sounds/minecraft-orb.mp3",
    );
    xpSound.volume = 0.4;

    const levelUpSound = new Audio(
      "https://www.myinstants.com/media/sounds/minecraft-levelup.mp3",
    );
    levelUpSound.volume = 0.5;

    let playerY = 0;
    let velocity = 0;
    let x = 0;

    let dead = false;
    let jumping = false;
    let airJumpsUsed = 0;
    let levelIndex = 0;
    let won = false;
    let gameComplete = false;
    let muted = false;

    let challengeOffered = false;
    let challengeMode = false;
    let challengeComplete = false;
    let doubleJumpUnlocked = false;

    const sounds = [deathSound, xpSound, levelUpSound];

    const muteButton = { x: 715, y: 32, width: 25, height: 25 };
    const challengeBtn = { x: 200, y: 128, width: 400, height: 28 };

    let jumpCount = 0;
    let currentDeaths = 0;

    const runHighScoreKey = "jump_game_highscore";
    const challengeHighScoreKey = "jump_game_challenge_highscore";
    let runHighScore = Number(localStorage.getItem(runHighScoreKey) || Infinity);
    let challengeHighScore = Number(
      localStorage.getItem(challengeHighScoreKey) || Infinity,
    );

    window.resetBestScores = () => {
      localStorage.removeItem(runHighScoreKey);
      localStorage.removeItem(challengeHighScoreKey);
      runHighScore = Infinity;
      challengeHighScore = Infinity;
      levelIndex = 0;
      currentDeaths = 0;
      jumpCount = 0;
      gameComplete = false;
      dead = false;
      won = false;
      challengeOffered = false;
      challengeMode = false;
      challengeComplete = false;
      doubleJumpUnlocked = false;
      x = 0;
      velocity = 0;
      playerY = 0;
      airJumpsUsed = 0;
      jumping = false;
    };

    const gravity = -0.7;
    const jumpPower = 8;
    const GAP = 20;

    const LAST_NORMAL = 4;
    const LAST_CHALLENGE = 9;

    function pickTargets(count: number, start: number, end: number): number[] {
      if (count === 0) return [];
      return Array.from({ length: count }, (_, i) =>
        start + ((i + 1) / (count + 1)) * (end - start),
      );
    }

    function generateNormalLevel(levelIdx: number, speed: number): Level {
      const TRACK_END = 4500;
      const BUFFER = 300;
      const numDoubles = [0, 1, 2, 3, 4][levelIdx];
      const spikes: Spike[] = [];
      let pos = 400;

      const doubleTargets = pickTargets(
        numDoubles,
        400 + BUFFER,
        TRACK_END - BUFFER,
      );
      let dti = 0;

      while (pos < TRACK_END) {
        pos += 180 + Math.random() * 150;
        spikes.push({ x: pos });

        if (dti < doubleTargets.length && pos >= doubleTargets[dti]) {
          pos += GAP;
          spikes.push({ x: pos });
          dti++;
        }
      }

      const lastX =
        spikes.length > 0 ? spikes[spikes.length - 1].x : TRACK_END;
      return { spikes, end: lastX + 400, speed, isChallenge: false };
    }

    function generateChallengeLevel(
      challengeIdx: number,
      speed: number,
    ): Level {
      const TRACK_END = 9000;
      const BUFFER = 400;

      const numDoubles = [2, 3, 3, 4, 4][challengeIdx];
      const numTriples = [1, 2, 3, 4, 5][challengeIdx];
      const numTalls = [0, 1, 2, 3, 4][challengeIdx];

      const usableStart = 400 + BUFFER;
      const usableEnd = TRACK_END - BUFFER;

      const third = (usableEnd - usableStart) / 3;
      const tallTargets = pickTargets(numTalls, usableStart, usableStart + third);
      const doubleTargets = pickTargets(
        numDoubles,
        usableStart + third,
        usableStart + 2 * third,
      );
      const tripleTargets = pickTargets(
        numTriples,
        usableStart + 2 * third,
        usableEnd,
      );

      const spikes: Spike[] = [];
      let pos = 400;
      let tallI = 0;
      let dblI = 0;
      let triI = 0;

      while (pos < TRACK_END) {
        pos += 180 + Math.random() * 150;

        if (tallI < tallTargets.length && pos >= tallTargets[tallI]) {
          spikes.push({ x: pos, tall: true });
          tallI++;
          continue;
        }

        if (triI < tripleTargets.length && pos >= tripleTargets[triI]) {
          spikes.push({ x: pos });
          pos += GAP;
          spikes.push({ x: pos });
          pos += GAP;
          spikes.push({ x: pos });
          triI++;
          continue;
        }

        if (dblI < doubleTargets.length && pos >= doubleTargets[dblI]) {
          spikes.push({ x: pos });
          pos += GAP;
          spikes.push({ x: pos });
          dblI++;
          continue;
        }

        spikes.push({ x: pos });
      }

      const lastX =
        spikes.length > 0 ? spikes[spikes.length - 1].x : TRACK_END;
      return { spikes, end: lastX + 400, speed, isChallenge: true };
    }

    const levels: Level[] = [
      generateNormalLevel(0, 5),
      generateNormalLevel(1, 6),
      generateNormalLevel(2, 7),
      generateNormalLevel(3, 8),
      generateNormalLevel(4, 9),
      generateChallengeLevel(0, 9),
      generateChallengeLevel(1, 10),
      generateChallengeLevel(2, 10),
      generateChallengeLevel(3, 11),
      generateChallengeLevel(4, 11),
    ];

    function resetLevel() {
      playerY = 0;
      velocity = 0;
      x = 0;
      dead = false;
      jumping = false;
      airJumpsUsed = 0;
      won = false;
      jumpCount = 0;
    }

    function fullReset() {
      levelIndex = 0;
      currentDeaths = 0;
      jumpCount = 0;
      gameComplete = false;
      dead = false;
      won = false;
      challengeOffered = false;
      challengeMode = false;
      challengeComplete = false;
      doubleJumpUnlocked = false;
      x = 0;
      velocity = 0;
      playerY = 0;
      airJumpsUsed = 0;
      jumping = false;
    }

    function finishLevel() {
      if (levelIndex === LAST_NORMAL) {
        gameComplete = true;
        won = false;

        levelUpSound.currentTime = 0;
        levelUpSound.play().catch(() => {});

        if (currentDeaths < runHighScore) {
          runHighScore = currentDeaths;
          localStorage.setItem(runHighScoreKey, String(runHighScore));
        }

        if (currentDeaths <= 3) challengeOffered = true;
        return;
      }

      if (levelIndex === LAST_CHALLENGE) {
        challengeComplete = true;
        challengeMode = false;
        gameComplete = true;
        won = false;

        levelUpSound.currentTime = 0;
        levelUpSound.play().catch(() => {});

        if (currentDeaths < challengeHighScore) {
          challengeHighScore = currentDeaths;
          localStorage.setItem(challengeHighScoreKey, String(challengeHighScore));
        }
        return;
      }

      levelIndex++;
      resetLevel();
    }

    function jump() {
      if (dead || won || gameComplete || doubleJumpUnlocked) return;

      if (!jumping) {
        velocity = jumpPower;
        jumping = true;
        jumpCount++;
      } else if (airJumpsUsed < 1 && challengeMode) {
        velocity = jumpPower;
        airJumpsUsed++;
        jumpCount++;
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (doubleJumpUnlocked) {
        doubleJumpUnlocked = false;
        challengeMode = true;
        gameComplete = false;
        levelIndex = 5;
        currentDeaths = 0;
        resetLevel();
        return;
      }
      jump();
    };
    window.addEventListener("keydown", handleKeyDown);

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clickX = (e.clientX - rect.left) * scaleX;
      const clickY = (e.clientY - rect.top) * scaleY;

      if (
        clickX >= muteButton.x &&
        clickX <= muteButton.x + muteButton.width &&
        clickY >= muteButton.y &&
        clickY <= muteButton.y + muteButton.height
      ) {
        muted = !muted;
        for (const sound of sounds) sound.muted = muted;
        return;
      }

      if (dead) {
        resetLevel();
        return;
      }
      if (won) {
        finishLevel();
        return;
      }

      if (doubleJumpUnlocked) {
        doubleJumpUnlocked = false;
        challengeMode = true;
        gameComplete = false;
        levelIndex = 5;
        currentDeaths = 0;
        resetLevel();
        return;
      }

      if (gameComplete && challengeOffered) {
        if (
          clickX >= challengeBtn.x &&
          clickX <= challengeBtn.x + challengeBtn.width &&
          clickY >= challengeBtn.y &&
          clickY <= challengeBtn.y + challengeBtn.height
        ) {
          doubleJumpUnlocked = true;
          gameComplete = false;
          challengeOffered = false;
          return;
        }
        fullReset();
        return;
      }

      if (gameComplete) {
        fullReset();
        return;
      }

      jump();
    };
    canvas.addEventListener("click", handleClick);

    let animationFrameId: number;

    function loop() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const level = levels[levelIndex];

      if (!dead && !won && !gameComplete) {
        x += level.speed;
        velocity += gravity;
        playerY += velocity;

        if (playerY < 0) {
          playerY = 0;
          velocity = 0;
          jumping = false;
          airJumpsUsed = 0;
        }

        for (const s of level.spikes) {
          const screenX = s.x - x;
          if (screenX < -50 || screenX > 200) continue;

          const horizHit = screenX < 118 && screenX + 18 > 100;
          const vertHit = s.tall ? playerY < 38 : playerY < 18;

          if (horizHit && vertHit && !dead) {
            dead = true;
            currentDeaths++;
            deathSound.currentTime = 0;
            deathSound.play().catch(() => {});
          }
        }

        const finalLevelIdx = challengeMode ? LAST_CHALLENGE : LAST_NORMAL;

        if (x >= level.end && playerY === 0 && !jumping && !won) {
          won = true;
          if (levelIndex !== finalLevelIdx) {
            xpSound.currentTime = 0;
            xpSound.play().catch(() => {});
          }
        }
      }

      ctx.fillStyle = "white";
      ctx.fillRect(0, 250, 800, 5);

      ctx.fillStyle = "cyan";
      ctx.fillRect(100, 230 - playerY, 18, 18);

      for (const s of level.spikes) {
        const screenX = s.x - x;
        if (screenX < -50 || screenX > 850) continue;
        if (s.tall) {
          ctx.fillStyle = "orange";
          ctx.fillRect(screenX, 210, 20, 40);
        } else {
          ctx.fillStyle = "red";
          ctx.fillRect(screenX, 230, 20, 20);
        }
      }

      ctx.fillStyle = "yellow";
      ctx.font = "bold 20px Arial";
      const levelLabel = challengeMode
        ? `Challenge ${levelIndex - 4} | Speed ${level.speed}`
        : `Level ${levelIndex + 1} | Speed ${level.speed}`;
      ctx.fillText(levelLabel, 20, 25);
      ctx.fillText(`Jumps: ${jumpCount}`, 250, 25);
      ctx.fillText(`Deaths: ${currentDeaths}`, 250, 45);

      ctx.textAlign = "right";
      const hsLabel = challengeMode
        ? `Challenge Best: ${challengeHighScore === Infinity ? "-" : challengeHighScore}`
        : `Best Run: ${runHighScore === Infinity ? "-" : runHighScore}`;
      ctx.fillText(hsLabel, 740, 25);
      ctx.textAlign = "left";

      ctx.font = "bold 18px Arial";
      ctx.fillText(muted ? "🔇" : "🔈", muteButton.x, muteButton.y + 18);

      if (doubleJumpUnlocked) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "gold";
        ctx.font = "bold 28px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Double Jump Unlocked! 😎", 400, 120);
        ctx.fillStyle = "white";
        ctx.font = "bold 18px Arial";
        ctx.fillText("- click to continue -", 400, 165);
        ctx.textAlign = "left";
      }

      if (!gameComplete && won) {
        ctx.fillStyle = "white";
        ctx.font = "bold 20px Arial";
        ctx.fillText("🏁 Level Complete - Click next", 250, 120);
      }

      if (dead) {
        ctx.fillStyle = "white";
        ctx.font = "bold 20px Arial";
        ctx.fillText("💀 Dead - Click to retry", 280, 120);
      }

      if (gameComplete && challengeComplete) {
        ctx.fillStyle = "gold";
        ctx.font = "bold 22px Arial";
        ctx.fillText("👑 CHALLENGE COMPLETE!", 210, 90);
        ctx.fillStyle = "white";
        ctx.font = "bold 18px Arial";
        ctx.fillText(`CHALLENGE SCORE: ${currentDeaths}`, 270, 118);
        ctx.fillText(
          `CHALLENGE BEST: ${challengeHighScore === Infinity ? "-" : challengeHighScore}`,
          260,
          143,
        );
        ctx.fillText("Click to play again", 300, 172);
      } else if (gameComplete && challengeOffered) {
        ctx.fillStyle = "white";
        ctx.font = "bold 20px Arial";
        ctx.fillText("🏆 GAME COMPLETE", 270, 78);
        ctx.font = "16px Arial";
        ctx.fillText(
          `Score: ${currentDeaths}  Best: ${runHighScore === Infinity ? "-" : runHighScore}`,
          288,
          100,
        );
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(
          challengeBtn.x,
          challengeBtn.y,
          challengeBtn.width,
          challengeBtn.height,
        );
        ctx.strokeStyle = "gold";
        ctx.lineWidth = 2;
        ctx.strokeRect(
          challengeBtn.x,
          challengeBtn.y,
          challengeBtn.width,
          challengeBtn.height,
        );
        ctx.fillStyle = "gold";
        ctx.font = "bold 15px Arial";
        ctx.textAlign = "center";
        ctx.fillText("⚡ CHALLENGE MODE — Click to enter!", 400, 147);
        ctx.textAlign = "left";
        ctx.fillStyle = "#aaa";
        ctx.font = "13px Arial";
        ctx.fillText("(click outside the box to play again)", 270, 175);
      } else if (gameComplete) {
        ctx.fillStyle = "white";
        ctx.font = "bold 20px Arial";
        ctx.fillText("🏆 GAME COMPLETE", 270, 100);
        ctx.fillText(`FINAL SCORE: ${currentDeaths}`, 290, 128);
        ctx.fillText(
          `BEST RUN: ${runHighScore === Infinity ? "-" : runHighScore}`,
          295,
          155,
        );
        ctx.fillText("Click to play again", 300, 185);
      }

      animationFrameId = requestAnimationFrame(loop);
    }

    loop();

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      canvas.removeEventListener("click", handleClick);
      cancelAnimationFrame(animationFrameId);
      delete window.resetBestScores;
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <h1 className="text-2xl mb-2">Jumping Game Preview</h1>
      <button
        onClick={() => window.resetBestScores?.()}
        style={{
          marginBottom: 10,
          padding: "6px 12px",
          background: "#222",
          color: "yellow",
          border: "1px solid yellow",
        }}
      >
        Reset Game
      </button>
      <canvas
        ref={canvasRef}
        width={800}
        height={300}
        style={{ background: "#111" }}
      />
      <p className="mt-4 text-sm opacity-70">
        Press SPACE or click to jump — double-tap to double jump!
      </p>
    </div>
  );
}
