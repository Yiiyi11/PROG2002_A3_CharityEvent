/**
 * controllers/search.controller.js
 * ----------------------------------------------------------------------------
 * Search page (search.html) - the API-driven filtering page required by the
 * brief. Every filter is sent to GET /api/events/search as a query string,
 * so the filtering happens in MySQL rather than in the browser.
 *
 * Client-side validation prevents an impossible query (for example a date in
 * the past with "only upcoming" still selected) and gives an inline alert.
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  angular.module('charityApp').controller('SearchController', ['$scope', 'EventService', 'UtilService',
    function ($scope, EventService, UtilService) {
      $scope.util = UtilService;
      $scope.categories = [];
      $scope.results = [];
      $scope.searched = false;
      $scope.loading = false;
      $scope.error = null;
      $scope.validationError = null;

      // Filter model bound to the form with ng-model.
      $scope.filters = {
        keyword: '',
        date: '',
        location: '',
        category_id: '',
        include_past: false,
        sort: 'date_asc'
      };

      $scope.categoriesLoading = true;
      EventService.getCategories().then(function (res) {
        $scope.categories = res.data;
      }).catch(function () {
        $scope.error = 'Categories could not be loaded. You can still search by date or location.';
      }).finally(function () {
        $scope.categoriesLoading = false;
      });

      /** Light client-side validation before the API request is made. */
      function validate() {
        const f = $scope.filters;

        if (f.location && f.location.trim().length > 0 && f.location.trim().length < 2) {
          return 'Please enter at least two characters for the location.';
        }
        if (f.keyword && f.keyword.trim().length === 1) {
          return 'Please enter at least two characters for the keyword.';
        }
        if (f.date) {
          const chosen = new Date(f.date + 'T00:00:00');
          if (isNaN(chosen.getTime())) return 'Please choose a valid date.';
          // A past date combined with "hide past events" can never match.
          if (!f.include_past && chosen.getTime() < new Date().setHours(0, 0, 0, 0)) {
            return 'You selected a past date but "include past events" is unticked, so no event can match. Tick the box or choose a future date.';
          }
        }
        return null;
      }

      $scope.search = function () {
        $scope.validationError = validate();
        $scope.error = null;
        if ($scope.validationError) {
          $scope.results = [];
          $scope.searched = false;
          return;
        }

        $scope.loading = true;
        EventService.searchEvents($scope.filters).then(function (res) {
          $scope.results = res.data;
          $scope.searched = true;
          $scope.resultMessage = res.message;
        }).catch(function (err) {
          const handled = EventService.handleError(err);
          $scope.error = handled.message;
          $scope.results = [];
        }).finally(function () {
          $scope.loading = false;
        });
      };

      $scope.reset = function () {
        $scope.filters = { keyword: '', date: '', location: '', category_id: '', include_past: false, sort: 'date_asc' };
        $scope.results = [];
        $scope.searched = false;
        $scope.validationError = null;
        $scope.error = null;
      };
    }]);
})();
