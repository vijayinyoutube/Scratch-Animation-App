export const STAGE = { width: 360, height: 260 };
export const SPRITE_HIT = 70;

export type BlockType = "move" | "turn" | "goto" | "say" | "think" | "repeat";

export interface BlockData {
  id: string;
  type: BlockType;
  steps?: number | string;
  degrees?: number | string;
  x?: number | string;
  y?: number | string;
  text?: string;
  seconds?: number | string;
  times?: number | string;
  children?: BlockData[];
}

// create new type from "BlockData" excluding the "id" property 
export type BlockTemplate = Omit<BlockData, "id"> & {
  id?: string;
  children?: BlockTemplate[];
};

export interface SpeechState {
  kind: "say" | "think";
  text: string;
}

export interface SpriteData {
  id: string;
  name: string;
  hue: number;
  x: number;
  y: number;
  direction: number;
  blocks: BlockData[];
  speech: SpeechState | null;
}

export type DropPayload =
  | { origin: "palette"; template: BlockTemplate | BlockData }
  | { origin: "script"; blockId: string };

export interface DropTargetEvent {
  kind: "before" | "after" | "append";
  payload: DropPayload;
  parentId?: string | null;
  beforeId?: string | null;
  afterId?: string | null;
}

export function uid(prefix: string = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;
}

export interface PaletteConfig {
  motion: BlockTemplate[];
  looks: BlockTemplate[];
  control: BlockTemplate[];
}

export const PALETTE: PaletteConfig = {
  motion: [
    { type: "move", steps: 10 },
    { type: "turn", degrees: 15 },
    { type: "turn", degrees: -15 },
    { type: "goto", x: 0, y: 0 },
  ],
  looks: [
    { type: "say", text: "Hello!", seconds: 2 },
    { type: "think", text: "Hmm...", seconds: 2 },
  ],
  control: [{ type: "repeat", times: 10, children: [] }],
};

const HUES: number[] = [0, 72, 160, 210, 300, 30];

export function createSprite(
  index: number,
  extras: { x?: number; y?: number } = {}
): SpriteData {
  const col = index % 2 === 0 ? -110 : 110;
  const row = Math.floor(index / 2) * -70;
  return {
    id: uid("sprite"),
    name: `Sprite ${index + 1}`,
    hue: HUES[index % HUES.length],
    x: extras.x != null ? extras.x : col,
    y: extras.y != null ? extras.y : row,
    direction: 90,
    blocks: [],
    speech: null,
  };
}

export function cloneFromPalette(
  template: BlockTemplate | BlockData
): BlockData {
  const block: BlockData = {
    ...template,
    id: uid("block"),
  };
  if (template.type === "repeat") {
    block.children = (template.children || []).map(cloneFromPalette);
  }
  return block;
}

export function extractBlock(
  blocks: BlockData[],
  id: string
): { blocks: BlockData[]; extracted: BlockData | null } {
  let extracted: BlockData | null = null;
  const walk = (list: BlockData[]): BlockData[] => {
    const out: BlockData[] = [];
    for (const b of list) {
      if (b.id === id) {
        extracted = b;
        continue;
      }
      if (b.children) {
        out.push({ ...b, children: walk(b.children) });
      } else {
        out.push(b);
      }
    }
    return out;
  };
  return { blocks: walk(blocks), extracted };
}

export function isInside(block: BlockData | null | undefined, id: string): boolean {
  if (!block || !block.children) return false;
  for (const child of block.children) {
    if (child.id === id || isInside(child, id)) return true;
  }
  return false;
}

export function insertBefore(
  blocks: BlockData[],
  block: BlockData,
  beforeId: string
): BlockData[] {
  const idx = blocks.findIndex((b) => b.id === beforeId);
  if (idx >= 0) {
    const next = blocks.slice();
    next.splice(idx, 0, block);
    return next;
  }
  return blocks.map((b) =>
    b.children
      ? { ...b, children: insertBefore(b.children, block, beforeId) }
      : b
  );
}

export function insertAfter(
  blocks: BlockData[],
  block: BlockData,
  afterId: string
): BlockData[] {
  const idx = blocks.findIndex((b) => b.id === afterId);
  if (idx >= 0) {
    const next = blocks.slice();
    next.splice(idx + 1, 0, block);
    return next;
  }
  return blocks.map((b) =>
    b.children
      ? { ...b, children: insertAfter(b.children, block, afterId) }
      : b
  );
}

export function appendTo(
  blocks: BlockData[],
  block: BlockData,
  parentId?: string | null
): BlockData[] {
  if (!parentId) return [...blocks, block];
  return blocks.map((b) => {
    if (b.id === parentId) {
      return { ...b, children: [...(b.children || []), block] };
    }
    if (b.children) {
      return { ...b, children: appendTo(b.children, block, parentId) };
    }
    return b;
  });
}

export function updateBlock(
  blocks: BlockData[],
  id: string,
  patch: Partial<BlockData>
): BlockData[] {
  return blocks.map((b) => {
    if (b.id === id) return { ...b, ...patch };
    if (b.children) return { ...b, children: updateBlock(b.children, id, patch) };
    return b;
  });
}

export function clampPos(x: number, y: number): { x: number; y: number } {
  const maxX = STAGE.width / 2 - 42;
  const maxY = STAGE.height / 2 - 48;
  return {
    x: Math.max(-maxX, Math.min(maxX, x)),
    y: Math.max(-maxY, Math.min(maxY, y)),
  };
}

export function cssPosition(
  x: number,
  y: number
): { left: number; top: number } {
  return {
    left: STAGE.width / 2 + x,
    top: STAGE.height / 2 - y,
  };
}

export function collides(
  a: { x: number; y: number },
  b: { x: number; y: number }
): boolean {
  return Math.abs(a.x - b.x) < SPRITE_HIT && Math.abs(a.y - b.y) < SPRITE_HIT;
}
