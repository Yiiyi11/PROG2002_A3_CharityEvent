/**
 * admin-registration.controller.js
 * ----------------------------------------------------------------------------
 * Registration browser for staff: every ticket purchase across every event,
 * filterable by event, with the ability to remove a test registration.
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  angular.module('adminApp').controller('AdminRegistrationController', ['$scope', 'ApiService', 'ToastService', 'Fmt',
    function ($scope, ApiService, ToastService, Fmt) {
      $scope.fmt = Fmt;
      $scope.loading = true;
      $scope.error = null;
      $scope.registrations = [];
      $scope.events = [];
      $scope.eventFilter = '';
      $scope.search = '';

      ApiService.getEvents().then(function (res) { $scope.events = res.data; });

      function load() {
        $scope.loading = true;
        ApiService.getRegistrations($scope.eventFilter || null).then(function (res) {
          $scope.registrations = res.data;
          $scope.error = null;
        }).catch(function (err) {
          $scope.error = ApiService.errorOf(err).message;
        }).finally(function () {
          $scope.loading = false;
        });
      }

      $scope.$watch('eventFilter', load);

      $scope.visible = function () {
        const term = ($scope.search || '').toLowerCase().trim();
        if (!term) return $scope.registrations;
        return $scope.registrations.filter(function (r) {
          return (r.user_name + ' ' + r.user_email + ' ' + r.event_name).toLowerCase().indexOf(term) > -1;
        });
      };

      $scope.totals = function () {
        const list = $scope.visible();
        return {
          rows: list.length,
          tickets: list.reduce(function (s, r) { return s + Number(r.ticket_quantity); }, 0),
          value: list.reduce(function (s, r) { return s + Number(r.total_amount); }, 0)
        };
      };

      $scope.remove = function (reg) {
        if (!window.confirm('Remove the registration of ' + reg.user_name + ' for "' + reg.event_name + '"?')) return;

        ApiService.deleteRegistration(reg.registration_id).then(function (res) {
          ToastService.success(res.message);
          load();
        }).catch(function (err) {
          ToastService.error(ApiService.errorOf(err).message);
        });
      };

      load();
    }]);
})();
