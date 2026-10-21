/**
 * controllers/event-list.controller.js
 * ----------------------------------------------------------------------------
 * Full event listing page (events.html).
 *
 * Data comes from GET /api/events/home. The response is split into
 * "upcoming" and "past" groups and the user can additionally filter by
 * category and keyword in the browser (ng-repeat + filter) without a new
 * request - the server-side search page covers the API-driven filtering.
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  angular.module('charityApp').controller('EventListController', ['$scope', 'EventService', 'UtilService',
    function ($scope, EventService, UtilService) {
      $scope.util = UtilService;
      $scope.loading = true;
      $scope.error = null;
      $scope.upcoming = [];
      $scope.past = [];
      $scope.categories = [];
      $scope.filters = { category_id: '', keyword: '' };
      $scope.tab = 'upcoming';

      function applyCategoryFilter(events) {
        const categoryId = $scope.filters.category_id;
        const keyword = ($scope.filters.keyword || '').toLowerCase().trim();

        return events.filter(function (event) {
          if (categoryId && String(event.category_id) !== String(categoryId)) return false;
          if (keyword) {
            const haystack = (event.event_name + ' ' + event.location + ' ' + event.description).toLowerCase();
            if (haystack.indexOf(keyword) === -1) return false;
          }
          return true;
        });
      }

      $scope.$watchGroup(['filters.category_id', 'filters.keyword'], function () {
        if (!$scope.allEvents) return;
        const upcoming = $scope.allEvents.filter(function (e) { return !UtilService.isPast(e); });
        const past = $scope.allEvents.filter(function (e) { return UtilService.isPast(e); });
        $scope.upcoming = applyCategoryFilter(upcoming);
        $scope.past = applyCategoryFilter(past);
      });

      $scope.setTab = function (tab) { $scope.tab = tab; };

      $scope.resetFilters = function () {
        $scope.filters.category_id = '';
        $scope.filters.keyword = '';
      };

      function load() {
        $scope.loading = true;
        EventService.getHomeEvents().then(function (res) {
          $scope.allEvents = res.data;
          $scope.upcoming = applyCategoryFilter(res.data.filter(function (e) { return !UtilService.isPast(e); }));
          $scope.past = applyCategoryFilter(res.data.filter(function (e) { return UtilService.isPast(e); }));
        }).catch(function (err) {
          $scope.error = EventService.handleError(err).message;
        }).finally(function () {
          $scope.loading = false;
        });
      }

      EventService.getCategories().then(function (res) {
        $scope.categories = res.data;
      });

      load();
    }]);
})();
