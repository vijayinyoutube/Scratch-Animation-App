import React from "react";
import { PALETTE, DropTargetEvent } from "../utils";
import Block from "./Block";

export interface SidebarProps {
  onDropTarget?: (event: DropTargetEvent) => void;
}

export default function Sidebar({ onDropTarget }: SidebarProps) {
  return (
    <div className="w-64 flex-none h-full overflow-y-auto flex flex-col items-start p-2 border-r border-gray-200">
      <div className="font-bold">Motion</div>
      {PALETTE.motion.map((block, index) => (
        <Block key={`motion-${index}`} block={block} mode="palette" onDropTarget={onDropTarget} />
      ))}
      <div className="font-bold mt-3">Looks</div>
      {PALETTE.looks.map((block, index) => (
        <Block key={`looks-${index}`} block={block} mode="palette" onDropTarget={onDropTarget} />
      ))}
      <div className="font-bold mt-3">Control</div>
      {PALETTE.control.map((block, index) => (
        <Block key={`control-${index}`} block={block} mode="palette" onDropTarget={onDropTarget} />
      ))}
    </div>
  );
}
