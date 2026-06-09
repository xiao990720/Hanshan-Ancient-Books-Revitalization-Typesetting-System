/**
 * Utility for dynamically registering/loading custom uploaded fonts
 * and persisting them inside IndexedDB across page reloads.
 */

const DB_NAME = "AncientFontDB";
const STORE_NAME = "fonts";
export const KANGXI_FONT_FAMILY = "TypeLand KangXi";

interface SavedFont {
  buffer: ArrayBuffer;
  name: string;
}

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e: any) => resolve(e.target.result);
    request.onerror = (e: any) => reject(e.target.error);
  });
}

export async function saveFontToDB(buffer: ArrayBuffer, name: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ buffer, name }, KANGXI_FONT_FAMILY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getFontFromDB(): Promise<SavedFont | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(KANGXI_FONT_FAMILY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("Failed to retrieve font from IndexedDB:", err);
    return null;
  }
}

export async function clearFontFromDB(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(KANGXI_FONT_FAMILY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Loads custom font face from a buffer and registers it in the document
 */
export async function registerFontFace(buffer: ArrayBuffer): Promise<FontFace | null> {
  try {
    const fontFace = new FontFace(KANGXI_FONT_FAMILY, buffer);
    const loadedFace = await fontFace.load();
    document.fonts.add(loadedFace);
    return loadedFace;
  } catch (err) {
    console.error("FontFace register failed:", err);
    throw err;
  }
}

/**
 * Removes all custom registrations of the target custom font family
 */
export function unregisterCustomFont(): void {
  const customFonts: FontFace[] = [];
  document.fonts.forEach((font) => {
    if (font.family === KANGXI_FONT_FAMILY) {
      customFonts.push(font);
    }
  });
  customFonts.forEach((font) => {
    document.fonts.delete(font);
  });
}
