/**
 * controllers/event-list-route.controller.js
 * ----------------------------------------------------------------------------
 * Controllers used by the ui-independent ngRoute views (/events, /weather)
 * inside index.html. They delegate to the same services as the standalone
 * pages, which keeps a single source of truth for the API logic.
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  angular.module('charityApp')

    /** Route "/events" - compact upcoming event list inside the SPA shell. */
    .controller('RouteEventListController', ['$scope', 'EventService', 'UtilService',
      function ($scope, EventService, UtilService) {
        $scope.util = UtilService;
        $scope.loading = true;
        $scope.error = null;
        $scope.events = [];

        EventService.getHomeEvents().then(function (res) {
          $scope.events = res.data.filter(function (e) { return !UtilService.isPast(e); });
        }).catch(function (err) {
          $scope.error = EventService.handleError(err).message;
        }).finally(function () {
          $scope.loading = false;
        });
      }])

    /** Route "/weather" - compact weather view inside the SPA shell. */
    .controller('RouteWeatherController', ['$scope', 'EventService', 'WeatherService',
      function ($scope, EventService, WeatherService) {
        $scope.loading = true;
        $scope.error = null;
        $scope.days = [];
        $scope.place = null;

        EventService.getHomeEvents().then(function (res) {
          const first = res.data.filter(function (e) {
            return e.latitude !== null && e.longitude !== null;
          })[0];
          if (!first) {
            $scope.error = 'No event with coordinates is available for a forecast.';
            return;
          }
          $scope.place = first;
          return WeatherService.getDailyForecast(first.latitude, first.longitude).then(function (f) {
            $scope.days = f.days;
          });
        }).catch(function (err) {
          $scope.error = (err && err.message) || EventService.handleError(err).message;
        }).finally(function () {
          $scope.loading = false;
        });
      }]);
})();
