/**
 * directives/event-card.js
 * ----------------------------------------------------------------------------
 * <event-card evt="event"></event-card>
 *
 * The card markup lives in src/views/partials/event-card.html so the same
 * component is used on the home page, the event listing, the search results
 * and the category pages. An isolate scope keeps each card independent.
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  angular.module('charityApp').directive('eventCard', ['UtilService', function (UtilService) {
    return {
      restrict: 'E',
      templateUrl: 'src/views/partials/event-card.html',
      scope: {
        evt: '='
      },
      link: function (scope) {
        scope.util = UtilService;
      }
    };
  }]);
})();
