/**
 * directives/helpers.js
 * ----------------------------------------------------------------------------
 * Small reusable directives used across the client pages:
 *
 *   ng-error        - fires the expression when an <img> fails to load, so the
 *                     gradient fallback is shown instead of a broken icon.
 *   back-to-top     - floating button that appears after scrolling.
 *   count-up        - animates a number from 0 to its value on first render.
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  angular.module('charityApp')

    .directive('ngError', [function () {
      return {
        restrict: 'A',
        link: function (scope, element, attrs) {
          element.on('error', function () {
            scope.$apply(function () {
              scope.$eval(attrs.ngError);
            });
          });
        }
      };
    }])

    .directive('backToTop', ['$window', function ($window) {
      return {
        restrict: 'E',
        template:
          '<button class="btn btn-primary back-top" type="button" ng-show="visible" ' +
          'ng-click="toTop()" title="Back to top">↑</button>',
        link: function (scope) {
          scope.visible = false;

          function onScroll() {
            const show = $window.pageYOffset > 500;
            if (show !== scope.visible) {
              scope.$applyAsync(function () { scope.visible = show; });
            }
          }

          scope.toTop = function () {
            $window.scrollTo({ top: 0, behavior: 'smooth' });
          };

          angular.element($window).on('scroll', onScroll);
          scope.$on('$destroy', function () {
            angular.element($window).off('scroll', onScroll);
          });
        }
      };
    }])

    .directive('countUp', ['$interval', function ($interval) {
      return {
        restrict: 'A',
        scope: { countUp: '@' },
        link: function (scope, element) {
          const target = Number(scope.countUp) || 0;
          let current = 0;
          const steps = 24;
          const increment = target / steps;

          const timer = $interval(function () {
            current += increment;
            element.text(Math.round(current).toLocaleString('en-AU'));
            if (current >= target) {
              element.text(target.toLocaleString('en-AU'));
              $interval.cancel(timer);
            }
          }, 22);

          scope.$on('$destroy', function () { $interval.cancel(timer); });
        }
      };
    }]);
})();
