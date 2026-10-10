import React, { useRef } from "react";
import CatSprite from "./CatSprite";
import { STAGE, cssPosition, clampPos, SpriteData } from "../utils";

export interface PreviewAreaProps {
  sprites: SpriteData[];
  selectedId: string;
  playing: boolean;
  toast: string | null;
  onSelect: (id: string) => void;
  onPlay: () => void;
  onAdd: () => void;
  onMoveSprite: (id: string, pos: { x: number; y: number }) => void;
}

export default function PreviewArea({
  sprites,
  selectedId,
  playing,
  toast,
  onSelect,
  onPlay,
  onAdd,
  onMoveSprite,
}: PreviewAreaProps) {
  const dragging = useRef<{ id: string; rect: DOMRect } | null>(null);

  const onPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    sprite: SpriteData
  ) => {
    if (playing) return;
    onSelect(sprite.id);
    const parent = event.currentTarget.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    dragging.current = { id: sprite.id, rect };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || playing) return;
    const { rect, id } = dragging.current;
    const x = event.clientX - rect.left - STAGE.width / 2;
    const y = STAGE.height / 2 - (event.clientY - rect.top);
    onMoveSprite(id, clampPos(x, y));
  };

  const onPointerUp = () => {
    dragging.current = null;
  };

  return (
    <div className="w-full flex-1 min-w-0 h-full overflow-y-auto overflow-x-hidden p-3 flex flex-col">
      <div className="flex items-center justify-end mb-2">
        <button
          type="button"
          className="play-btn"
          title="Play all sprites"
          onClick={onPlay}
          disabled={playing}
        >
          ▶ Play
        </button>
      </div>
      <div
        className="stage mx-auto"
        style={{ width: STAGE.width, height: STAGE.height }}
      >
        {toast && <div className="toast">{toast}</div>}
        {sprites.map((sprite) => {
          const pos = cssPosition(sprite.x, sprite.y);
          return (
            <div
              key={sprite.id}
              className="sprite-wrap"
              style={{
                left: pos.left,
                top: pos.top,
                transform: `rotate(${sprite.direction - 90}deg)`,
                outline: sprite.id === selectedId ? "2px solid #4c97ff" : "none",
                outlineOffset: 2,
                zIndex: sprite.id === selectedId ? 2 : 1,
              }}
              onPointerDown={(e) => onPointerDown(e, sprite)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              {sprite.speech && (
                <div
                  className={`speech ${sprite.speech.kind}`}
                  style={{ transform: `rotate(${90 - sprite.direction}deg)` }}
                >
                  {sprite.speech.text}
                </div>
              )}
              <CatSprite
                width={80}
                height={84}
                style={{ filter: `hue-rotate(${sprite.hue}deg)` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold text-sm">Sprites</div>
          <button
            type="button"
            className="bg-blue-500 text-white text-xs px-2 py-1 rounded"
            onClick={onAdd}
          >
            + Sprite
          </button>
        </div>
        <div className="sprites-grid">
          {sprites.map((sprite) => (
            <button
              key={sprite.id}
              type="button"
              className={`sprite-card ${sprite.id === selectedId ? "active" : ""}`}
              onClick={() => onSelect(sprite.id)}
            >
              <CatSprite
                width={48}
                height={50}
                style={{ filter: `hue-rotate(${sprite.hue}deg)` }}
              />
              <div className="text-xs mt-1 truncate w-full">{sprite.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
