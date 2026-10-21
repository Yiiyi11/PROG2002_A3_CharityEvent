/**
 * controllers/nav.controller.js
 * ----------------------------------------------------------------------------
 * Controls the shared header (mobile menu, active-link highlighting, current
 * year in the footer) and the small "stats bar" that some pages display.
 * A single header markup block is included on every page, so adding a page to
 * the menu only requires editing NAV_ITEMS in this file.
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  const NAV_ITEMS = [
    { label: 'Home',           file: 'index.html' },
    { label: 'All Events',     file: 'events.html' },
    { label: 'Search',         file: 'search.html' },
    { label: 'Categories',     file: 'categories.html' },
    { label: 'Weather',        file: 'weather.html' },
    { label: 'About Us',       file: 'about.html' },
    { label: 'Contact',        file: 'contact.html' }
  ];

  angular.module('charityApp').controller('NavController', ['$scope', '$window', 'EventService', 'API_CONFIG',
    function ($scope, $window, EventService, API_CONFIG) {
      $scope.navItems = NAV_ITEMS;
      $scope.menuOpen = false;
      $scope.year = new Date().getFullYear();
      $scope.apiBase = API_CONFIG.baseUrl;

      /** The page currently open, e.g. "search.html". */
      $scope.currentPage = function () {
        const file = $window.location.pathname.split('/').pop();
        return file === '' ? 'index.html' : file;
      };

      $scope.isActive = function (item) {
        return $scope.currentPage() === item.file;
      };

      $scope.toggleMenu = function () {
        $scope.menuOpen = !$scope.menuOpen;
      };

      /** Header counters (optional; silently ignored when the API is down). */
      $scope.stats = null;
      EventService.getStats().then(function (res) {
        $scope.stats = res.data;
      }).catch(function () {
        $scope.stats = null;
      });
    }]);

  /**
   * Reusable header directive so no page repeats 20 lines of markup.
   * Usage: <site-header></site-header>
   */
  angular.module('charityApp').directive('siteHeader', [function () {
    return {
      restrict: 'E',
      templateUrl: 'src/views/partials/header.html',
      controller: 'NavController'
    };
  }]);

  /**
   * Reusable footer directive.
   * Usage: <site-footer></site-footer>
   */
  angular.module('charityApp').directive('siteFooter', [function () {
    return {
      restrict: 'E',
      templateUrl: 'src/views/partials/footer.html',
      controller: ['$scope', function ($scope) {
        $scope.year = new Date().getFullYear();
      }]
    };
  }]);
})();
