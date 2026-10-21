/**
 * controllers/contact.controller.js
 * ----------------------------------------------------------------------------
 * Contact page: a client-validated enquiry form. There is no backend endpoint
 * for messages in scope of the assessment, so a successful "send" only shows a
 * confirmation and logs the payload to the console - the exercise is the
 * DOM validation and user feedback, not email delivery.
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  angular.module('charityApp').controller('ContactController', ['$scope', function ($scope) {
    $scope.form = { name: '', email: '', subject: 'General enquiry', message: '' };
    $scope.sent = false;
    $scope.error = null;

    $scope.subjects = [
      'General enquiry',
      'Event registration problem',
      'Sponsorship and partnerships',
      'Volunteering',
      'Media request'
    ];

    $scope.send = function (isValid) {
      $scope.error = null;
      if (!isValid) {
        $scope.error = 'Please complete every required field before sending your message.';
        return;
      }
      if (!$scope.form.message || $scope.form.message.trim().length < 20) {
        $scope.error = 'Please describe your enquiry in at least 20 characters.';
        return;
      }
      console.log('[contact] enquiry submitted', $scope.form);
      $scope.sent = true;
    };

    $scope.reset = function () {
      $scope.form = { name: '', email: '', subject: 'General enquiry', message: '' };
      $scope.sent = false;
      $scope.error = null;
    };
  }]);
})();
