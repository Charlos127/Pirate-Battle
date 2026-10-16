import { Assets, Texture } from "pixi.js";

const DIR =
  typeof window !== "undefined" && (window.devicePixelRatio || 1) >= 1.5
    ? "retina"
    : "default";
const png = (p: string) => `/assets/png/${DIR}/${p}`;

export const SPRITE_ROTATION_OFFSET = 0;

/** alias -> url. The renderer must ONLY use the aliases (keys). */
export const MANIFEST = {
  ship_player: png("ships/ship_1.png"),
  ship_chaser: png("ships/dinghy_small_1.png"),
  ship_shooter: png("ships/ship_5.png"),
  cannonball: png("ship_parts/cannon_ball.png"),
  explosion_1: png("effects/explosion_1.png"),
  explosion_2: png("effects/explosion_2.png"),
  explosion_3: png("effects/explosion_3.png"),
  fire_1: png("effects/fire_1.png"),
  fire_2: png("effects/fire_2.png"),
  water: png("tiles/tile_73.png"),
  island_sand: png("tiles/tile_5.png"),
  island_grass: png("tiles/tile_23.png"),
} as const;

export type TextureAlias = keyof typeof MANIFEST;

export class AssetLoadError extends Error {
  constructor(public readonly failed: string[]) {
    super(`Failed to load assets: ${failed.join(", ")}`);
  }
}

// Our own registry: independent from Pixi's global cache keys.
const textures = new Map<TextureAlias, Texture>();

export async function loadGameAssets(
  onProgress: (p: number) => void,
): Promise<void> {
  const entries = Object.entries(MANIFEST) as Array<[TextureAlias, string]>;
  const failed: string[] = [];
  let done = 0;

  await Promise.all(
    entries.map(async ([alias, url]) => {
      if (textures.has(alias)) {
        onProgress(++done / entries.length);
        return;
      } // already loaded: reuse
      try {
        const t = await Assets.load<Texture>(url); // load by URL, store by alias
        textures.set(alias, t);
      } catch {
        failed.push(alias);
        await Assets.unload(url).catch(() => undefined); // so Retry really retries
      } finally {
        onProgress(Math.min(1, ++done / entries.length));
      }
    }),
  );

  if (failed.length) throw new AssetLoadError(failed);
}

/** Use ONLY aliases (e.g. tex('ship_player')), never file paths. */
export function tex(alias: TextureAlias): Texture {
  const t = textures.get(alias);
  if (!t)
    throw new Error(
      `Texture "${alias}" is not loaded. Use an alias from MANIFEST, not a file path.`,
    );
  return t;
}
