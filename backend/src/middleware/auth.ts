import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";

export interface JWTPayload {
  id: number;
  email: string;
  role: "petugas" | "admin";
  nama: string;
}

export const jwtPlugin = new Elysia({ name: "jwtPlugin" }).use(
  jwt({
    name: "jwt",
    secret: Bun.env.JWT_SECRET || "sistem-antrean-kampus-secret-key-2026",
    exp: "7d",
  })
);

export const authMiddleware = new Elysia({ name: "authMiddleware" })
  .use(jwtPlugin)
  .derive({ as: "scoped" }, ({ jwt, headers, set }) => ({
    /**
     * Mengambil payload user dari header Authorization: Bearer <token>.
     * Mengembalikan null jika token tidak ada atau tidak valid.
     */
    getCurrentUser: async (): Promise<JWTPayload | null> => {
      const auth = headers.authorization;
      if (!auth || !auth.startsWith("Bearer ")) {
        return null;
      }
      const token = auth.slice(7).trim();
      try {
        const payload = (await jwt.verify(token)) as unknown as JWTPayload | false;
        if (!payload || typeof payload !== "object" || !("id" in payload)) {
          return null;
        }
        return payload;
      } catch {
        return null;
      }
    },

    /**
     * Memastikan user sudah login (role petugas atau admin).
     * Jika tidak valid, langsung return 401 Unauthorized.
     */
    requireAuth: async (): Promise<JWTPayload> => {
      const auth = headers.authorization;
      if (!auth || !auth.startsWith("Bearer ")) {
        set.status = 401;
        throw new Error("Token autentikasi tidak ditemukan. Silakan login terlebih dahulu.");
      }
      const token = auth.slice(7).trim();
      const payload = (await jwt.verify(token)) as unknown as JWTPayload | false;
      if (!payload || typeof payload !== "object" || !("id" in payload)) {
        set.status = 401;
        throw new Error("Sesi login kedaluwarsa atau tidak valid. Silakan login ulang.");
      }
      return payload;
    },

    /**
     * Memastikan user adalah Administrator.
     * Jika bukan admin, return 403 Forbidden.
     */
    requireAdmin: async (): Promise<JWTPayload> => {
      const auth = headers.authorization;
      if (!auth || !auth.startsWith("Bearer ")) {
        set.status = 401;
        throw new Error("Token autentikasi tidak ditemukan.");
      }
      const token = auth.slice(7).trim();
      const payload = (await jwt.verify(token)) as unknown as JWTPayload | false;
      if (!payload || typeof payload !== "object" || !("id" in payload)) {
        set.status = 401;
        throw new Error("Sesi tidak valid.");
      }
      if (payload.role !== "admin") {
        set.status = 403;
        throw new Error("Akses ditolak. Fitur ini hanya untuk Administrator.");
      }
      return payload;
    },
  }));
