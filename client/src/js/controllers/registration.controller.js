/**
 * controllers/registration.controller.js
 * ----------------------------------------------------------------------------
 * Event registration page (register.html?id=N) - the new page required in
 * Assessment 3, part 3.
 *
 * Flow
 *   1. Read the event id from the URL query string (?id=).
 *   2. Load the event through GET /api/events/:id so the user sees exactly
 *      which charity event they are registering for.
 *   3. Validate the form (name, email, phone, tickets) in AngularJS; show an
 *      inline alert for every invalid field.
 *   4. POST /api/registrations
 *   5. On success show a confirmation panel with the reference number and the
 *      total amount, and offer navigation back to the event or the home page.
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  angular.module('charityApp').controller('RegistrationController', ['$scope', '$location', '$window', 'EventService', 'UtilService',
    function ($scope, $location, $window, EventService, UtilService) {
      $scope.util = UtilService;

      const eventId = UtilService.queryParam('id');

      $scope.event = null;
      $scope.loading = true;
      $scope.loadError = null;
      $scope.imgFailed = false;

      $scope.submitting = false;
      $scope.submitError = null;
      $scope.fieldErrors = {};
      $scope.confirmation = null;

      /** Form model. ticket_quantity starts at 1 as a sensible default. */
      $scope.form = {
        user_name: '',
        user_email: '',
        user_phone: '',
        ticket_quantity: 1,
        notes: ''
      };

      /* ------------------------------------------------------------------ */
      /* Load the selected event                                            */
      /* ------------------------------------------------------------------ */
      function loadEvent(eventId) {
        if (!eventId) {
          $scope.loadError = 'No event was selected. Please open this page from an event detail page.';
          $scope.loading = false;
          return;
        }

        EventService.getEventById(eventId).then(function (res) {
          $scope.event = res.data;

          if (UtilService.isPast(res.data)) {
            $scope.loadError = 'This event has already taken place, so registrations are closed.';
          }
          if (res.data.seats_remaining <= 0) {
            $scope.loadError = 'This event is sold out.';
          }
        }).catch(function (err) {
          const handled = EventService.handleError(err);
          $scope.loadError = handled.status === 404
            ? 'That event could not be found.'
            : handled.message;
        }).finally(function () {
          $scope.loading = false;
        });
      }

      /* ------------------------------------------------------------------ */
      /* Live total calculation shown next to the ticket selector           */
      /* ------------------------------------------------------------------ */
      $scope.ticketTotal = function () {
        if (!$scope.event) return 0;
        const qty = Number($scope.form.ticket_quantity) || 0;
        return qty * Number($scope.event.ticket_price || 0);
      };

      $scope.maxTickets = function () {
        if (!$scope.event) return 1;
        // Never offer more tickets than are left, and never more than 10.
        return Math.max(Math.min(Number($scope.event.seats_remaining) || 0, 10), 1);
      };

      /* ------------------------------------------------------------------ */
      /* Validation                                                         */
      /* ------------------------------------------------------------------ */
      const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      const PHONE_RE = /^[0-9 +()\-]{8,20}$/;

      function validate() {
        const errors = {};
        const f = $scope.form;

        if (!f.user_name || f.user_name.trim().length < 2) {
          errors.user_name = 'Please enter your full name (at least 2 characters).';
        }
        if (!f.user_email || !EMAIL_RE.test(f.user_email.trim())) {
          errors.user_email = 'Please enter a valid email address, for example name@example.com.';
        }
        if (!f.user_phone || !PHONE_RE.test(f.user_phone.trim())) {
          errors.user_phone = 'Please enter a contact number (8-20 digits, spaces, + ( ) - only).';
        }

        const qty = Number(f.ticket_quantity);
        if (!qty || qty < 1 || qty % 1 !== 0) {
          errors.ticket_quantity = 'Please purchase at least one ticket.';
        } else if (qty > 10) {
          errors.ticket_quantity = 'A maximum of 10 tickets can be purchased per registration.';
        } else if ($scope.event && qty > Number($scope.event.seats_remaining)) {
          errors.ticket_quantity = 'Only ' + $scope.event.seats_remaining + ' ticket(s) remain for this event.';
        }

        $scope.fieldErrors = errors;
        return Object.keys(errors).length === 0;
      }

      /* ------------------------------------------------------------------ */
      /* Submit                                                             */
      /* ------------------------------------------------------------------ */
      $scope.submit = function (isValid) {
        $scope.submitError = null;

        // The flag is passed in from the template (form.$valid). The manual
        // check below produces the specific messages.
        if (!isValid || !validate()) {
          $scope.submitError = 'Some details need your attention. Please check the highlighted fields.';
          return;
        }
        if (!$scope.event) return;

        $scope.submitting = true;

        const payload = {
          event_id: $scope.event.event_id,
          user_name: $scope.form.user_name.trim(),
          user_email: $scope.form.user_email.trim(),
          user_phone: $scope.form.user_phone.trim(),
          ticket_quantity: Number($scope.form.ticket_quantity),
          notes: $scope.form.notes ? $scope.form.notes.trim() : null
        };

        EventService.createRegistration(payload).then(function (res) {
          $scope.confirmation = res.data;
          $scope.confirmationMessage = res.message;
          // Scroll to the top so the confirmation panel is visible.
          $window.scrollTo(0, 0);
        }).catch(function (err) {
          const handled = EventService.handleError(err);
          $scope.submitError = handled.message;
          if (handled.errors) {
            // Map server-side field errors onto the form.
            $scope.fieldErrors = Object.assign({}, $scope.fieldErrors, handled.errors);
          }
        }).finally(function () {
          $scope.submitting = false;
        });
      };

      $scope.registerAnother = function () {
        $scope.confirmation = null;
        $scope.form = { user_name: '', user_email: '', user_phone: '', ticket_quantity: 1, notes: '' };
        $scope.fieldErrors = {};
        $scope.submitError = null;
      };

      loadEvent(eventId);
    }]);
})();
