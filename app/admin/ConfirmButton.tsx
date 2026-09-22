"use client";

import type { MouseEvent, ReactNode } from "react";

export default function ConfirmButton({ children, message, className = "btn btn-danger" }: { children: ReactNode; message: string; className?: string }) {
  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    if (!window.confirm(message)) e.preventDefault();
  }
  return <button className={className} type="submit" onClick={handleClick}>{children}</button>;
}
