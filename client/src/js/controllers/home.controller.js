/**
 * controllers/home.controller.js
 * ----------------------------------------------------------------------------
 * Home page:
 *   - headline charity statistics from GET /api/stats
 *   - the next three upcoming events (GET /api/events/home, filtered client-side
 *     to keep the home page short)
 *   - a weather teaser for the next event, using the external Open-Meteo API
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  angular.module('charityApp').controller('HomeController', ['$scope', 'EventService', 'WeatherService', 'UtilService',
    function ($scope, EventService, WeatherService, UtilService) {
      $scope.util = UtilService;
      $scope.loading = true;
      $scope.error = null;
      $scope.stats = null;
      $scope.upcoming = [];
      $scope.nextEvent = null;
      $scope.nextEventWeather = null;
      $scope.weatherError = null;

      function loadStats() {
        EventService.getStats().then(function (res) {
          $scope.stats = res.data;
        }).catch(function (err) {
          $scope.error = EventService.handleError(err).message;
        });
      }

      function loadUpcomingEvents() {
        EventService.getHomeEvents().then(function (res) {
          const active = res.data.filter(function (event) {
            return !UtilService.isPast(event);
          });
          $scope.upcoming = active.slice(0, 3);
          $scope.nextEvent = $scope.upcoming[0] || null;

          if ($scope.nextEvent) {
            loadNextEventWeather($scope.nextEvent);
          }
        }).catch(function (err) {
          $scope.error = EventService.handleError(err).message;
        }).finally(function () {
          $scope.loading = false;
        });
      }

      /**
       * Weather teaser for the home page. The external API is only called when
       * the next event actually has coordinates stored in MySQL.
       */
      function loadNextEventWeather(event) {
        WeatherService.getForecastForDate(event.latitude, event.longitude, event.event_date)
          .then(function (forecast) {
            $scope.nextEventWeather = forecast.eventDay || forecast.days[0] || null;
          })
          .catch(function (err) {
            $scope.weatherError = err.message;
          });
      }

      loadStats();
      loadUpcomingEvents();
    }]);
})();
