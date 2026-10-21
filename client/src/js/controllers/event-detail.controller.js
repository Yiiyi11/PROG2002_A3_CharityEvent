/**
 * controllers/event-detail.controller.js
 * ----------------------------------------------------------------------------
 * Event detail page (event-detail.html?id=N).
 *
 * Assessment 3 enhancement: besides the event information, the page now shows
 *   - the list of tickets purchased for the event, newest purchase first,
 *     returned by GET /api/events/:id
 *   - live weather for the event location from the Open-Meteo API
 *   - a "Register" button that links to the new registration page and passes
 *     the event id through a URL query string.
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  angular.module('charityApp').controller('EventDetailController', ['$scope', '$location', 'EventService', 'WeatherService', 'UtilService',
    function ($scope, $location, EventService, WeatherService, UtilService) {
      $scope.util = UtilService;
      $scope.loading = true;
      $scope.error = null;
      $scope.event = null;
      $scope.registrations = [];
      $scope.imgFailed = false;

      $scope.weather = null;
      $scope.weatherLoading = false;
      $scope.weatherError = null;

      // Read ?id= from the URL query string.
      const eventId = UtilService.queryParam('id');
      $scope.eventId = eventId;

      if (!eventId) {
        $scope.error = 'No event id was supplied. Open this page from the event list.';
        $scope.loading = false;
        return;
      }

      EventService.getEventById(eventId).then(function (res) {
        $scope.event = res.data;
        $scope.registrations = res.data.registrations || [];
        loadWeather($scope.event);
      }).catch(function (err) {
        const handled = EventService.handleError(err);
        $scope.error = handled.status === 404
          ? 'That event could not be found. It may have been removed by an administrator.'
          : handled.message;
      }).finally(function () {
        $scope.loading = false;
      });

      /**
       * External Weather API call. Only the daily forecast values are shown:
       * the maximum / minimum temperature, the probability of rain and a
       * translated WMO weather code.
       */
      function loadWeather(event) {
        $scope.weatherLoading = true;
        $scope.weatherError = null;

        WeatherService.getForecastForDate(event.latitude, event.longitude, event.event_date)
          .then(function (forecast) {
            $scope.weather = forecast;
            // Prefer the forecast for the event day; fall back to tomorrow.
            $scope.eventDayWeather = forecast.eventDay || forecast.days[0];
          })
          .catch(function (err) {
            $scope.weatherError = err.message;
          })
          .finally(function () {
            $scope.weatherLoading = false;
          });
      }

      $scope.eventDayWeather = null;

      /** "Register" button -> registration page with the event id in the URL. */
      $scope.goToRegistration = function () {
        window.location.href = 'register.html?id=' + $scope.event.event_id;
      };

      $scope.registrationUrl = function () {
        return 'register.html?id=' + ($scope.event ? $scope.event.event_id : '');
      };
    }]);
})();
