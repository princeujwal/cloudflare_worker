const nepaliMonths = ["Baishakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];
const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const exceptions = {
    Baishakh: { def: 31, exceptions: { 30: [1974,1978,2000,2004,2027,2031,2035,2058] } },
    Jestha: { def: 31, exceptions: { 32: [1970,1973,1974,1977,1978,1981,1985,1988,1989,1992,1993,1996,1997,2000,2003,2004,2007,2011,2015,2018,2019,2022,2023,2026,2027,2030,2031,2034,2035,2038,2042,2045,2046,2049,2050,2053,2054,2057,2058,2061,2065,2069,2072,2073,2076,2077,2080,2081] } },
    Ashadh: { def: 32, exceptions: { 31: [1970,1973,1974,1977,1978,1981,1982,1985,1986,1988,1989,1990,1992,1993,1994,1996,1997,2000,2003,2004,2007,2008,2011,2012,2015,2016,2018,2019,2020,2022,2023,2024,2026,2027,2030,2031,2034,2035,2038,2039,2042,2043,2045,2046,2047,2049,2050,2051,2053,2054,2057,2058,2061,2062,2065,2066,2069,2070,2072,2073,2074,2076,2077,2078,2080,2081] } },
    Shrawan: { def: 32, exceptions: { 31: [1971,1972,1975,1979,1983,1987,1991,1995,1998,1999,2001,2005,2009,2013,2017,2021,2025,2028,2029,2032,2036,2040,2044,2048,2052,2055,2056,2059,2063,2067,2071,2075,2079,2082,2083] } },
    Bhadra: { def: 31, exceptions: { 32: [2029,2056] } },
    Ashwin: { def: 30, exceptions: { 31: [1971,1972,1975,1979,1982,1983,1986,1987,1990,1991,1994,1995,1998,1999,2001,2005,2008,2009,2012,2013,2016,2017,2020,2021,2024,2025,2028,2032,2035,2036,2039,2040,2043,2044,2047,2048,2051,2052,2055,2059,2062,2063,2066,2067,2070,2071,2074,2075,2078,2079,2082,2083] } },
    Kartik: { def: 30, exceptions: { 29: [1982,1986,1990,2008,2012,2016,2035,2039,2043,2062,2066,2070] } },
    Mangsir: { def: 29, exceptions: { 30: [1970,1973,1974,1977,1978,1981,1982,1985,1986,1989,1990,1993,1996,1997,2000,2003,2004,2007,2008,2011,2012,2015,2016,2019,2022,2023,2026,2027,2030,2031,2034,2035,2038,2039,2042,2043,2046,2049,2050,2053,2054,2057,2058,2061,2062,2065,2066,2069,2070,2073,2076,2077,2080,2081] } },
    Poush: { def: 30, exceptions: { 29: [1970,1973,1974,1977,1978,1981,1985,1989,1993,1996,1997,2000,2003,2004,2007,2011,2015,2019,2022,2023,2026,2027,2030,2031,2034,2038,2042,2046,2049,2050,2053,2054,2057,2058,2061,2062,2065,2069,2073,2076,2077,2080,2081] } },
    Magh: { def: 29, exceptions: { 30: [1970,1974,1978,1993,1997,2000,2004,2019,2023,2027,2031,2050,2054,2058,2062,2077,2081] } },
    Falgun: { def: 30, exceptions: { 29: [1970,1974,1978,1993,1997,2000,2004,2008,2019,2023,2027,2031,2035,2050,2054,2058,2062,2066,2077,2081] } },
    Chaitra: { def: 30, exceptions: { 31: [1970,1973,1974,1977,1978,1981,1985,1989,1993,1997,2000,2003,2004,2007,2008,2011,2015,2019,2023,2026,2027,2030,2031,2034,2035,2038,2042,2046,2050,2054,2057,2058,2061,2062,2065,2066,2069,2073,2077,2081] } }
};

function getDaysInBSMonth(year, monthName) {
  const config = exceptions[monthName];
  if (!config) return 30;
  for (const [targetDays, targetYears] of Object.entries(config.exceptions)) {
    if (targetYears.includes(year)) return parseInt(targetDays);
  }
  return config.def;
}

const nepaliYearRef = 1970;
const englishRefDate = new Date(Date.UTC(1913, 3, 13, 0, 0, 0, 0));
const ALLOWED_DOMAINS = ["https://ujwalamsal.com.np", "https://www.ujwalamsal.com.np"];
const REDIRECT_TARGET = "https://www.ujwalamsal.com.np/p/nepali-english-date-converter.html";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const origin = request.headers.get("Origin") || "";
    const fetchMode = request.headers.get("Sec-Fetch-Mode") || "";

    if (!action || fetchMode === "navigate") {
      return Response.redirect(REDIRECT_TARGET, 302);
    }

    const isAllowed = ALLOWED_DOMAINS.includes(origin);
    if (request.method !== 'OPTIONS' && !isAllowed) {
      return new Response(JSON.stringify({ error: "Access Denied" }), { status: 403 });
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
      'Access-Control-Allow-Headers': 'content-type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      "Access-Control-Max-Age": "86400",
    };

    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      // Re-attach valid origin headers dynamically to avoid CORS browser drops
      const cachedHeaders = new Headers(cachedResponse.headers);
      cachedHeaders.set('Access-Control-Allow-Origin', isAllowed ? origin : 'null');
      return new Response(cachedResponse.body, { headers: cachedHeaders });
    }
    const cacheConfigHeaders = {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000"
    };

    if (action === "get-days") {
      const year = parseInt(url.searchParams.get("year") || "0");
      const monthVal = parseInt(url.searchParams.get("month") || "0");
      if(monthVal < 1 || monthVal > 12) {
         return new Response(JSON.stringify({ maxDays: 30 }), { headers: cacheConfigHeaders });
      }
      const maxDays = getDaysInBSMonth(year, nepaliMonths[monthVal - 1]);
      const res = new Response(JSON.stringify({ maxDays }), { headers: cacheConfigHeaders });
      
      // Asynchronously store to memory without holding up client response
      ctx.waitUntil(cache.put(request, res.clone()));
      return res;
    }

    if (action === "ad-to-bs") {
      const year = parseInt(url.searchParams.get("year") || "0");
      const month = parseInt(url.searchParams.get("month") || "0");
      const day = parseInt(url.searchParams.get("day") || "0");

      const inputDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      let diffDays = Math.round((inputDate.getTime() - englishRefDate.getTime()) / (1000 * 60 * 60 * 24));

      let currentYear = nepaliYearRef;
      let currentMonthIdx = 0;

      while (true) {
        let monthName = nepaliMonths[currentMonthIdx];
        let daysInMonth = getDaysInBSMonth(currentYear, monthName);
        if (diffDays >= daysInMonth) {
          diffDays -= daysInMonth;
          currentMonthIdx++;
          if (currentMonthIdx >= 12) { currentMonthIdx = 0; currentYear++; }
        } else { break; }
      }

      const targetDay = diffDays + 1;
      const res = new Response(
        JSON.stringify({ 
          formatted: `${currentYear} ${nepaliMonths[currentMonthIdx]} ${String(targetDay).padStart(2, '0')}, ${weekDays[inputDate.getUTCDay()]}`,
          year: currentYear, month: currentMonthIdx + 1, day: targetDay 
        }),
        { headers: cacheConfigHeaders }
      );

      ctx.waitUntil(cache.put(request, res.clone()));
      return res;
    }

    if (action === "bs-to-ad") {
      const year = parseInt(url.searchParams.get("year") || "0");
      const monthVal = parseInt(url.searchParams.get("month") || "0");
      const monthIdx = monthVal - 1;
      const day = parseInt(url.searchParams.get("day") || "0");

      if (monthVal < 1 || monthVal > 12 || day < 1 || day > getDaysInBSMonth(year, nepaliMonths[monthIdx])) {
        return new Response(JSON.stringify({ error: "Invalid Nepali Date Boundary detected." }), { status: 400, headers: corsHeaders });
      }

      let totalDays = 0;
      for(let y = nepaliYearRef; y < year; y++) {
        for(let m = 0; m < 12; m++) { totalDays += getDaysInBSMonth(y, nepaliMonths[m]); }
      }
      for(let m = 0; m < monthIdx; m++) { totalDays += getDaysInBSMonth(year, nepaliMonths[m]); }
      totalDays += (day - 1);

      const targetDate = new Date(englishRefDate.getTime());
      targetDate.setUTCDate(targetDate.getUTCDate() + totalDays);

      const outYear = targetDate.getUTCFullYear();
      const outMonth = targetDate.getUTCMonth() + 1;
      const outDay = targetDate.getUTCDate();
      const outWeekday = weekDays[targetDate.getUTCDay()];

      const res = new Response(
        JSON.stringify({ 
          year: outYear,
          month: outMonth,
          day: outDay,
          weekday: outWeekday,
          formatted: `${outYear}-${String(outMonth).padStart(2, '0')}-${String(outDay).padStart(2, '0')}, ${outWeekday}`
        }),
        { headers: cacheConfigHeaders }
      );

      ctx.waitUntil(cache.put(request, res.clone()));
      return res;
    }

    return new Response(JSON.stringify({ error: "Invalid Action" }), { status: 400, headers: corsHeaders });
  }
};
