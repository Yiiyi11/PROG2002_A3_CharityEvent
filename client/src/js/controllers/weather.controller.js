/**
 * controllers/weather.controller.js
 * ----------------------------------------------------------------------------
 * Weather page (weather.html) - dedicated demonstration of the external
 * Open-Meteo API (optional part of the brief).
 *
 * The user picks one of the upcoming events and the page shows the real seven
 * day forecast for the coordinates stored in the `events` table. The WMO code
 * translation table required by the brief is listed on the page as well so the
 * marker can see how the numeric codes become readable text.
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  angular.module('charityApp').controller('WeatherController', ['$scope', 'EventService', 'WeatherService', 'UtilService',
    function ($scope, EventService, WeatherService, UtilService) {
      $scope.util = UtilService;
      $scope.events = [];
      $scope.selected = null;
      $scope.forecast = null;
      $scope.loadingEvents = true;
      $scope.loadingWeather = false;
      $scope.error = null;
      $scope.weatherError = null;

      /** WMO code reference table (mirrors the table in the assessment brief). */
      $scope.wmoTable = [
        { code: '0',           text: 'Clear sky' },
        { code: '1, 2, 3',     text: 'Mainly clear, partly cloudy, and overcast' },
        { code: '45, 48',      text: 'Fog and depositing rime fog' },
        { code: '51, 53, 55',  text: 'Drizzle: Light, moderate, and dense' },
        { code: '61, 63, 65',  text: 'Rain: Light, moderate, and heavy' },
        { code: '80, 81, 82',  text: 'Rain showers: Light, moderate, and violent' },
        { code: '95',          text: 'Thunderstorm: Slight or moderate' }
      ];

      EventService.getHomeEvents().then(function (res) {
        const upcoming = res.data.filter(function (event) { return !UtilService.isPast(event); });
        $scope.events = upcoming;
        if (upcoming.length > 0) {
          $scope.selected = upcoming[0];
          loadForecast(upcoming[0]);
        }
      }).catch(function (err) {
        $scope.error = EventService.handleError(err).message;
      }).finally(function () {
        $scope.loadingEvents = false;
      });

      $scope.select = function (event) {
        $scope.selected = event;
        loadForecast(event);
      };

      function loadForecast(event) {
        $scope.loadingWeather = true;
        $scope.weatherError = null;
        $scope.forecast = null;

        WeatherService.getForecastForDate(event.latitude, event.longitude, event.event_date)
          .then(function (forecast) {
            $scope.forecast = forecast;
            $scope.eventDay = forecast.eventDay || forecast.days[0];
          })
          .catch(function (err) {
            $scope.weatherError = err.message;
          })
          .finally(function () {
            $scope.loadingWeather = false;
          });
      }
    }]);
})();
