const BUDDHA_API = "https://admin.buddhaair.com/api/V1/booking/availability";
const BUDDHA_SECRET = "test@1234";
const YETI = "https://yetiairlines.com";

/* =====================================================
   MAIN WORKER
===================================================== */

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") || "*";

    // Handle Preflight (OPTIONS) requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders(origin)
      });
    }

    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/flights") {
      if (url.pathname === "/") {
        return json({
          ok: true,
          message: "Nepal Airlines Flight Search API",
          usage: "/flights?from=KTM&to=BIR&date=2026-08-22"
        }, 200, origin);
      }

      return searchAllFlights(url, origin);
    }

    return json({
      ok: false,
      error: "Endpoint not found"
    }, 404, origin);
  }
};


/* =====================================================
   COMBINED SEARCH
===================================================== */

async function searchAllFlights(url, origin) {
  const from = (url.searchParams.get("from") || "").trim().toUpperCase();
  const to = (url.searchParams.get("to") || "").trim().toUpperCase();
  const date = (url.searchParams.get("date") || "").trim(); // Standard: YYYY-MM-DD

  if (!/^[A-Z]{3}$/.test(from) \vert{}\vert{} !/^[A-Z]{3}$/.test(to)) {
    return json({ ok: false, error: "Invalid airport code." }, 400, origin);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return json({ ok: false, error: "Date must be YYYY-MM-DD." }, 400, origin);
  }

  const [buddhaResult, yetiResult, shreeResult] = await Promise.allSettled([
    searchBuddha(from, to, date),
    searchYeti(from, to, date),
    searchShree(from, to, date)
  ]);

  const buddha = buddhaResult.status === "fulfilled"
    ? buddhaResult.value
    : { ok: false, airline: "Buddha Air", error: String(buddhaResult.reason) };

  const yeti = yetiResult.status === "fulfilled"
    ? yetiResult.value
    : { ok: false, airline: "Yeti Airlines", error: String(yetiResult.reason) };

  const shree = shreeResult.status === "fulfilled"
    ? shreeResult.value
    : { ok: false, airline: "Shree Airlines", error: String(shreeResult.reason) };

  const allFlights = [
    ...(buddha.ok ? buddha.flights : []),
    ...(yeti.ok ? yeti.flights : []),
    ...(shree.ok ? shree.flights : [])
  ];

  allFlights.sort((a, b) => {
    const aPrice = Number(a.lowestFare ?? a.fare ?? a.price ?? Infinity);
    const bPrice = Number(b.lowestFare ?? b.fare ?? b.price ?? Infinity);
    return aPrice - bPrice;
  });

  return json({
    ok: buddha.ok || yeti.ok || shree.ok,

    requested: { from, to, date },

    diagnostics: {
      totalFlights: allFlights.length,
      buddha: { ok: buddha.ok, count: buddha.ok ? buddha.flights.length : 0 },
      yeti: { ok: yeti.ok, count: yeti.ok ? yeti.flights.length : 0 },
      shree: { ok: shree.ok, count: shree.ok ? shree.flights.length : 0 }
    },

    airlines: {
      buddha,
      yeti,
      shree
    },

    flights: allFlights
  }, 200, origin);
}


/* =====================================================
   SHREE AIRLINES
===================================================== */

async function searchShree(from, to, date) {
  try {
    const formattedDate = formatShreeDate(date); // Convert YYYY-MM-DD -> DD-Mon-YYYY

    const homeRes = await fetch("https://www.shreeairlines.com/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });

    const rawCookies = homeRes.headers.get("set-cookie") || "";
    const cookieHeader = parseCookies(rawCookies);
    const htmlText = await homeRes.text();

    const csrfMatch = htmlText.match(/name="_token"\s+value="([^"]+)"/i) || htmlText.match(/name="csrf-token"\s+content="([^"]+)"/i);
    const csrfToken = csrfMatch ? csrfMatch[1] : "";

    const bodyParams = new URLSearchParams();
    bodyParams.append("_token", csrfToken);
    bodyParams.append("type", "O");
    bodyParams.append("nationality", "NP");
    bodyParams.append("from", from);
    bodyParams.append("to", to);
    bodyParams.append("flightDate", formattedDate);
    bodyParams.append("return", "");
    bodyParams.append("adult", "1");
    bodyParams.append("child", "0");
    bodyParams.append("recaptcha_token", "test_token");
    bodyParams.append("promoCode", "");

    const searchRes = await fetch("https://www.shreeairlines.com/searchflight", {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Cookie": cookieHeader,
        "Origin": "https://www.shreeairlines.com",
        "Referer": "https://www.shreeairlines.com/"
      },
      body: bodyParams.toString()
    });

    const resultHtml = await searchRes.text();
    const rawFlights = parseShreeFlights(resultHtml, from, to);
    const flights = groupShreeFlights(rawFlights);

    return {
      ok: true,
      airline: "Shree Airlines",
      flights
    };
  } catch (error) {
    return {
      ok: false,
      airline: "Shree Airlines",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function parseShreeFlights(html, from, to) {
  const flights = [];
  const buttonRegex = /<button[^>]*class=["'][^"']*flight-class[^"']*["'][^>]*>/gi;
  const buttonMatches = html.match(buttonRegex) || [];

  for (const btnHtml of buttonMatches) {
    const flightno = getAttr(btnHtml, "flightno") || getAttr(btnHtml, "data-flightno");
    const departureTime = getAttr(btnHtml, "departureTime");
    const arrivalTime = getAttr(btnHtml, "arrivalTime");
    const adultPrice = parseFloat(getAttr(btnHtml, "adult-price") || "0");
    const tax = parseFloat(getAttr(btnHtml, "tax") || "0");
    const fuelSurcharge = parseFloat(getAttr(btnHtml, "fuel_surcharge") || "0");
    const flightClass = getAttr(btnHtml, "flightclass");
    const aircraft = getAttr(btnHtml, "aircraft_type");
    const baggage = getAttr(btnHtml, "freeBaggage");

    if (flightno && departureTime) {
      const totalFare = adultPrice + tax + fuelSurcharge;
      flights.push({
        airline: "Shree Airlines",
        flight: `SHA-${flightno}`,
        origin: from,
        destination: to,
        departure: departureTime,
        arrival: arrivalTime || "",
        aircraft: aircraft || "",
        fareClass: flightClass || "Standard",
        baggage: baggage || null,
        fare: totalFare,
        currency: "NPR"
      });
    }
  }

  return flights;
}

function groupShreeFlights(flights) {
  const groups = new Map();

  for (const fare of flights) {
    const key = `${fare.flight}|${fare.departure}`;

    if (!groups.has(key)) {
      groups.set(key, {
        airline: fare.airline,
        flight: fare.flight,
        origin: fare.origin,
        destination: fare.destination,
        departure: fare.departure,
        arrival: fare.arrival,
        aircraft: fare.aircraft,
        lowestFare: fare.fare,
        currency: fare.currency,
        fares: []
      });
    }

    const flight = groups.get(key);
    flight.lowestFare = Math.min(flight.lowestFare, fare.fare);
    flight.fares.push({
      fareClass: fare.fareClass,
      fare: fare.fare,
      baggage: fare.baggage,
      currency: fare.currency
    });
  }

  return [...groups.values()].sort((a, b) => a.lowestFare - b.lowestFare);
}


/* =====================================================
   BUDDHA AIR
===================================================== */

async function searchBuddha(from, to, date) {
  const payload = {
    sector: `${from}-${to}`,
    triptype: "O",
    departdate: formatBuddhaDate(date),
    nationalityid: "NP",
    adult: "1",
    child: "0",
    type: "web"
  };

  const signature = await generateBuddhaHash(JSON.stringify(payload), BUDDHA_SECRET);

  const response = await fetch(BUDDHA_API, {
    method: "POST",
    headers: {
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en",
      "Content-Type": "application/json",
      "BuddhaHash": `buddhaAir:${signature}`,
      "Devicetype": "web",
      "Origin": "https://www.buddhaair.com",
      "Referer": "https://www.buddhaair.com/",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let data;

  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, airline: "Buddha Air", error: "Invalid JSON response", httpStatus: response.status };
  }

  if (!response.ok || data?.success !== true) {
    return {
      ok: false,
      airline: "Buddha Air",
      error: data?.message || `HTTP ${response.status}`,
      httpStatus: response.status
    };
  }

  const outbound = Array.isArray(data?.data?.outbound) ? data.data.outbound : [];
  const rawFlights = outbound.filter(item => String(item.sectorpair || "").toUpperCase() === `${from}-${to}`);

  const flights = groupBuddhaFlights(
    rawFlights.map(normalizeBuddhaFlight).filter(item => item.departure && Number.isFinite(item.fare))
  );

  return { ok: true, airline: "Buddha Air", flights };
}

function normalizeBuddhaFlight(flight) {
  const sector = String(flight.sectorpair || "").split("-");
  const classCode = flight.classcode || flight.bookingclass || flight.class || "";

  const rawBaggage = flight.freebaggage || flight.baggage || flight.weight_allowance;
  const baggageInfo = rawBaggage ? String(rawBaggage).trim() : getBuddhaBaggage(classCode);

  return {
    airline: "Buddha Air",
    flight: flight.flightno || "",
    origin: sector[0] || "",
    destination: sector[1] || "",
    originName: flight.departurecity || "",
    destinationName: flight.arrivalcity || "",
    departure: flight.departuretime || "",
    arrival: flight.arrivaltime || "",
    fareClass: classCode,
    baggage: baggageInfo,
    fare: getBuddhaFare(flight),
    currency: flight.airfare?.faredetail?.currency || "NPR",
    refundable: isRefundable(flight.refundable)
  };
}

function getBuddhaBaggage(classCode) {
  const code = String(classCode).toUpperCase();
  if (["E", "C", "D"].includes(code)) return "15 KG";
  if (["B", "A"].includes(code)) return "20 KG";
  if (code === "Y") return "25 KG";
  return "20 KG";
}

function getBuddhaFare(flight) {
  const adult = flight.airfare?.faredetail?.adult;
  const total = Number(adult?.totalfarenprusd);
  if (Number.isFinite(total)) return total;

  const original = Number(flight.airfare?.originalfaredetail?.netfare);
  return Number.isFinite(original) ? original : Infinity;
}

function groupBuddhaFlights(flights) {
  const groups = new Map();

  for (const fare of flights) {
    const key = `${fare.flight}|${fare.departure}`;

    if (!groups.has(key)) {
      groups.set(key, {
        airline: fare.airline,
        flight: fare.flight,
        origin: fare.origin,
        destination: fare.destination,
        originName: fare.originName,
        destinationName: fare.destinationName,
        departure: fare.departure,
        arrival: fare.arrival,
        lowestFare: fare.fare,
        currency: fare.currency,
        fares: []
      });
    }

    const flight = groups.get(key);
    flight.lowestFare = Math.min(flight.lowestFare, fare.fare);
    flight.fares.push({
      fareClass: fare.fareClass,
      fare: fare.fare,
      baggage: fare.baggage,
      refundable: fare.refundable,
      currency: fare.currency
    });
  }

  return [...groups.values()].sort((a, b) => a.lowestFare - b.lowestFare);
}

async function generateBuddhaHash(message, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return [...new Uint8Array(signature)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}


/* =====================================================
   YETI AIRLINES
===================================================== */

async function searchYeti(from, to, date) {
  try {
    const home = await fetch(YETI + "/", {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    const homeHtml = await home.text();
    const form = extractYetiForm(homeHtml);
    const cookies = getCookies(home.headers);
    const required = ["rms", "axy", "zzy", "search_id", "token"];
    const missing = required.filter(key => !form[key]);

    if (missing.length) {
      return { ok: false, airline: "Yeti Airlines", error: "Required form values not found", missing };
    }

    const body = new URLSearchParams();
    body.set("tripType", "oneway");
    body.set("departure", from);
    body.set("destination", to);
    body.set("rms", form.rms);
    body.set("axy", form.axy);
    body.set("zzy", form.zzy);
    body.set("search_id", form.search_id);
    body.set("_token", form.token);
    body.set("departureDate", formatYetiDate(date));
    body.set("nationality", "NP");
    body.set("adult", "1");
    body.set("child", "0");
    body.set("flightButton", "1");
    body.set("website", "");

    const result = await fetch(YETI + "/search", {
      method: "POST",
      redirect: "follow",
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type": "application/x-www-form-urlencoded",
        "Origin": YETI,
        "Referer": YETI + "/",
        "Cookie": cookies
      },
      body
    });

    const html = await result.text();
    const allFlights = parseYetiFlights(html);
    const routeFlights = allFlights.filter(flight => flight.origin === from && flight.destination === to);
    const flights = groupYetiFlights(routeFlights);

    return { ok: true, airline: "Yeti Airlines", flights };

  } catch (error) {
    return {
      ok: false,
      airline: "Yeti Airlines",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function extractYetiForm(html) {
  return {
    rms: getInputValue(html, "rms"),
    axy: getInputValue(html, "axy"),
    zzy: getInputValue(html, "zzy"),
    search_id: getInputValue(html, "search_id"),
    token: getInputValue(html, "_token")
  };
}

function getInputValue(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<input[^>]*name=["']${escaped}["'][^>]*value=["']([^"']*)["']`, "i"),
    new RegExp(`<input[^>]*value=["']([^"']*)["'][^>]*name=["']${escaped}["']`, "i")
  ];

  for (const regex of patterns) {
    const match = html.match(regex);
    if (match) return decodeHtml(match[1]);
  }
  return null;
}

function getCookies(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie().map(cookie => cookie.split(";")[0]).filter(Boolean).join("; ");
  }
  return "";
}

function parseYetiFlights(html) {
  const flights = [];
  const regex = /data-value="({.*?})"/g;
  let match;

  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(decodeHtml(match[1]));
      if (!data.airline_rcd || !data.flight_number || !data.origin_rcd || !data.destination_rcd) continue;

      const start = Math.max(0, match.index - 1500);
      const end = Math.min(html.length, regex.lastIndex + 1500);
      const surrounding = html.substring(start, end);
      const price = extractYetiPrice(surrounding, data.total_adult_fare);

      flights.push({
        airline: "Yeti Airlines",
        flight: `${data.airline_rcd}-${data.flight_number}`,
        origin: data.origin_rcd,
        destination: data.destination_rcd,
        originName: data.origin_name || null,
        destinationName: data.destination_name || null,
        departure: data.planned_departure_time || null,
        arrival: data.planned_arrival_time || null,
        duration: data.flight_duration ? `${data.flight_duration} min` : null,
        fareCode: data.fare_code || null,
        fare: price.displayed,
        originalFare: price.original,
        discount: price.discount,
        currency: data.currency_rcd || "NPR",
        refundable: data.refundable_flag === "1",
        baggage: data.weight_allowance ? `${data.weight_allowance} kg` : null
      });

    } catch {
      // Ignore invalid JSON parsing matches
    }
  }

  return flights.filter((flight, index, array) =>
    index === array.findIndex(item =>
      item.flight === flight.flight &&
      item.fareCode === flight.fareCode &&
      item.origin === flight.origin &&
      item.destination === flight.destination
    )
  );
}

function extractYetiPrice(html, fallback) {
  const current = html.match(/(?:NPR|USD)[^0-9]{0,100}([\d,]+(?:\.\d+)?)[^<]{0,100}\(Adult\)/i);
  const original = html.match(/<strike[^>]*>[\s\S]*?(?:NPR|USD)[^0-9]*([\d,]+(?:\.\d+)?)[\s\S]*?\(Adult\)[\s\S]*?<\/strike>/i);

  const displayed = current ? parsePrice(current[1]) : toNumber(fallback);
  const originalValue = original ? parsePrice(original[1]) : null;

  const discount = displayed !== null && originalValue !== null && originalValue > displayed
    ? Math.round((originalValue - displayed) * 100) / 100
    : null;

  return { displayed, original: originalValue, discount };
}

function groupYetiFlights(flights) {
  const groups = new Map();

  for (const fare of flights) {
    const key = `${fare.flight}|${fare.departure}`;

    if (!groups.has(key)) {
      groups.set(key, {
        airline: fare.airline,
        flight: fare.flight,
        origin: fare.origin,
        destination: fare.destination,
        originName: fare.originName,
        destinationName: fare.destinationName,
        departure: fare.departure,
        arrival: fare.arrival,
        duration: fare.duration,
        lowestFare: fare.fare,
        currency: fare.currency,
        fares: []
      });
    }

    const flight = groups.get(key);
    if (Number.isFinite(fare.fare)) {
      flight.lowestFare = Math.min(flight.lowestFare ?? Infinity, fare.fare);
    }

    flight.fares.push({
      fareCode: fare.fareCode,
      fare: fare.fare,
      originalFare: fare.originalFare,
      discount: fare.discount,
      refundable: fare.refundable,
      baggage: fare.baggage,
      currency: fare.currency
    });
  }

  return [...groups.values()].sort((a, b) => (a.lowestFare ?? Infinity) - (b.lowestFare ?? Infinity));
}


/* =====================================================
   HELPERS & DATE FORMATTERS
===================================================== */

function formatBuddhaDate(date) {
  const [year, month, day] = date.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day}-${months[Number(month) - 1]}-${year}`;
}

function formatYetiDate(date) {
  const [year, month, day] = date.split("-");
  return `${month}/${day}/${year}`;
}

function formatShreeDate(date) {
  const [year, month, day] = date.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${parseInt(day, 10)}-${months[Number(month) - 1]}-${year}`;
}

function parseCookies(setCookieHeader) {
  return setCookieHeader
    .split(/,(?=\s*[a-zA-Z0-9_+-]+=)/)
    .map(cookie => cookie.split(";")[0].trim())
    .join("; ");
}

function getAttr(htmlString, attrName) {
  const regex = new RegExp(`${attrName}=["']([^"']+)["']`, "i");
  const match = htmlString.match(regex);
  return match ? match[1] : null;
}

function isRefundable(value) {
  return value === true || value === 1 || value === "1" || String(value).toUpperCase() === "YES";
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parsePrice(value) {
  if (!value) return null;
  const number = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(number) ? number : null;
}

function decodeHtml(value) {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}


/* =====================================================
   RESPONSE + CORS
===================================================== */

function corsHeaders(allowedOrigin) {
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function json(data, status = 200, origin = null) {
  const headers = {
    "Content-Type": "application/json;charset=UTF-8"
  };

  if (origin) {
    Object.assign(headers, corsHeaders(origin));
  }

  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers
  });
}
