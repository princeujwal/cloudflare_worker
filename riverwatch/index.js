export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "*";

    // 1. Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    // 2. Check Cloudflare Edge Cache next
    const cacheUrl = new URL(request.url);
    const cacheKey = new Request(cacheUrl.toString(), request);
    const cache = caches.default;

    let response = await cache.match(cacheKey);
    if (response) {
      // Re-attach dynamic origin CORS header for cached responses
      const cachedHeaders = new Headers(response.headers);
      cachedHeaders.set("Access-Control-Allow-Origin", origin);
      return new Response(response.body, {
        status: response.status,
        headers: cachedHeaders,
      });
    }

    const PAGE_URL = "https://dhm.gov.np/hydrology/river-watch";
    const API_URL = "https://dhm.gov.np/site/riverWatchTableViewData";

    try {
      // Fetch main page to extract cookies properly
      const pageRes = await fetch(PAGE_URL, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      // Extract all Set-Cookie header strings safely
      const rawCookies = pageRes.headers.getSetCookie 
        ? pageRes.headers.getSetCookie() 
        : [pageRes.headers.get("set-cookie")].filter(Boolean);
      
      const cookieHeader = rawCookies.map(c => c.split(';')[0]).join('; ');

      // Request DataTables payload with full required parameters
      const bodyParams = new URLSearchParams({
        "draw": "1",
        "start": "0",
        "length": "500",
        "search[value]": "",
        "search[regex]": "false",
        "order[0][column]": "0",
        "order[0][dir]": "asc"
      });

      const apiRes = await fetch(API_URL, {
        method: "POST",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json, text/javascript, */*; q=0.01",
          "X-Requested-With": "XMLHttpRequest",
          "Referer": PAGE_URL,
          "Cookie": cookieHeader,
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body: bodyParams.toString(),
      });

      if (!apiRes.ok) {
        throw new Error(`Upstream DHM Server returned status ${apiRes.status}`);
      }

      // Parse JSON and transform station attributes
      const rawJson = await apiRes.json();
      let processedData = rawJson;

      if (rawJson && Array.isArray(rawJson.data)) {
        processedData.data = rawJson.data.map(transformStationPayload);
      } else if (Array.isArray(rawJson)) {
        processedData = rawJson.map(transformStationPayload);
      }

      // Construct cacheable response with open CORS
      response = new Response(JSON.stringify(processedData), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": origin,
          "Cache-Control": "public, max-age=900, s-maxage=900",
        },
      });

      // Asynchronously write to Cloudflare Cache without blocking response delivery
      ctx.waitUntil(cache.put(cacheKey, response.clone()));

      return response;
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Failed to query DHM server", details: error.message }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": origin,
          },
        }
      );
    }
  },
};

/**
 * Normalizes single station objects safely
 */
function transformStationPayload(station) {
  const isWaterLevelObj = typeof station?.waterLevel === "object" && station?.waterLevel !== null;
  const rawValue = isWaterLevelObj ? station.waterLevel.value : station?.waterLevel;
  const rawDateTime = isWaterLevelObj ? station.waterLevel.datetime : (station?.datetime || null);

  const parseNumeric = (val) => {
    if (val === null || val === undefined) return null;
    const strVal = String(val).replace(/,/g, '').trim();
    if (!strVal || isNaN(strVal)) return null;
    return parseFloat(strVal);
  };

  const cleanString = (str, fallback = "N/A") => {
    if (!str) return fallback;
    const trimmed = String(str).trim();
    return trimmed.length > 0 ? trimmed : fallback;
  };

  const parsedWaterLevel = parseNumeric(rawValue);
  const parsedWarningLevel = parseNumeric(station?.warning_level);
  const parsedDangerLevel = parseNumeric(station?.danger_level);

  let alertStatus = cleanString(station?.status, "NORMAL");
  if (parsedWaterLevel !== null) {
    if (parsedDangerLevel !== null && parsedWaterLevel >= parsedDangerLevel) {
      alertStatus = "DANGER";
    } else if (parsedWarningLevel !== null && parsedWaterLevel >= parsedWarningLevel) {
      alertStatus = "WARNING";
    }
  }

  return {
    ...station,
    id: station?.id || null,
    name: cleanString(station?.name, "Unknown Station"),
    basin: cleanString(station?.basin),
    district: cleanString(station?.district),
    waterLevel: parsedWaterLevel !== null ? parseFloat(parsedWaterLevel.toFixed(3)) : null,
    warning_level: parsedWarningLevel,
    danger_level: parsedDangerLevel,
    maxvalue: parseNumeric(station?.maxvalue),
    status: alertStatus,
    steady: cleanString(station?.steady, "STEADY"),
    datetime: cleanString(rawDateTime, null),
  };
}
