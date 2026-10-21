/**
 * admin-event-list.controller.js
 * ----------------------------------------------------------------------------
 * "Manage events" page.
 *
 *   List feature  - every event regardless of status, filtered by status tab
 *                   and a free-text search box (all data from GET /api/events)
 *   Delete feature- a Delete button on every row that calls
 *                   DELETE /api/events/:id. When the API blocks the deletion
 *                   because registrations exist (HTTP 409) the reason is shown
 *                   in a modal so the staff member understands why.
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  angular.module('adminApp').controller('AdminEventListController', ['$scope', 'ApiService', 'Fmt', 'ToastService',
    function ($scope, ApiService, Fmt, ToastService) {
      $scope.fmt = Fmt;
      $scope.loading = true;
      $scope.error = null;
      $scope.events = [];
      $scope.search = '';
      $scope.statusFilter = 'All';
      $scope.statuses = ['All', 'Active', 'Past', 'Suspended'];

      $scope.deleteTarget = null;   // event pending confirmation
      $scope.blocked = null;        // { message } when the API refuses

      function load() {
        $scope.loading = true;
        ApiService.getEvents().then(function (res) {
          $scope.events = res.data;
          $scope.error = null;
        }).catch(function (err) {
          $scope.error = ApiService.errorOf(err).message;
        }).finally(function () {
          $scope.loading = false;
        });
      }

      $scope.$watch('statusFilter', function (value) {
        if (value === 'All') return load();
        // The API accepts ?status= but a local re-filter keeps the tabs instant.
        load();
      });

      /** Client-side search across name, location and category. */
      $scope.visibleEvents = function () {
        const term = ($scope.search || '').toLowerCase().trim();
        return $scope.events.filter(function (event) {
          if ($scope.statusFilter !== 'All' && event.status !== $scope.statusFilter) return false;
          if (!term) return true;
          return (event.event_name + ' ' + event.location + ' ' + event.category_name).toLowerCase().indexOf(term) > -1;
        });
      };

      $scope.counts = function () {
        return {
          All: $scope.events.length,
          Active: $scope.events.filter(function (e) { return e.status === 'Active'; }).length,
          Past: $scope.events.filter(function (e) { return e.status === 'Past'; }).length,
          Suspended: $scope.events.filter(function (e) { return e.status === 'Suspended'; }).length
        };
      };

      /* ----------------------------- delete flow ----------------------------- */

      $scope.askDelete = function (event) {
        $scope.blocked = null;
        $scope.deleteTarget = event;
      };

      $scope.cancelDelete = function () {
        $scope.deleteTarget = null;
        $scope.blocked = null;
      };

      $scope.confirmDelete = function () {
        if (!$scope.deleteTarget) return;
        const target = $scope.deleteTarget;
        $scope.deleting = true;

        ApiService.deleteEvent(target.event_id).then(function (res) {
          ToastService.success(res.message);
          $scope.deleteTarget = null;
          load();
        }).catch(function (err) {
          const handled = ApiService.errorOf(err);
          if (handled.status === 409) {
            // Data-integrity rule: the event still has registrations.
            $scope.blocked = { message: handled.message, count: handled.errors && handled.errors.registration_count };
          } else {
            ToastService.error(handled.message);
            $scope.deleteTarget = null;
          }
        }).finally(function () {
          $scope.deleting = false;
        });
      };

      load();
    }]);
})();
