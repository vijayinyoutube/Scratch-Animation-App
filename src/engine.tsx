import React, { useEffect, useRef } from "react";
import { clampPos, collides, BlockData, SpriteData } from "./utils";

function waitFrame(): Promise<number> {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

export interface ScriptRunnerOptions {
  getSprites: () => SpriteData[];
  setSprites: React.Dispatch<React.SetStateAction<SpriteData[]>>;
  onCollision: (a: string, b: string) => void;
}

export interface SpritePos {
  x: number;
  y: number;
  direction: number;
}

export type SpritePatch =
  | Partial<SpriteData & SpritePos>
  | ((s: SpriteData & SpritePos) => Partial<SpriteData & SpritePos>);

export interface ScriptRunner {
  play: () => Promise<void>;
  stop: () => void;
}

export function createScriptRunner({
  getSprites,
  setSprites,
  onCollision,
}: ScriptRunnerOptions): ScriptRunner {
  let aborted = false;
  let lastSwapAt = 0;
  const version: Record<string, number> = {};
  const pos: Record<string, SpritePos> = {};
  const scripts: Record<string, BlockData[]> = {};

  function stop(): void {
    aborted = true;
    setSprites((sprites) => sprites.map((s) => ({ ...s, speech: null })));
  }

  function patch(id: string, patchItem: SpritePatch): void {
    const current = getSprites().find((s) => s.id === id);
    if (!current) return;
    const currentPos = pos[id] || {
      x: current.x,
      y: current.y,
      direction: current.direction,
    };
    const base: SpriteData & SpritePos = { ...current, ...currentPos };
    const applied =
      typeof patchItem === "function" ? patchItem(base) : patchItem;
    const merged = { ...base, ...applied };
    const clamped = clampPos(merged.x, merged.y);
    pos[id] = {
      x: clamped.x,
      y: clamped.y,
      direction: ((merged.direction % 360) + 360) % 360,
    };
    setSprites((sprites) =>
      sprites.map((s) =>
        s.id === id
          ? {
              ...s,
              ...merged,
              x: pos[id].x,
              y: pos[id].y,
              direction: pos[id].direction,
            }
          : s
      )
    );
  }

  function checkCollision(movedId: string): void {
    if (aborted) return;
    const now = Date.now();
    if (now - lastSwapAt < 850) return;
    const sprites = getSprites();
    const moved = sprites.find((s) => s.id === movedId);
    if (!moved) return;
    for (const other of sprites) {
      if (other.id === moved.id) continue;
      const a = pos[moved.id] || moved;
      const b = pos[other.id] || other;
      if (!collides(a, b)) continue;
      lastSwapAt = now;
      const scriptsA = scripts[moved.id] || [];
      const scriptsB = scripts[other.id] || [];
      scripts[moved.id] = scriptsB;
      scripts[other.id] = scriptsA;
      version[moved.id] = (version[moved.id] || 0) + 1;
      version[other.id] = (version[other.id] || 0) + 1;
      setSprites((list) =>
        list.map((s) => {
          if (s.id === moved.id) return { ...s, blocks: scriptsB };
          if (s.id === other.id) return { ...s, blocks: scriptsA };
          return s;
        })
      );
      onCollision(moved.name, other.name);
      return;
    }
  }

  function animateTo(
    id: string,
    x: number,
    y: number,
    ver: number,
    duration: number
  ): Promise<void> {
    const p = pos[id];
    const x0 = p.x;
    const y0 = p.y;
    const t0 = performance.now();
    return new Promise((resolve) => {
      const tick = (now: number) => {
        if (aborted || version[id] !== ver) {
          resolve();
          return;
        }
        const t = Math.min(1, (now - t0) / duration);
        patch(id, {
          x: x0 + (x - x0) * t,
          y: y0 + (y - y0) * t,
        });
        checkCollision(id);
        if (aborted || version[id] !== ver) {
          resolve();
          return;
        }
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  }

  async function animateMove(
    id: string,
    steps: number,
    ver: number
  ): Promise<void> {
    const p = pos[id];
    const rad = (p.direction * Math.PI) / 180;
    await animateTo(
      id,
      p.x + steps * Math.sin(rad),
      p.y + steps * Math.cos(rad),
      ver,
      Math.min(700, Math.max(180, Math.abs(steps) * 18))
    );
  }

  async function animateGoto(
    id: string,
    x: number,
    y: number,
    ver: number
  ): Promise<void> {
    const p = pos[id];
    const dist = Math.hypot(x - p.x, y - p.y);
    await animateTo(id, x, y, ver, Math.min(800, Math.max(200, dist * 4)));
  }

  async function wait(ms: number, ver: number, id: string): Promise<void> {
    const start = performance.now();
    while (performance.now() - start < ms) {
      if (aborted || version[id] !== ver) return;
      await waitFrame();
    }
  }

  async function runBlock(
    id: string,
    block: BlockData,
    ver: number
  ): Promise<void> {
    switch (block.type) {
      case "move":
        await animateMove(id, Number(block.steps) || 0, ver);
        break;
      case "turn":
        patch(id, (s) => ({
          direction: s.direction + (Number(block.degrees) || 0),
        }));
        await wait(180, ver, id);
        break;
      case "goto":
        await animateGoto(
          id,
          Number(block.x) || 0,
          Number(block.y) || 0,
          ver
        );
        break;
      case "say":
      case "think":
        patch(id, {
          speech: { kind: block.type, text: block.text || " " },
        });
        await wait((Number(block.seconds) || 1) * 1000, ver, id);
        patch(id, { speech: null });
        break;
      case "repeat": {
        const times = Math.max(0, Math.floor(Number(block.times) || 0));
        for (let i = 0; i < times; i += 1) {
          if (aborted || version[id] !== ver) return;
          await runBlocks(id, block.children || [], ver);
        }
        break;
      }
      default:
        break;
    }
  }

  async function runBlocks(
    id: string,
    blocks: BlockData[],
    ver: number
  ): Promise<void> {
    for (const block of blocks) {
      if (aborted || version[id] !== ver) return;
      await runBlock(id, block, ver);
    }
  }

  async function runSprite(id: string): Promise<void> {
    while (!aborted) {
      const ver = version[id];
      const blocks = scripts[id] || [];
      if (!blocks.length) return;
      await runBlocks(id, blocks, ver);
      if (aborted) return;
      if (version[id] !== ver) continue;
      return;
    }
  }

  async function play(): Promise<void> {
    aborted = false;
    lastSwapAt = 0;
    const sprites = getSprites();
    sprites.forEach((s) => {
      pos[s.id] = { x: s.x, y: s.y, direction: s.direction };
      scripts[s.id] = s.blocks;
      version[s.id] = (version[s.id] || 0) + 1;
    });
    await Promise.all(sprites.map((s) => runSprite(s.id)));
  }

  return {
    play,
    stop,
  };
}

export const ScriptRunner = createScriptRunner;

export function useScriptRunner(options: ScriptRunnerOptions): ScriptRunner {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const runnerRef = useRef<ScriptRunner | null>(null);

  if (!runnerRef.current) {
    runnerRef.current = createScriptRunner({
      getSprites: () => optionsRef.current.getSprites(),
      setSprites: (action) => optionsRef.current.setSprites(action),
      onCollision: (a, b) => optionsRef.current.onCollision(a, b),
    });
  }

  useEffect(() => {
    return () => {
      runnerRef.current?.stop();
    };
  }, []);

  return runnerRef.current;
}
