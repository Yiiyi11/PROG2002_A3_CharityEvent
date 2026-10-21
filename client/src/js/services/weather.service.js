/**
 * services/weather.service.js
 * ----------------------------------------------------------------------------
 * External Weather API integration (optional section of the brief).
 *
 * Provider : Open-Meteo  https://api.open-meteo.com/v1/forecast
 * Licence  : free for non-commercial use, no registration / API key needed.
 *
 * The API is called with the event latitude / longitude stored in the
 * `events` table, so the forecast shown on an event page is the real forecast
 * for the place where the event happens.
 *
 *   GET https://api.open-meteo.com/v1/forecast
 *        ?latitude=-27.47&longitude=153.03
 *        &daily=weather_code,temperature_2m_max,temperature_2m_min,
 *               precipitation_probability_max,wind_speed_10m_max
 *        &timezone=Australia%2FSydney
 *        &forecast_days=7
 *
 * The raw WMO `weather_code` values are translated into human readable text
 * using the table supplied in the assessment brief (plus the extra codes the
 * Open-Meteo documentation defines).
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  angular.module('charityApp').factory('WeatherService', ['$http', '$q',
    function ($http, $q) {
      const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

      /**
       * WMO weather interpretation codes -> description + icon.
       * Codes 0, 1-2-3, 45-48, 51-53-55, 61-63-65, 80-81-82, 95 are the values
       * listed in the assessment brief; the remaining ones are the optional
       * codes documented by Open-Meteo.
       */
      const WMO_CODES = {
        0:  { text: 'Clear sky',                         icon: '☀️', tone: 'sunny' },
        1:  { text: 'Mainly clear',                      icon: '🌤️', tone: 'sunny' },
        2:  { text: 'Partly cloudy',                     icon: '⛅', tone: 'cloudy' },
        3:  { text: 'Overcast',                          icon: '☁️', tone: 'cloudy' },
        45: { text: 'Fog',                               icon: '🌫️', tone: 'fog' },
        48: { text: 'Depositing rime fog',               icon: '🌫️', tone: 'fog' },
        51: { text: 'Light drizzle',                     icon: '🌦️', tone: 'rain' },
        53: { text: 'Moderate drizzle',                  icon: '🌦️', tone: 'rain' },
        55: { text: 'Dense drizzle',                     icon: '🌧️', tone: 'rain' },
        56: { text: 'Light freezing drizzle',            icon: '🌨️', tone: 'rain' },
        57: { text: 'Dense freezing drizzle',            icon: '🌨️', tone: 'rain' },
        61: { text: 'Light rain',                        icon: '🌦️', tone: 'rain' },
        63: { text: 'Moderate rain',                     icon: '🌧️', tone: 'rain' },
        65: { text: 'Heavy rain',                        icon: '🌧️', tone: 'rain' },
        66: { text: 'Light freezing rain',               icon: '🌨️', tone: 'rain' },
        67: { text: 'Heavy freezing rain',               icon: '🌨️', tone: 'rain' },
        71: { text: 'Light snowfall',                    icon: '🌨️', tone: 'snow' },
        73: { text: 'Moderate snowfall',                 icon: '❄️', tone: 'snow' },
        75: { text: 'Heavy snowfall',                    icon: '❄️', tone: 'snow' },
        77: { text: 'Snow grains',                       icon: '❄️', tone: 'snow' },
        80: { text: 'Light rain showers',                icon: '🌦️', tone: 'rain' },
        81: { text: 'Moderate rain showers',             icon: '🌧️', tone: 'rain' },
        82: { text: 'Violent rain showers',              icon: '⛈️', tone: 'storm' },
        85: { text: 'Light snow showers',                icon: '🌨️', tone: 'snow' },
        86: { text: 'Heavy snow showers',                icon: '❄️', tone: 'snow' },
        95: { text: 'Thunderstorm (slight or moderate)', icon: '⛈️', tone: 'storm' },
        96: { text: 'Thunderstorm with slight hail',     icon: '⛈️', tone: 'storm' },
        99: { text: 'Thunderstorm with heavy hail',      icon: '⛈️', tone: 'storm' }
      };

      /** Public helper so the views can show the translation table. */
      function describeCode(code) {
        return WMO_CODES[code] || { text: 'Unknown conditions', icon: '❔', tone: 'cloudy' };
      }

      /** Day-of-week label for a "YYYY-MM-DD" string from the API. */
      function weekday(isoDate) {
        const d = new Date(isoDate + 'T12:00:00');
        return d.toLocaleDateString('en-AU', { weekday: 'short' });
      }

      /** Short date label: "15 Nov". */
      function shortDate(isoDate) {
        const d = new Date(isoDate + 'T12:00:00');
        return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short' });
      }

      return {
        describeCode: describeCode,

        /**
         * Fetch a 7 day daily forecast for a coordinate pair and reshape the
         * arrays returned by the API into an array of day objects that the
         * AngularJS template can iterate with ng-repeat.
         */
        getDailyForecast: function (latitude, longitude) {
          if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
            return $q.reject({ message: 'This event does not have a latitude/longitude yet, so a weather forecast cannot be retrieved.' });
          }

          return $http.get(ENDPOINT, {
            params: {
              latitude: latitude,
              longitude: longitude,
              daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max',
              timezone: 'Australia/Sydney',
              forecast_days: 7
            },
            timeout: 15000
          }).then(function (response) {
            const daily = response.data && response.data.daily;
            if (!daily || !daily.time) {
              return $q.reject({ message: 'The weather service returned an unexpected response.' });
            }

            const days = daily.time.map(function (isoDate, index) {
              const info = describeCode(daily.weather_code[index]);
              return {
                date: isoDate,
                weekday: weekday(isoDate),
                shortDate: shortDate(isoDate),
                code: daily.weather_code[index],
                description: info.text,
                icon: info.icon,
                tone: info.tone,
                max: Math.round(daily.temperature_2m_max[index]),
                min: Math.round(daily.temperature_2m_min[index]),
                rainChance: daily.precipitation_probability_max
                  ? daily.precipitation_probability_max[index] : null,
                wind: daily.wind_speed_10m_max ? Math.round(daily.wind_speed_10m_max[index]) : null
              };
            });

            return {
              latitude: response.data.latitude,
              longitude: response.data.longitude,
              timezone: response.data.timezone,
              units: response.data.daily_units,
              days: days
            };
          }, function (error) {
            // Normalise $http failures / rejections into a readable object.
            if (error && error.message) return $q.reject(error);
            return $q.reject({
              message: error && error.status === -1
                ? 'The weather service could not be reached. Check your internet connection.'
                : 'The weather service is temporarily unavailable.'
            });
          });
        },

        /** Convenience: forecast for the day the event takes place. */
        getForecastForDate: function (latitude, longitude, isoDate) {
          return this.getDailyForecast(latitude, longitude).then(function (forecast) {
            const target = String(isoDate || '').slice(0, 10);
            forecast.eventDay = forecast.days.filter(function (d) { return d.date === target; })[0] || null;
            return forecast;
          });
        }
      };
    }]);
})();
