import "server-only";
import { memoryRepo } from "./memory";
import { mongoRepo } from "./mongo";
import type { Repo } from "./types";

let repo: Repo | undefined;

/**
 * MongoDB si hay MONGODB_URI. Sin ella, en desarrollo se usa memoria
 * (con la Rifa Navideña precargada); en producción es un error.
 */
export function getRepo(): Repo {
  if (repo) return repo;
  const uri = process.env.MONGODB_URI;
  if (uri) {
    repo = mongoRepo(uri);
  } else if (process.env.NODE_ENV !== "production" || process.env.RIFAMAX_DEMO === "1") {
    console.warn("[rifamax] Sin MONGODB_URI: usando datos en memoria (se pierden al reiniciar).");
    repo = memoryRepo();
  } else {
    throw new Error("Falta la variable de entorno MONGODB_URI");
  }
  return repo;
}

export type { Repo };
