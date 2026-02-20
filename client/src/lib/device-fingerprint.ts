interface DeviceFingerprint {
  canvas: string;
  webgl: string;
  fonts: string;
  screen: string;
  timezone: string;
  language: string;
  platform: string;
  userAgent: string;
  colorDepth: number;
  hardwareConcurrency: number;
  touchSupport: boolean;
  cookiesEnabled: boolean;
}

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("SorsMaxima", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("SorsMaxima", 4, 17);
    return canvas.toDataURL().slice(-50);
  } catch {
    return "";
  }
}

function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return "";
    const debugInfo = (gl as WebGLRenderingContext).getExtension("WEBGL_debug_renderer_info");
    if (!debugInfo) return "no-debug";
    const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    const vendor = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    return `${vendor}|${renderer}`;
  } catch {
    return "";
  }
}

function getInstalledFonts(): string {
  const testFonts = [
    "Arial", "Courier New", "Georgia", "Times New Roman", "Verdana",
    "Helvetica", "Comic Sans MS", "Impact", "Lucida Console", "Tahoma",
    "Trebuchet MS", "Palatino Linotype", "Segoe UI", "Roboto",
  ];
  const detected: string[] = [];
  const testStr = "mmmmmmmmmmlli";
  const testSize = "72px";
  const baselineFont = "monospace";

  try {
    const span = document.createElement("span");
    span.style.fontSize = testSize;
    span.style.position = "absolute";
    span.style.left = "-9999px";
    span.style.top = "-9999px";
    span.textContent = testStr;
    document.body.appendChild(span);

    span.style.fontFamily = baselineFont;
    const baseWidth = span.offsetWidth;
    const baseHeight = span.offsetHeight;

    for (const font of testFonts) {
      span.style.fontFamily = `"${font}", ${baselineFont}`;
      if (span.offsetWidth !== baseWidth || span.offsetHeight !== baseHeight) {
        detected.push(font);
      }
    }

    document.body.removeChild(span);
  } catch {
    return "";
  }

  return detected.join(",");
}

export function collectDeviceFingerprint(): DeviceFingerprint {
  return {
    canvas: getCanvasFingerprint(),
    webgl: getWebGLFingerprint(),
    fonts: getInstalledFonts(),
    screen: `${screen.width}x${screen.height}x${(window.devicePixelRatio || 1)}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    language: navigator.language || "",
    platform: navigator.platform || "",
    userAgent: navigator.userAgent || "",
    colorDepth: screen.colorDepth || 0,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    touchSupport: "ontouchstart" in window || navigator.maxTouchPoints > 0,
    cookiesEnabled: navigator.cookieEnabled,
  };
}

const FP_STORAGE_KEY = "sm_device_fp";

export function getCachedFingerprint(): DeviceFingerprint {
  try {
    const cached = localStorage.getItem(FP_STORAGE_KEY);
    if (cached) return JSON.parse(cached);
  } catch {}
  const fp = collectDeviceFingerprint();
  try {
    localStorage.setItem(FP_STORAGE_KEY, JSON.stringify(fp));
  } catch {}
  return fp;
}
