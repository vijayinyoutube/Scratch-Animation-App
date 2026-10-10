import React, { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "./components/Sidebar";
import MidArea from "./components/MidArea";
import PreviewArea from "./components/PreviewArea";
import { useScriptRunner } from "./engine";
import {
  appendTo,
  cloneFromPalette,
  createSprite,
  extractBlock,
  insertAfter,
  insertBefore,
  isInside,
  updateBlock,
  BlockData,
  DropTargetEvent,
  SpriteData,
} from "./utils";

export default function App() {
  const first = useMemo(() => createSprite(0, { x: -110, y: 0 }), []);
  const [sprites, setSprites] = useState<SpriteData[]>([first]);
  const [selectedId, setSelectedId] = useState<string>(first.id);
  const [playing, setPlaying] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);
  const spritesRef = useRef<SpriteData[]>(sprites);
  spritesRef.current = sprites;

  const runner = useScriptRunner({
    getSprites: () => spritesRef.current,
    setSprites,
    onCollision: (a: string, b: string) => {
      setToast(`${a} and ${b} swapped animations`);
      setTimeout(() => setToast(null), 1600);
    },
  });

  const selected = sprites.find((s) => s.id === selectedId) || sprites[0];

  const onDropTarget = ({
    kind,
    payload,
    parentId,
    beforeId,
    afterId,
  }: DropTargetEvent) => {
    if (!payload || playing) return;
    setSprites((list) =>
      list.map((sprite) => {
        if (sprite.id !== selectedId) return sprite;
        let blocks = sprite.blocks;
        let block: BlockData | null = null;
        if (payload.origin === "palette") {
          block = cloneFromPalette(payload.template);
        } else if (payload.origin === "script") {
          if (
            payload.blockId === parentId ||
            payload.blockId === beforeId ||
            payload.blockId === afterId
          ) {
            return sprite;
          }
          const result = extractBlock(blocks, payload.blockId);
          blocks = result.blocks;
          block = result.extracted;
          if (!block) return sprite;
          if (
            (parentId && (block.id === parentId || isInside(block, parentId))) ||
            (beforeId && isInside(block, beforeId)) ||
            (afterId && isInside(block, afterId))
          ) {
            return sprite;
          }
        } else {
          return sprite;
        }
        if (!block) return sprite;
        if (kind === "before" && beforeId) {
          blocks = insertBefore(blocks, block, beforeId);
        } else if (kind === "after" && afterId) {
          blocks = insertAfter(blocks, block, afterId);
        } else {
          blocks = appendTo(blocks, block, parentId || null);
        }
        return { ...sprite, blocks };
      })
    );
  };

  const onChange = (blockId: string, patch: Partial<BlockData>) => {
    setSprites((list) =>
      list.map((s) =>
        s.id === selectedId
          ? { ...s, blocks: updateBlock(s.blocks, blockId, patch) }
          : s
      )
    );
  };

  const onDelete = (blockId: string) => {
    setSprites((list) =>
      list.map((s) => {
        if (s.id !== selectedId) return s;
        const { blocks } = extractBlock(s.blocks, blockId);
        return { ...s, blocks };
      })
    );
  };

  const onPlay = async () => {
    if (playing || !runner) return;
    setPlaying(true);
    await runner.play();
    setPlaying(false);
  };

  const onAdd = () => {
    const sprite = createSprite(sprites.length);
    setSprites((list) => [...list, sprite]);
    setSelectedId(sprite.id);
  };

  const onMoveSprite = (id: string, pos: { x: number; y: number }) => {
    setSprites((list) =>
      list.map((s) => (s.id === id ? { ...s, ...pos } : s))
    );
  };

  return (
    <div className="bg-blue-100 pt-6 font-sans">
      <div className="h-screen overflow-hidden flex flex-row">
        <div className="flex-1 h-screen overflow-hidden flex flex-row bg-white border-t border-r border-gray-200 rounded-tr-xl mr-2">
          <Sidebar onDropTarget={onDropTarget} />
          <MidArea
            sprite={selected}
            onDropTarget={onDropTarget}
            onChange={onChange}
            onDelete={onDelete}
          />
        </div>
        <div
          className="w-1/3 min-w-[384px] h-screen overflow-hidden flex flex-col bg-white border-t border-l border-gray-200 rounded-tl-xl ml-2"
          style={{ minWidth: 384 }}
        >
          <PreviewArea
            sprites={sprites}
            selectedId={selectedId}
            playing={playing}
            toast={toast}
            onSelect={setSelectedId}
            onPlay={onPlay}
            onAdd={onAdd}
            onMoveSprite={onMoveSprite}
          />
        </div>
      </div>
    </div>
  );
}
