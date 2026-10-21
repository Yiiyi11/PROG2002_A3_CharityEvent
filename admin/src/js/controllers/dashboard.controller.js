/**
 * dashboard.controller.js
 * ----------------------------------------------------------------------------
 * Admin dashboard: KPI tiles from GET /api/stats, category distribution,
 * the five most recent registrations and a status breakdown of every event.
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  angular.module('adminApp').controller('DashboardController', ['$scope', 'ApiService', 'Fmt',
    function ($scope, ApiService, Fmt) {
      $scope.fmt = Fmt;
      $scope.loading = true;
      $scope.error = null;
      $scope.stats = null;
      $scope.events = [];

      $scope.today = new Date().toLocaleDateString('en-AU', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });

      ApiService.getStats().then(function (res) {
        $scope.stats = res.data;
      }).catch(function (err) {
        $scope.error = ApiService.errorOf(err).message;
      }).finally(function () {
        $scope.loading = false;
      });

      ApiService.getEvents().then(function (res) {
        $scope.events = res.data;
      }).catch(function () { /* the error banner above already reports it */ });

      /** Highest raised value, used to scale the category bars. */
      $scope.maxRaised = function () {
        if (!$scope.stats || !$scope.stats.perCategory.length) return 1;
        return Math.max.apply(null, $scope.stats.perCategory.map(function (c) { return Number(c.raised) || 0; })) || 1;
      };

      $scope.barWidth = function (raised) {
        return Math.round((Number(raised) / $scope.maxRaised()) * 100) + '%';
      };

      $scope.countByStatus = function (status) {
        return $scope.events.filter(function (e) { return e.status === status; }).length;
      };
    }]);
})();
