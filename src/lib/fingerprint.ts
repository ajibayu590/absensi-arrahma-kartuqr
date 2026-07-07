export function getBrowserFingerprint(): string {
  if (typeof window === "undefined") return "";

  const navigator = window.navigator;
  const screen = window.screen;

  const dataComponents = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || "n/a",
    (navigator as any).deviceMemory || "n/a"
  ];

  const rawString = dataComponents.join("||");

  // Hitung hash menggunakan algoritma djb2 (32-bit integer hash)
  let hash = 5381;
  for (let i = 0; i < rawString.length; i++) {
    hash = (hash * 33) ^ rawString.charCodeAt(i);
  }
  
  // Kembalikan dalam format string heksadesimal positif
  return Math.abs(hash).toString(16);
}
