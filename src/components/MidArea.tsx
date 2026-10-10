import React from "react";
import Block from "./Block";
import { BlockData, DropPayload, DropTargetEvent, SpriteData } from "../utils";

export interface MidAreaProps {
  sprite?: SpriteData | null;
  onDropTarget: (event: DropTargetEvent) => void;
  onChange: (blockId: string, patch: Partial<BlockData>) => void;
  onDelete: (blockId: string) => void;
}

export default function MidArea({
  sprite,
  onDropTarget,
  onChange,
  onDelete,
}: MidAreaProps) {
  const onDragOver = (event: React.DragEvent) => event.preventDefault();

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    try {
      const payload = JSON.parse(
        event.dataTransfer.getData("application/json")
      ) as DropPayload;
      onDropTarget({ kind: "append", parentId: null, payload });
    } catch (err) {
      // ignore invalid drops
    }
  };

  if (!sprite) {
    return <div className="flex-1 h-full p-4 text-gray-400">No sprite selected</div>;
  }

  return (
    <div
      className="flex-1 h-full overflow-auto p-4 flex flex-col items-start"
      role="region"
      aria-label="script area"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="text-sm text-gray-500 mb-2">
        Scripts for <span className="font-bold text-gray-800">{sprite.name}</span>
      </div>
      <div className="script-stack flex flex-col items-start w-full">
        {sprite.blocks.map((block) => (
          <Block
            key={block.id}
            block={block}
            mode="script"
            onDropTarget={onDropTarget}
            onChange={onChange}
            onDelete={onDelete}
          />
        ))}
      </div>
      {!sprite.blocks.length && (
        <div className="drop-hint">Drag blocks here to animate this sprite</div>
      )}
    </div>
  );
}
