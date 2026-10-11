const ALLOWED_ORIGINS = new Set([
  "yourdomain.com"
]);

const NEPSE = "https://www.nepalstock.com";
const CACHE_VERSION = "v1";

/* =========================================================
   DUMMY DATA
========================================================= */

const DUMMY_DATA = [
  147,117,239,143,157,312,161,612,512,804,
  411,527,170,511,421,667,764,621,301,106,
  133,793,411,511,312,423,344,346,653,758,
  342,222,236,811,711,611,122,447,128,199,
  183,135,489,703,800,745,152,863,134,211,
  142,564,375,793,212,153,138,153,648,611,
  151,649,318,143,117,756,119,141,717,113,
  112,146,162,660,693,261,362,354,251,641,
  157,178,631,192,734,445,192,883,187,122,
  591,731,852,384,565,596,451,772,624,691
];

/* =========================================================
   RESPONSE HELPERS
========================================================= */

function cors(origin, ttl = 0) {
  const headers = new Headers();

  headers.set(
    "Content-Type",
    "application/json;charset=UTF-8"
  );

  headers.set(
    "Access-Control-Allow-Origin",
    ALLOWED_ORIGINS.has(origin) ? origin : "null"
  );

  headers.set(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS"
  );

  headers.set(
    "Access-Control-Allow-Headers",
    "Authorization,Content-Type"
  );

  headers.set(
    "Access-Control-Max-Age",
    "86400"
  );

  headers.set(
    "Vary",
    "Origin"
  );

  if (ttl > 0) {
    headers.set(
      "Cache-Control",
      `public, max-age=${ttl}, s-maxage=${ttl}`
    );
  } else {
    headers.set(
      "Cache-Control",
      "no-store"
    );
  }

  return headers;
}

function json(
  data,
  status,
  origin,
  ttl = 0,
  cacheStatus = null
) {
  const headers = cors(origin, ttl);

  if (cacheStatus) {
    headers.set(
      "X-NEPSE-Cache",
      cacheStatus
    );
  }

  return new Response(
    JSON.stringify(data),
    {
      status,
      headers
    }
  );
}

/* =========================================================
   NEPAL TIME & MARKET TTL
========================================================= */

function getNepalTime() {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: "Asia/Kathmandu",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      }
    ).formatToParts(new Date());

  const get = type =>
    parts.find(
      p => p.type === type
    )?.value;

  return {
    weekday: get("weekday"),
    hour: Number(get("hour") || 0),
    minute: Number(get("minute") || 0),
    second: Number(get("second") || 0)
  };
}

function getMarketCacheTTL() {
  const t = getNepalTime();

  const weekdayMap = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };

  const day =
    weekdayMap[t.weekday] ?? 1;

  const secondsNow =
    t.hour * 3600 +
    t.minute * 60 +
    t.second;

  const marketStart =
    10 * 3600 +
    30 * 60;

  const marketEnd =
    16 * 3600;

  /* SATURDAY */

  if (day === 6) {
    return Math.max(
      60,
      (2 * 86400) +
      marketStart -
      secondsNow
    );
  }

  /* SUNDAY */

  if (day === 0) {
    return Math.max(
      60,
      86400 +
      marketStart -
      secondsNow
    );
  }

  /* MONDAY - THURSDAY */

  if (day >= 1 && day <= 4) {
    if (secondsNow < marketStart) {
      return Math.max(
        60,
        marketStart -
        secondsNow
      );
    }

    if (
      secondsNow >= marketStart &&
      secondsNow < marketEnd
    ) {
      return 30;
    }

    return Math.max(
      60,
      (86400 - secondsNow) +
      marketStart
    );
  }

  /* FRIDAY */

  if (day === 5) {
    if (secondsNow < marketStart) {
      return Math.max(
        60,
        marketStart -
        secondsNow
      );
    }

    if (
      secondsNow >= marketStart &&
      secondsNow < marketEnd
    ) {
      return 30;
    }

    return Math.max(
      60,
      (3 * 86400) -
      secondsNow +
      marketStart
    );
  }

  return 30;
}

/* =========================================================
   CLOUDFLARE CACHE KEY
========================================================= */

function makeCacheKey(
  request,
  path
) {
  const url =
    new URL(request.url);

  return new Request(
    `${url.origin}/__nepse_cache/${CACHE_VERSION}${path}`,
    {
      method: "GET"
    }
  );
}

/* =========================================================
   CACHED JSON
========================================================= */

async function cachedJSON(
  request,
  origin,
  path,
  ttl,
  loader,
  ctx
) {
  const cache =
    caches.default;

  const cacheKey =
    makeCacheKey(
      request,
      path
    );

  const cached =
    await cache.match(cacheKey);

  if (cached) {
    const expires =
      Number(
        cached.headers.get(
          "X-NEPSE-Cache-Expires"
        ) || 0
      );

    if (expires > Date.now()) {
      const remaining =
        Math.max(
          1,
          Math.ceil(
            (expires - Date.now()) /
            1000
          )
        );

      const headers =
        cors(
          origin,
          remaining
        );

      headers.set(
        "X-NEPSE-Cache",
        "HIT"
      );

      headers.set(
        "X-NEPSE-Cache-Expires",
        String(expires)
      );

      return new Response(
        cached.body,
        {
          status: cached.status,
          headers
        }
      );
    }
  }

  const data =
    await loader();

  const expires =
    Date.now() +
    ttl * 1000;

  const storedHeaders =
    new Headers();

  storedHeaders.set(
    "Content-Type",
    "application/json;charset=UTF-8"
  );

  storedHeaders.set(
    "X-NEPSE-Cache-Expires",
    String(expires)
  );

  const storedResponse =
    new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: storedHeaders
      }
    );

  ctx.waitUntil(
    cache.put(
      cacheKey,
      storedResponse.clone()
    )
  );

  const responseHeaders =
    cors(
      origin,
      ttl
    );

  responseHeaders.set(
    "X-NEPSE-Cache",
    "MISS"
  );

  responseHeaders.set(
    "X-NEPSE-Cache-Expires",
    String(expires)
  );

  return new Response(
    JSON.stringify(data),
    {
      status: 200,
      headers: responseHeaders
    }
  );
}

/* =========================================================
   NEPSE API HELPERS
========================================================= */

async function getAuth() {
  const r =
    await fetch(
      `${NEPSE}/api/authenticate/prove`,
      {
        headers: {
          "Accept":
            "application/json,text/plain,*/*",
          "Referer":
            `${NEPSE}/`
        },
        cf: {
          cacheTtl: 0,
          cacheEverything: false
        }
      }
    );

  if (!r.ok) {
    throw new Error(
      `NEPSE auth HTTP ${r.status}.`
    );
  }

  const data =
    await r.json();

  if (
    !data.accessToken ||
    data.salt1 === undefined
  ) {
    throw new Error(
      "Invalid NEPSE auth response."
    );
  }

  return {
    accessToken: data.accessToken,
    salt1: Number(data.salt1),
    salt2: Number(data.salt2),
    salt3: Number(data.salt3),
    salt4: Number(data.salt4),
    salt5: Number(data.salt5)
  };
}

async function getFreshAuthorization() {
  const auth =
    await getAuth();

  return auth.accessToken;
}

async function nepseFetch(
  path,
  auth,
  method = "GET",
  body = null
) {
  const options = {
    method,
    headers: {
      "Accept":
        "application/json,text/plain,*/*",
      "Authorization":
        auth,
      "Referer":
        `${NEPSE}/`,
      "Origin":
        NEPSE
    },
    cf: {
      cacheTtl: 0,
      cacheEverything: false
    }
  };

  if (body !== null) {
    options.headers[
      "Content-Type"
    ] = "application/json";

    options.body =
      JSON.stringify(body);
  }

  const r =
    await fetch(
      `${NEPSE}${path}`,
      options
    );

  const text =
    await r.text();

  let data = null;

  try {
    data =
      JSON.parse(text);
  } catch {}

  return {
    ok: r.ok,
    status: r.status,
    data
  };
}

async function getMarketOpenId(auth) {
  return nepseFetch(
    "/api/nots/nepse-data/market-open",
    auth
  );
}

async function getMarketData(
  authorization
) {
  let auth =
    authorization;

  async function requestMarket() {
    const [
      indexResult,
      marketResult
    ] = await Promise.all([
      nepseFetch(
        "/api/nots/nepse-index",
        auth
      ),
      getMarketOpenId(auth)
    ]);

    return {
      indexResult,
      marketResult
    };
  }

  let result =
    await requestMarket();

  if (
    result.indexResult.status === 401 ||
    result.indexResult.status === 403 ||
    result.marketResult.status === 401 ||
    result.marketResult.status === 403
  ) {
    auth =
      await getFreshAuthorization();

    result =
      await requestMarket();
  }

  return {
    auth,
    ...result
  };
}

async function calculateDummyId(
  authorization
) {
  let auth =
    authorization;

  let market =
    await getMarketOpenId(auth);

  if (
    market.status === 401 ||
    market.status === 403
  ) {
    auth =
      await getFreshAuthorization();

    market =
      await getMarketOpenId(auth);
  }

  if (!market.ok) {
    throw new Error(
      `NEPSE market-open failed: HTTP ${market.status}`
    );
  }

  const marketId =
    Number(
      market.data?.id
    );

  if (
    !Number.isInteger(marketId) ||
    marketId < 0 ||
    marketId >= DUMMY_DATA.length
  ) {
    throw new Error(
      `Invalid NEPSE market ID: ${market.data?.id}`
    );
  }

  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "Asia/Kathmandu",
        day: "numeric"
      }
    ).formatToParts(
      new Date()
    );

  const day =
    Number(
      parts.find(
        p => p.type === "day"
      )?.value
    );

  const dummyValue =
    DUMMY_DATA[marketId];

  const calculatedId =
    dummyValue +
    marketId +
    (2 * day);

  return {
    calculatedId,
    marketId,
    dummyValue,
    day,
    isOpen:
      market.data?.isOpen,
    asOf:
      market.data?.asOf,
    auth
  };
}

/* =========================================================
   COMPANY / PROMOTER HELPERS
========================================================= */

function firstValue(...values) {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return value;
    }
  }

  return null;
}

function extractNormalCompanies(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (
    data &&
    Array.isArray(data.content)
  ) {
    return data.content;
  }

  if (
    data &&
    Array.isArray(data.data)
  ) {
    return data.data;
  }

  if (
    data &&
    Array.isArray(data.result)
  ) {
    return data.result;
  }

  if (
    data &&
    Array.isArray(data.items)
  ) {
    return data.items;
  }

  return [];
}

/* =========================================================
   PROMOTER SHARES
   IMPORTANT:
   Fetch ALL promoter pages from NEPSE.
========================================================= */

async function getPromoters(auth) {
  const first =
    await nepseFetch(
      "/api/nots/security/promoters",
      auth
    );

  if (
    first.status === 401 ||
    first.status === 403
  ) {
    return first;
  }

  if (
    !first.ok ||
    !first.data
  ) {
    return first;
  }

  const content =
    Array.isArray(
      first.data.content
    )
      ? [...first.data.content]
      : [];

  const total =
    Number(
      first.data.totalElements ||
      content.length
    );

  const size =
    Number(
      first.data.size ||
      content.length ||
      20
    );

  const pageCount =
    size > 0
      ? Math.ceil(
          total / size
        )
      : 1;

  /*
     Fetch page 1, 2, 3...
     because page 0 was already
     returned by the first request.
  */

  for (
    let page = 1;
    page < pageCount;
    page++
  ) {
    const result =
      await nepseFetch(
        `/api/nots/security/promoters?page=${page}`,
        auth
      );

    if (
      result.status === 401 ||
      result.status === 403
    ) {
      return result;
    }

    if (
      result.ok &&
      Array.isArray(
        result.data?.content
      )
    ) {
      content.push(
        ...result.data.content
      );
    }
  }

  return {
    ok: true,
    status: 200,
    data: content
  };
}

/* =========================================================
   BUILD COMPANY LIST
========================================================= */

function buildCompanyList(
  normal,
  promoters
) {
  const result = [];
  const seen = new Set();

  /* -------------------------------------------------------
     REGULAR COMPANIES
  ------------------------------------------------------- */

  const normalList =
    extractNormalCompanies(
      normal
    );

  for (
    const item of normalList
  ) {
    if (!item) {
      continue;
    }

    const id =
      firstValue(
        item.id,
        item.securityId,
        item.security_id,
        item.securityID,
        item.security?.id,
        item.companyId?.id
      );

    const symbol =
      firstValue(
        item.symbol,
        item.securitySymbol,
        item.security_symbol,
        item.security?.symbol,
        item.companySymbol,
        item.companyId?.symbol
      );

    if (
      id === null ||
      symbol === null
    ) {
      continue;
    }

    const status =
      firstValue(
        item.activeStatus,
        item.active_status,
        item.status,
        "A"
      );

    if (
      String(status).toUpperCase() !== "A"
    ) {
      continue;
    }

    const key =
      `${id}:${String(symbol).toUpperCase()}:regular`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    const securityName =
      String(
        firstValue(
          item.securityName,
          item.securityDescription,
          item.name,
          item.companyName,
          item.companyId?.companyName,
          ""
        )
      );

    const companyName =
      String(
        firstValue(
          item.companyName,
          item.companyId?.companyName,
          item.securityName,
          item.securityDescription,
          item.name,
          ""
        )
      );

    result.push({
      id: Number(id),
      symbol: String(symbol),
      securityName,
      companyName,
      type: "regular",
      isPromoter: "N"
    });
  }

  if (
    Array.isArray(promoters)
  ) {
    for (
      const item of promoters
    ) {
      if (
        !item ||
        item.activeStatus !== "A" ||
        !item.id ||
        !item.symbol
      ) {
        continue;
      }

      const key =
        `${item.id}:${String(item.symbol).toUpperCase()}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);

      result.push({
        id:
          Number(item.id),

        symbol:
          String(item.symbol),

        securityName:
          item.securityName ||
          item.companyId?.companyName ||
          "",

        companyName:
          item.companyId?.companyName ||
          item.securityName ||
          "",

        type:
          "promoter",

        isPromoter:
          "Y"
      });
    }
  }

  /* -------------------------------------------------------
     SORT
  ------------------------------------------------------- */

  return result.sort(
    (a, b) => {
      const sa =
        String(
          a.symbol
        ).toUpperCase();

      const sb =
        String(
          b.symbol
        ).toUpperCase();

      if (sa === sb) {
        if (
          a.isPromoter === "Y" &&
          b.isPromoter !== "Y"
        ) {
          return 1;
        }

        if (
          b.isPromoter === "Y" &&
          a.isPromoter !== "Y"
        ) {
          return -1;
        }
      }

      return sa.localeCompare(sb);
    }
  );
}

/* =========================================================
   WORKER ROUTER
========================================================= */

export default {
  async fetch(
    request,
    env,
    ctx
  ) {
    const origin =
      request.headers.get(
        "Origin"
      ) || "";

    /* =====================================================
       OPTIONS
    ===================================================== */

    if (
      request.method ===
      "OPTIONS"
    ) {
      if (
        !ALLOWED_ORIGINS.has(
          origin
        )
      ) {
        return json(
          {
            success: false,
            error:
              "Origin not allowed."
          },
          403,
          origin
        );
      }

      return new Response(
        null,
        {
          status: 204,
          headers:
            cors(origin)
        }
      );
    }

    /* =====================================================
       GET ONLY
    ===================================================== */

    if (
      request.method !==
      "GET"
    ) {
      return json(
        {
          success: false,
          error:
            "GET request required."
        },
        405,
        origin
      );
    }

    /* =====================================================
       ORIGIN CHECK
    ===================================================== */

    if (
      !ALLOWED_ORIGINS.has(
        origin
      )
    ) {
      return json(
        {
          success: false,
          error:
            "Access denied."
        },
        403,
        origin
      );
    }

    const url =
      new URL(
        request.url
      );

    /* =====================================================
       /auth
    ===================================================== */

    if (
      url.pathname ===
      "/auth"
    ) {
      try {
        const auth =
          await getAuth();

        const headers =
          cors(
            origin,
            30
          );

        headers.set(
          "Cache-Control",
          "private, max-age=30"
        );

        return new Response(
          JSON.stringify({
            success: true,
            ...auth
          }),
          {
            status: 200,
            headers
          }
        );
      } catch (error) {
        return json(
          {
            success: false,
            error:
              error?.message
          },
          503,
          origin
        );
      }
    }

    /* =====================================================
       AUTHORIZATION
    ===================================================== */

    const authorization =
      request.headers.get(
        "Authorization"
      ) || "";

    if (!authorization) {
      return json(
        {
          success: false,
          error:
            "Authorization required.",
          reauth: true
        },
        401,
        origin
      );
    }

    /* =====================================================
       /market
    ===================================================== */

    if (
      url.pathname ===
      "/market"
    ) {
      const ttl =
        getMarketCacheTTL();

      try {
        return await cachedJSON(
          request,
          origin,
          "/market",
          ttl,
          async () => {
            const result =
              await getMarketData(
                authorization
              );

            const {
              indexResult,
              marketResult
            } = result;

            if (
              indexResult.status === 401 ||
              indexResult.status === 403 ||
              marketResult.status === 401 ||
              marketResult.status === 403
            ) {
              throw new Error(
                "REAUTH"
              );
            }

            const wanted = [
              "NEPSE Index",
              "Sensitive Index",
              "Float Index",
              "Sensitive Float Index"
            ];

            const indexes =
              wanted
                .map(
                  name =>
                    indexResult.data?.find(
                      item =>
                        item?.index ===
                        name
                    )
                )
                .filter(Boolean);

            return {
              success: true,
              asOf:
                marketResult.data?.asOf,
              isOpen:
                marketResult.data?.isOpen,
              marketId:
                marketResult.data?.id,
              updatedAt:
                new Date().toISOString(),
              indexes
            };
          },
          ctx
        );
      } catch (error) {
        return json(
          {
            success: false,
            error:
              error?.message ===
              "REAUTH"
                ? "Authorization expired."
                : error?.message,
            reauth:
              error?.message ===
              "REAUTH"
          },
          error?.message ===
          "REAUTH"
            ? 401
            : 503,
          origin
        );
      }
    }

    /* =====================================================
       /market-summary
    ===================================================== */

    if (
      url.pathname ===
      "/market-summary"
    ) {
      const ttl =
        getMarketCacheTTL();

      try {
        return await cachedJSON(
          request,
          origin,
          "/market-summary",
          ttl,
          async () => {
            let auth =
              authorization;

            let res =
              await nepseFetch(
                "/api/nots/market-summary/",
                auth
              );

            if (
              res.status === 401 ||
              res.status === 403
            ) {
              auth =
                await getFreshAuthorization();

              res =
                await nepseFetch(
                  "/api/nots/market-summary/",
                  auth
                );
            }

            if (!res.ok) {
              throw new Error(
                `Market summary failed: HTTP ${res.status}`
              );
            }

            return {
              success: true,
              data:
                res.data
            };
          },
          ctx
        );
      } catch (error) {
        return json(
          {
            success: false,
            error:
              error?.message
          },
          503,
          origin
        );
      }
    }

   /* =====================================================
   /top-movers
===================================================== */

if (
  url.pathname ===
  "/top-movers"
) {
  const ttl =
    getMarketCacheTTL();

  try {
    return await cachedJSON(
      request,
      origin,
      "/top-movers",
      ttl,
      async () => {
        let auth =
          authorization;

        async function fetchAllMovers() {
          return Promise.all([
            nepseFetch(
              "/api/nots/top-ten/top-gainer?all=false",
              auth
            ),
            nepseFetch(
              "/api/nots/top-ten/top-loser?all=false",
              auth
            ),
            nepseFetch(
              "/api/nots/top-ten/turnover?all=false",
              auth
            ),
            nepseFetch(
              "/api/nots/top-ten/transaction?all=false",
              auth
            ),
            nepseFetch(
              "/api/nots/top-ten/trade?all=false",
              auth
            ),
            // New endpoints
            nepseFetch(
              "/api/nots/nepse-data/supplydemand?all=false",
              auth
            ),
            nepseFetch(
              "/api/nots/top-ten/trade-qty?all=false",
              auth
            )
          ]);
        }

        let [
          g,
          l,
          t,
          tr,
          v,
          sd,
          active
        ] =
          await fetchAllMovers();

        if (
          g.status === 401 ||
          g.status === 403 ||
          l.status === 401 ||
          l.status === 403 ||
          t.status === 401 ||
          t.status === 403 ||
          tr.status === 401 ||
          tr.status === 403 ||
          v.status === 401 ||
          v.status === 403 ||
          sd.status === 401 ||
          sd.status === 403 ||
          active.status === 401 ||
          active.status === 403
        ) {
          auth =
            await getFreshAuthorization();

          [
            g,
            l,
            t,
            tr,
            v,
            sd,
            active
          ] =
            await fetchAllMovers();
        }

        return {
          success: true,
          gainers:
            Array.isArray(g.data)
              ? g.data
              : [],
          losers:
            Array.isArray(l.data)
              ? l.data
              : [],
          turnover:
            Array.isArray(t.data)
              ? t.data
              : [],
          transactions:
            Array.isArray(tr.data)
              ? tr.data
              : [],
          volume:
            Array.isArray(v.data)
              ? v.data
              : [],
          // New data
          demand:
            Array.isArray(sd.data?.demandList)
              ? sd.data.demandList
              : [],
          supply:
            Array.isArray(sd.data?.supplyList)
              ? sd.data.supplyList
              : [],
          activeTrade:
            Array.isArray(active.data)
              ? active.data
              : []
        };
      },
      ctx
    );
  } catch (error) {
    return json(
      {
        success: false,
        error:
          error?.message
      },
      503,
      origin
    );
  }
}

    /* =====================================================
       /companies
    ===================================================== */

    if (
      url.pathname ===
      "/companies"
    ) {
      const ttl =
        6 * 60 * 60;

      try {
        return await cachedJSON(
          request,
          origin,
          "/companies",
          ttl,
          async () => {
            let auth =
              authorization;

            /*
               IMPORTANT:
               Regular company list + ALL
               promoter pages.
            */

            let normal =
              await nepseFetch(
                "/api/nots/company/list",
                auth
              );

            let promoter =
              await getPromoters(
                auth
              );

            /*
               Refresh authorization if
               either endpoint rejects it.
            */

            if (
              normal.status === 401 ||
              normal.status === 403 ||
              promoter.status === 401 ||
              promoter.status === 403
            ) {
              auth =
                await getFreshAuthorization();

              [
                normal,
                promoter
              ] =
                await Promise.all([
                  nepseFetch(
                    "/api/nots/company/list",
                    auth
                  ),
                  getPromoters(
                    auth
                  )
                ]);
            }

            /*
               If either endpoint is still
               unauthorized, force re-auth.
            */

            if (
              normal.status === 401 ||
              normal.status === 403 ||
              promoter.status === 401 ||
              promoter.status === 403
            ) {
              throw new Error(
                "REAUTH"
              );
            }

            /*
               Both lists are required.
            */

            if (!normal.ok) {
              throw new Error(
                `NEPSE company list failed: HTTP ${normal.status}`
              );
            }

            if (!promoter.ok) {
              throw new Error(
                `NEPSE promoter list failed: HTTP ${promoter.status}`
              );
            }

            /*
               promoter.data is now a FLAT
               array containing ALL pages.
            */

            const companies =
              buildCompanyList(
                normal.data,
                promoter.data
              );

            return {
              success: true,
              count:
                companies.length,
              companies
            };
          },
          ctx
        );
      } catch (error) {
        if (
          error?.message ===
          "REAUTH"
        ) {
          return json(
            {
              success: false,
              error:
                "NEPSE authorization expired.",
              reauth: true
            },
            401,
            origin
          );
        }

        return json(
          {
            success: false,
            error:
              error?.message
          },
          503,
          origin
        );
      }
    }

    /* =====================================================
       /stock/:id
    ===================================================== */

    if (
      url.pathname.startsWith(
        "/stock/"
      )
    ) {
      const id =
        url.pathname
          .replace(
            "/stock/",
            ""
          )
          .trim();

      if (
        !/^\d+$/.test(id)
      ) {
        return json(
          {
            success: false,
            error:
              "Invalid security ID."
          },
          400,
          origin
        );
      }

      const ttl =
        getMarketCacheTTL();

      try {
        return await cachedJSON(
          request,
          origin,
          `/stock/${id}`,
          ttl,
          async () => {
            let auth =
              authorization;

            /*
               Attempt 1
            */

            let dummy =
              await calculateDummyId(
                auth
              );

            let result =
              await nepseFetch(
                `/api/nots/security/${id}`,
                dummy.auth,
                "POST",
                {
                  id:
                    dummy.calculatedId
                }
              );

            /*
               Attempt 2
            */

            if (
              result.status === 401 ||
              result.status === 403 ||
              !result.ok
            ) {
              const freshAuth =
                await getFreshAuthorization();

              dummy =
                await calculateDummyId(
                  freshAuth
                );

              result =
                await nepseFetch(
                  `/api/nots/security/${id}`,
                  dummy.auth,
                  "POST",
                  {
                    id:
                      dummy.calculatedId
                  }
                );
            }

            if (
              !result.ok ||
              !result.data
            ) {
              throw new Error(
                "Stock fetch failed after retry."
              );
            }

            return {
              success: true,
              data:
                result.data
            };
          },
          ctx
        );
      } catch (error) {
        return json(
          {
            success: false,
            error:
              error?.message
          },
          503,
          origin
        );
      }
    }

    /* =====================================================
       /market-depth/:id   (regular market depth)
    ===================================================== */

    if (
      url.pathname.startsWith(
        "/market-depth/"
      )
    ) {
      const id =
        url.pathname
          .replace(
            "/market-depth/",
            ""
          )
          .trim();

      if (
        !/^\d+$/.test(id)
      ) {
        return json(
          {
            success: false,
            error:
              "Invalid security ID."
          },
          400,
          origin
        );
      }

      const ttl =
        getMarketCacheTTL();

      try {
        return await cachedJSON(
          request,
          origin,
          `/market-depth/${id}`,
          ttl,
          async () => {
            let auth =
              authorization;

            let res =
              await nepseFetch(
                `/api/nots/nepse-data/marketdepth/${id}`,
                auth
              );

            if (
              res.status === 401 ||
              res.status === 403
            ) {
              auth =
                await getFreshAuthorization();

              res =
                await nepseFetch(
                  `/api/nots/nepse-data/marketdepth/${id}`,
                  auth
                );
            }

            if (!res.ok || !res.data) {
              throw new Error(
                `Market depth failed: HTTP ${res.status}`
              );
            }

            return {
              success: true,
              data: res.data
            };
          },
          ctx
        );
      } catch (error) {
        return json(
          {
            success: false,
            error:
              error?.message
          },
          503,
          origin
        );
      }
    }

    /* =====================================================
       /market-depth-ol/:id   (odd-lot market depth)
    ===================================================== */

    if (
      url.pathname.startsWith(
        "/market-depth-ol/"
      )
    ) {
      const id =
        url.pathname
          .replace(
            "/market-depth-ol/",
            ""
          )
          .trim();

      if (
        !/^\d+$/.test(id)
      ) {
        return json(
          {
            success: false,
            error:
              "Invalid security ID."
          },
          400,
          origin
        );
      }

      const ttl =
        getMarketCacheTTL();

      try {
        return await cachedJSON(
          request,
          origin,
          `/market-depth-ol/${id}`,
          ttl,
          async () => {
            let auth =
              authorization;

            let res =
              await nepseFetch(
                `/api/nots/nepse-data/marketdepth-ol/${id}`,
                auth
              );

            if (
              res.status === 401 ||
              res.status === 403
            ) {
              auth =
                await getFreshAuthorization();

              res =
                await nepseFetch(
                  `/api/nots/nepse-data/marketdepth-ol/${id}`,
                  auth
                );
            }

            if (!res.ok || !res.data) {
              throw new Error(
                `Odd-lot market depth failed: HTTP ${res.status}`
              );
            }

            return {
              success: true,
              data: res.data
            };
          },
          ctx
        );
      } catch (error) {
        return json(
          {
            success: false,
            error:
              error?.message
          },
          503,
          origin
        );
      }
    }

    /* =====================================================
       HEALTH CHECK
    ===================================================== */

    if (
      url.pathname === "/"
    ) {
      return json(
        {
          success: true,
          message:
            "NEPSE API Worker Online"
        },
        200,
        origin
      );
    }

    /* =====================================================
       NOT FOUND
    ===================================================== */

    return json(
      {
        success: false,
        error:
          "Endpoint not found."
      },
      404,
      origin
    );
  }
};

