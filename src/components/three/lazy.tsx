"use client";

import dynamic from "next/dynamic";

/** Las escenas 3D se cargan solo en el navegador y después del contenido principal. */
const Loading = ({ className }: { className?: string }) => <div className={`${className ?? ""} animate-pulse rounded-3xl bg-white/5`} aria-hidden />;

export const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false, loading: () => null });
export const Wheel3D = dynamic(() => import("./Wheel3D"), { ssr: false, loading: () => <Loading className="aspect-square w-full" /> });
export const Balls3D = dynamic(() => import("./Balls3D"), { ssr: false, loading: () => <Loading className="h-40 w-full" /> });
export const Jar3D = dynamic(() => import("./Jar3D"), { ssr: false, loading: () => <Loading className="h-64 w-full" /> });
