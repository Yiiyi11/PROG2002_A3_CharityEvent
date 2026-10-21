/**
 * admin-weather.controller.js
 * ----------------------------------------------------------------------------
 * Weather diagnostics for staff: verifies that every event has coordinates and
 * that the external Open-Meteo API responds for each venue. Useful before an
 * outdoor event is published.
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  angular.module('adminApp').controller('AdminWeatherController', ['$scope', 'ApiService',
    function ($scope, ApiService) {
      $scope.loading = true;
      $scope.error = null;
      $scope.events = [];
      $scope.results = {};

      ApiService.getEvents().then(function (res) {
        $scope.events = res.data;
      }).catch(function (err) {
        $scope.error = ApiService.errorOf(err).message;
      }).finally(function () {
        $scope.loading = false;
      });

      /**
       * Direct call to the external API. Implemented here (instead of reusing
       * the client WeatherService) so the admin module stays self-contained.
       */
      $scope.check = function (event) {
        $scope.results[event.event_id] = { loading: true };

        if (event.latitude === null || event.longitude === null) {
          $scope.results[event.event_id] = { error: 'No coordinates stored for this venue.' };
          return;
        }

        const url = 'https://api.open-meteo.com/v1/forecast';
        ApiService.checkWeather = ApiService.checkWeather || function (params) {
          return fetch(url + '?latitude=' + params.latitude +
            '&longitude=' + params.longitude +
            '&daily=weather_code,temperature_2m_max,temperature_2m_min' +
            '&timezone=Australia%2FSydney&forecast_days=1')
            .then(function (r) {
              if (!r.ok) throw new Error('HTTP ' + r.status);
              return r.json();
            });
        };

        ApiService.checkWeather({ latitude: event.latitude, longitude: event.longitude })
          .then(function (json) {
            $scope.$applyAsync(function () {
              $scope.results[event.event_id] = {
                max: Math.round(json.daily.temperature_2m_max[0]),
                min: Math.round(json.daily.temperature_2m_min[0]),
                code: json.daily.weather_code[0],
                timezone: json.timezone
              };
            });
          })
          .catch(function (err) {
            $scope.$applyAsync(function () {
              $scope.results[event.event_id] = { error: err.message };
            });
          });
      };

      $scope.checkAll = function () {
        $scope.events.forEach(function (event) { $scope.check(event); });
      };
    }]);
})();
