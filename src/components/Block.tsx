import React, { useState } from "react";
import Icon from "./Icon";
import { BlockData, BlockTemplate, DropPayload, DropTargetEvent } from "../utils";

const CATEGORY: Record<string, string> = {
  move: "motion",
  turn: "motion",
  goto: "motion",
  say: "looks",
  think: "looks",
  repeat: "control",
};

export interface BlockProps {
  block: BlockData | BlockTemplate;
  mode: "palette" | "script";
  onDropTarget?: (event: DropTargetEvent) => void;
  onChange?: (blockId: string, patch: Partial<BlockData>) => void;
  onDelete?: (blockId: string) => void;
}

function readPayload(event: React.DragEvent): DropPayload | null {
  try {
    return JSON.parse(event.dataTransfer.getData("application/json")) as DropPayload;
  } catch (err) {
    return null;
  }
}

export default function Block({
  block,
  mode,
  onDropTarget,
  onChange,
  onDelete,
}: BlockProps) {
  const [dropSide, setDropSide] = useState<"before" | "after" | null>(null);
  const [nestHover, setNestHover] = useState(false);
  const category = CATEGORY[block.type] || "motion";

  const handleDragStart = (event: React.DragEvent) => {
    event.stopPropagation();
    const payload: DropPayload =
      mode === "palette"
        ? { origin: "palette", template: block }
        : { origin: "script", blockId: block.id || "" };
    event.dataTransfer.setData("application/json", JSON.stringify(payload));
    event.dataTransfer.effectAllowed = mode === "palette" ? "copy" : "move";
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (mode !== "script") return;
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    // Default attaches towards bottom; upper 35% attaches before, lower 65% attaches after
    const side = offsetY < rect.height * 0.35 ? "before" : "after";
    if (dropSide !== side) {
      setDropSide(side);
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (mode !== "script") return;
    if (event.currentTarget.contains(event.relatedTarget as Node)) {
      return;
    }
    setDropSide(null);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (mode !== "script") return;
    event.preventDefault();
    event.stopPropagation();
    const side = dropSide || "after";
    setDropSide(null);
    const payload = readPayload(event);
    if (payload && onDropTarget && block.id) {
      if (side === "before") {
        onDropTarget({ kind: "before", beforeId: block.id, payload });
      } else {
        onDropTarget({ kind: "after", afterId: block.id, payload });
      }
    }
  };

  const handleNestDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDropSide(null);
    setNestHover(true);
  };

  const handleNestDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) {
      return;
    }
    setNestHover(false);
  };

  const handleNestDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setNestHover(false);
    const payload = readPayload(event);
    if (payload && onDropTarget) {
      onDropTarget({ kind: "append", parentId: block.id || null, payload });
    }
  };

  const field = (
    key: keyof BlockData,
    extra: { className?: string; type?: string } = {}
  ) => (
    <input
      className={extra.className || ""}
      type={extra.type || "number"}
      value={(block[key] as string | number | undefined) ?? ""}
      draggable={false}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) =>
        onChange &&
        block.id &&
        onChange(block.id, {
          [key]: extra.type === "text" ? e.target.value : e.target.value,
        })
      }
    />
  );

  const body = (() => {
    switch (block.type) {
      case "move":
        return (
          <>
            Move {field("steps")} steps
          </>
        );
      case "turn":
        return (
          <>
            Turn{" "}
            <Icon
              name={Number(block.degrees) < 0 ? "undo" : "redo"}
              size={14}
              className="text-white"
            />{" "}
            {field("degrees")} degrees
          </>
        );
      case "goto":
        return (
          <>
            Go to x: {field("x")} y: {field("y")}
          </>
        );
      case "say":
        return (
          <>
            Say {field("text", { type: "text", className: "wide" })} for{" "}
            {field("seconds")} seconds
          </>
        );
      case "think":
        return (
          <>
            Think {field("text", { type: "text", className: "wide" })} for{" "}
            {field("seconds")} seconds
          </>
        );
      case "repeat":
        return (
          <>
            <div className="block-head">
              Repeat {field("times")}
              {mode === "script" && block.id && onDelete && (
                <button
                  type="button"
                  className="delete-block"
                  onClick={() => onDelete(block.id!)}
                >
                  ×
                </button>
              )}
            </div>
            <div
              className={`block-nest ${nestHover ? "drop-target-inside" : ""}`}
              onDragOver={handleNestDragOver}
              onDragLeave={handleNestDragLeave}
              onDrop={handleNestDrop}
            >
              {(block.children || []).map((child) => (
                <Block
                  key={child.id}
                  block={child}
                  mode={mode}
                  onDropTarget={onDropTarget}
                  onChange={onChange}
                  onDelete={onDelete}
                />
              ))}
              {mode === "script" && !(block.children || []).length && (
                <div className="drop-hint" style={{ padding: 8 }}>
                  Drop blocks here
                </div>
              )}
            </div>
          </>
        );
      default:
        return block.type;
    }
  })();

  const dropClass =
    dropSide === "before"
      ? "drop-target-before"
      : dropSide === "after"
      ? "drop-target-after"
      : "";

  return (
    <div
      className={`block block-${category} ${dropClass}`}
      role="listitem"
      aria-label={`${mode} ${block.type} block`}
      draggable
      onClick={() => {
        if (mode === "palette" && onDropTarget) {
          onDropTarget({
            kind: "append",
            parentId: null,
            payload: { origin: "palette", template: block },
          });
        }
      }}
      onDragStart={handleDragStart}
      onDragOver={mode === "script" ? handleDragOver : undefined}
      onDragLeave={mode === "script" ? handleDragLeave : undefined}
      onDrop={mode === "script" ? handleDrop : undefined}
    >
      {block.type !== "repeat" ? (
        <>
          {body}
          {mode === "script" && block.id && onDelete && (
            <button
              type="button"
              className="delete-block"
              onClick={() => onDelete(block.id!)}
            >
              ×
            </button>
          )}
        </>
      ) : (
        body
      )}
    </div>
  );
}
