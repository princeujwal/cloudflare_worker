export default {
  async fetch(request, env, ctx) {
    const DHM_OBSERVATION_URL = "https://dhm.gov.np/mfd/api/manual-observation";
    const DHM_SUN_URL = "https://dhm.gov.np/mfd/api/sunrise-sunset";
    const DHM_FORECAST_URL = "https://dhm.gov.np/mfd/api/weather";
    const DHM_COUNTRY_FORECAST_URL = "https://dhm.gov.np/mfd/api/country-forecast";

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const CACHE_TTL_SECONDS = 1800;

      const fetchOpts = {
        method: "GET",
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", 
          "Accept": "application/json",
          "Cache-Control": "no-cache"
        },
        cf: { 
          cacheTtlByStatus: { "200-299": CACHE_TTL_SECONDS, "400-599": 0 },
          cacheEverything: true 
        }
      };

      const [obsRes, sunRes, forecastRes, countryRes] = await Promise.all([
        fetch(DHM_OBSERVATION_URL, fetchOpts),
        fetch(DHM_SUN_URL, fetchOpts),
        fetch(DHM_FORECAST_URL, fetchOpts),
        fetch(DHM_COUNTRY_FORECAST_URL, fetchOpts)
      ]);

      if (!obsRes.ok) throw new Error(`Observation API error: ${obsRes.status}`);

      const obsData = await obsRes.json();
      let sunData = null;
      let forecastData = [];
      let countryForecastEn = null;

      if (sunRes.ok) {
        const rawSun = await sunRes.json();
        sunData = {
          sunrise: rawSun.sunrise,
          sunset: rawSun.sunset,
          datetime: rawSun.datetime
        };
      }

      if (countryRes.ok) {
        const rawCountry = await countryRes.json();
        countryForecastEn = {
          issue_date: rawCountry.issue_date,
          analysis: (rawCountry.analysis_en || "").trim(),
          text_1: (rawCountry.en_text_1 || "").trim(),
          text_2: (rawCountry.en_text_2 || "").trim()
        };
      }

      const fixForecastTemp = (forecast) => {
        if (!forecast) return null;
        
        const fromTemp = forecast.from_temperature ?? forecast.min_temperature ?? forecast.temperature_from;
        let toTemp = forecast.to_temperature ?? forecast.max_temperature ?? forecast.temperature_to;

        if ((toTemp === null || toTemp === undefined) && (fromTemp !== null && fromTemp !== undefined)) {
          toTemp = Number(fromTemp) + 2;
        }

        return {
          ...forecast,
          from_temperature: fromTemp,
          to_temperature: toTemp
        };
      };

      if (forecastRes.ok) {
        const rawForecast = await forecastRes.json();
        forecastData = (rawForecast.stations || []).map(s => {
          const forecasts = s.manual_forecast || [];

          const day1 = forecasts.find(f => f.day === 1);
          const day2 = forecasts.find(f => f.day === 2);
          const day3 = forecasts.find(f => f.day === 3);

          let rawToday = null;
          let rawTomorrow = null;

          if (day1) {
            rawToday = day1;
            rawTomorrow = day2 || forecasts[1] || null;
          } else if (day2) {
            rawToday = day2;
            rawTomorrow = day3 || forecasts[1] || null;
          } else {
            rawToday = forecasts[0] || null;
            rawTomorrow = forecasts[1] || null;
          }

          return {
            id: s.id,
            name: s.name,
            nepali_name: s.nepali_name,
            sunrise: s.sunrise,
            sunset: s.sunset,
            today: fixForecastTemp(rawToday),
            tomorrow: fixForecastTemp(rawTomorrow)
          };
        });
      }

      const combinedResponse = {
        ...obsData,
        sun_info: sunData,
        country_forecast_en: countryForecastEn,
        city_forecasts: forecastData
      };

      return new Response(JSON.stringify(combinedResponse), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Cache-Control": `public, max-age=60, s-maxage=${CACHE_TTL_SECONDS}, must-revalidate`
        }
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch weather data", details: error.message }),
        { status: 500, headers: corsHeaders }
      );
    }
  }
};
