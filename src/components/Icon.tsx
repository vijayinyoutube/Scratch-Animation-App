import React from "react";

export interface IconProps {
  name: string;
  size?: number;
  className?: string;
}

export default function Icon({ name, size = 20, className = "" }: IconProps) {
  return (
    <svg
      className={`fill-current ${className}`}
      width={size.toString() + "px"}
      height={size.toString() + "px"}
    >
      <use xlinkHref={`/icons/solid.svg#${name}`} />
    </svg>
  );
}
