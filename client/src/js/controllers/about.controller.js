/**
 * controllers/about-team.controller.js
 * ----------------------------------------------------------------------------
 * About Us page: shows the charity organisations (GET /api/organisations) and
 * the student development team behind the platform together with the division
 * of work recorded in the GitHub commit history.
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  angular.module('charityApp').controller('AboutController', ['$scope', 'EventService',
    function ($scope, EventService) {
      $scope.loading = true;
      $scope.error = null;
      $scope.organisations = [];

      $scope.team = [
        {
          name: 'Jingyi Shen',
          github: 'Yiiyi11',
          role: 'Backend & Client Website',
          focus: 'Database schema, Express REST API, client-side AngularJS pages',
          initials: 'JS'
        },
        {
          name: 'Zhiyuan Zhou',
          github: 'zhou123445',
          role: 'Admin Website & External API',
          focus: 'Admin dashboard, CRUD screens, Open-Meteo weather integration',
          initials: 'ZZ'
        }
      ];

      EventService.getOrganisations().then(function (res) {
        $scope.organisations = res.data;
      }).catch(function (err) {
        $scope.error = EventService.handleError(err).message;
      }).finally(function () {
        $scope.loading = false;
      });
    }]);
})();
