import { useEffect } from "react";

const STORAGE_KEY = "sors_utm_data";

export interface UTMData {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  referrer: string;
  landingPageUrl: string;
  timestamp: string;
}

export function captureUTMParams(): UTMData | null {
  if (typeof window === "undefined") {
    return null;
  }

  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) {
    return null;
  }

  const params = new URLSearchParams(window.location.search);

  const utmData: UTMData = {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_term: params.get("utm_term"),
    utm_content: params.get("utm_content"),
    referrer: document.referrer,
    landingPageUrl: window.location.href,
    timestamp: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(utmData));

  return utmData;
}

export function getUTMData(): UTMData | null {
  if (typeof window === "undefined") {
    return null;
  }

  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data) as UTMData;
  } catch {
    return null;
  }
}

export function clearUTMData(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
}

export function appendUTMToRequest(
  headers: Record<string, string>
): Record<string, string> {
  const utmData = getUTMData();
  if (!utmData) {
    return headers;
  }

  const modifiedHeaders = { ...headers };

  if (utmData.utm_source) {
    modifiedHeaders["X-UTM-Source"] = utmData.utm_source;
  }
  if (utmData.utm_medium) {
    modifiedHeaders["X-UTM-Medium"] = utmData.utm_medium;
  }
  if (utmData.utm_campaign) {
    modifiedHeaders["X-UTM-Campaign"] = utmData.utm_campaign;
  }
  if (utmData.utm_term) {
    modifiedHeaders["X-UTM-Term"] = utmData.utm_term;
  }
  if (utmData.utm_content) {
    modifiedHeaders["X-UTM-Content"] = utmData.utm_content;
  }

  modifiedHeaders["X-UTM-Referrer"] = utmData.referrer;
  modifiedHeaders["X-UTM-Landing-Page"] = utmData.landingPageUrl;
  modifiedHeaders["X-UTM-Timestamp"] = utmData.timestamp;

  return modifiedHeaders;
}

export function useUTMCapture(): void {
  useEffect(() => {
    captureUTMParams();
  }, []);
}
