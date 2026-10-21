/**
 * admin-shell.controller.js
 * ----------------------------------------------------------------------------
 * Controller for the persistent admin shell (sidebar menu + top bar).
 * The menu is data-driven so both pages stay in sync.
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  const MENU = [
    { group: 'Overview' },
    { label: 'Dashboard',     path: '/dashboard',     icon: '01' },
    { group: 'Charity events' },
    { label: 'Manage events', path: '/events',        icon: '02' },
    { label: 'Create event',  path: '/events/new',    icon: '03' },
    { group: 'Reference data' },
    { label: 'Categories',    path: '/categories',    icon: '04' },
    { label: 'Registrations', path: '/registrations', icon: '05' },
    { group: 'Tools' },
    { label: 'Weather check', path: '/weather',       icon: '06' }
  ];

  angular.module('adminApp').controller('AdminShellController', ['$scope', '$location',
    function ($scope, $location) {
      $scope.menu = MENU;
      $scope.year = new Date().getFullYear();

      $scope.currentPath = function () { return $location.path(); };

      /** Mark the menu item as active: /events must not highlight /events/new. */
      $scope.isActive = function (item) {
        const path = $location.path();
        if (item.path === '/events') {
          return path === '/events' || /^\/events\/\d+$/.test(path);
        }
        return path === item.path;
      };
    }]);
})();
