/**
 * controllers/categories.controller.js
 * ----------------------------------------------------------------------------
 * Categories page (categories.html) and the shared "weather" page controller
 * are kept in separate files; this file only handles categories.
 *
 * Each category card shows how many events belong to it and how much money has
 * been raised, both provided by GET /api/categories and GET /api/events/home.
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  angular.module('charityApp').controller('CategoriesController', ['$scope', 'EventService', 'UtilService',
    function ($scope, EventService, UtilService) {
      $scope.util = UtilService;
      $scope.loading = true;
      $scope.error = null;
      $scope.categories = [];

      EventService.getCategories().then(function (res) {
        $scope.categories = res.data;
      }).catch(function (err) {
        $scope.error = EventService.handleError(err).message;
      }).finally(function () {
        $scope.loading = false;
      });
    }]);
})();
