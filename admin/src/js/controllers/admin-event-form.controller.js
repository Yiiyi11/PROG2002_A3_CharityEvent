/**
 * admin-event-form.controller.js
 * ----------------------------------------------------------------------------
 * Two controllers share one template (src/views/event-form.html):
 *
 *   AdminEventCreateController  -> POST /api/events   ("New" feature)
 *   AdminEventEditController    -> PUT  /api/events/:id ("Update" feature)
 *
 * Both load the reference lists (categories, organisations) and share the form
 * model + validation helper defined at the bottom of this file.
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  /**
   * Shared form logic, attached to whichever scope needs it.
   * Keeping it in one function guarantees that the create and edit forms
   * validate identically.
   */
  function attachFormHelpers($scope, ToastService, ApiService) {
    $scope.fieldErrors = {};
    $scope.submitError = null;
    $scope.saving = false;
    $scope.categories = [];
    $scope.organisations = [];

    /** Empty form model used by the "Create event" page. */
    $scope.blankEvent = function () {
      const tomorrow = new Date(Date.now() + 86400000);
      tomorrow.setHours(18, 0, 0, 0);
      return {
        event_name: '',
        description: '',
        // <input type="datetime-local"> requires a real Date object as its model.
        eventDate: tomorrow,
        location: '',
        org_id: null,
        category_id: null,
        ticket_price: 0,
        capacity: 100,
        charity_goal: 0,
        current_progress: 0,
        latitude: null,
        longitude: null,
        is_suspended: false,
        event_image_url: ''
      };
    };

    $scope.imageOptions = [
      { value: 'img/run.jpg',          label: 'Fun run' },
      { value: 'img/beachrun.jpg',     label: 'Beach run' },
      { value: 'img/gala.jpg',         label: 'Gala dinner' },
      { value: 'img/springball.jpg',   label: 'Ball' },
      { value: 'img/auction.jpg',      label: 'Auction' },
      { value: 'img/artauction.jpg',   label: 'Art auction' },
      { value: 'img/concert.jpg',      label: 'Concert' },
      { value: 'img/acoustic.jpg',     label: 'Acoustic show' },
      { value: 'img/springball.jpg',   label: 'Volunteer day' },
      { value: 'img/gala.jpg',         label: 'Bake sale' }
    ];

    /** Quick coordinate presets, so staff do not have to look up latitudes. */
    $scope.locationPresets = [
      { name: 'Brisbane CBD',            latitude: -27.469770, longitude: 153.025123 },
      { name: 'South Bank, Brisbane',    latitude: -27.481000, longitude: 153.023000 },
      { name: 'Fortitude Valley',        latitude: -27.456020, longitude: 153.036120 },
      { name: 'Gold Coast / Surfers',    latitude: -28.002300, longitude: 153.431000 },
      { name: 'Broadbeach',              latitude: -28.033333, longitude: 153.433333 },
      { name: 'Kingscliff, NSW',         latitude: -28.257500, longitude: 153.571400 }
    ];

    $scope.applyPreset = function (preset) {
      if (!preset) return;
      $scope.event.latitude = preset.latitude;
      $scope.event.longitude = preset.longitude;
      if (!$scope.event.location) $scope.event.location = preset.name;
    };

    /** Client-side validation mirroring api/utils/validation.js */
    function validate(event) {
      const errors = {};

      if (!event.event_name || event.event_name.trim().length < 3) {
        errors.event_name = 'Event name is required (at least 3 characters).';
      }
      if (!event.description || event.description.trim().length < 15) {
        errors.description = 'Please write a description of at least 15 characters.';
      }
      if (!event.location || event.location.trim().length < 3) {
        errors.location = 'Location is required.';
      }
      if (!event.eventDate || isNaN(new Date(event.eventDate).getTime())) {
        errors.event_date = 'Event date and time is required.';
      }
      if (!event.org_id) errors.org_id = 'Please choose the organising charity.';
      if (!event.category_id) errors.category_id = 'Please choose a category.';

      if (event.ticket_price === null || event.ticket_price === '' || Number(event.ticket_price) < 0) {
        errors.ticket_price = 'Ticket price cannot be negative.';
      }
      if (!event.capacity || Number(event.capacity) < 1) {
        errors.capacity = 'Capacity must be at least 1.';
      }
      if (event.charity_goal === null || Number(event.charity_goal) < 0) {
        errors.charity_goal = 'Charity goal cannot be negative.';
      }
      if (event.current_progress !== null && Number(event.current_progress) < 0) {
        errors.current_progress = 'Current progress cannot be negative.';
      }

      const hasLat = event.latitude !== null && event.latitude !== '' && event.latitude !== undefined;
      const hasLng = event.longitude !== null && event.longitude !== '' && event.longitude !== undefined;
      if (hasLat !== hasLng) {
        errors.latitude = 'Provide both latitude and longitude, or leave both empty.';
      }
      if (hasLat && (Number(event.latitude) < -90 || Number(event.latitude) > 90)) {
        errors.latitude = 'Latitude must be between -90 and 90.';
      }
      if (hasLng && (Number(event.longitude) < -180 || Number(event.longitude) > 180)) {
        errors.longitude = 'Longitude must be between -180 and 180.';
      }

      return errors;
    }

    /** Convert the AngularJS model into the JSON body the API expects. */
    $scope.buildPayload = function (event) {
      // Date object -> "YYYY-MM-DDTHH:mm" (local time, no UTC shift).
      const d = event.eventDate ? new Date(event.eventDate) : null;
      const pad = function (n) { return String(n).padStart(2, '0'); };
      const localStamp = d && !isNaN(d.getTime())
        ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
        : null;

      return {
        org_id: Number(event.org_id),
        category_id: Number(event.category_id),
        event_name: String(event.event_name).trim(),
        description: String(event.description).trim(),
        event_date: localStamp,
        location: String(event.location).trim(),
        latitude: event.latitude === '' || event.latitude === undefined ? null : Number(event.latitude),
        longitude: event.longitude === '' || event.longitude === undefined ? null : Number(event.longitude),
        ticket_price: Number(event.ticket_price) || 0,
        capacity: Number(event.capacity) || 1,
        charity_goal: Number(event.charity_goal) || 0,
        current_progress: Number(event.current_progress) || 0,
        is_suspended: !!event.is_suspended,
        event_image_url: event.event_image_url || null
      };
    };

    $scope.validateAndReport = function (event) {
      $scope.fieldErrors = validate(event);
      $scope.submitError = null;
      if (Object.keys($scope.fieldErrors).length) {
        $scope.submitError = 'Please fix the highlighted fields before saving.';
        window.scrollTo(0, 0);
        return false;
      }
      return true;
    };
  }

  /* ------------------------------------------------------------------------ */
  /* CREATE                                                                   */
  /* ------------------------------------------------------------------------ */
  angular.module('adminApp').controller('AdminEventCreateController',
    ['$scope', '$window', 'ApiService', 'ToastService',
      function ($scope, $window, ApiService, ToastService) {
        $scope.mode = 'create';
        $scope.event = null;
        $scope.loadingRef = true;
        attachFormHelpers($scope, ToastService, ApiService);
        $scope.event = $scope.blankEvent();

        ApiService.getCategories().then(function (res) { $scope.categories = res.data; });
        ApiService.getOrganisations().then(function (res) {
          $scope.organisations = res.data;
          if (res.data.length && !$scope.event.org_id) $scope.event.org_id = res.data[0].org_id;
        }).finally(function () { $scope.loadingRef = false; });

        $scope.save = function () {
          if (!$scope.validateAndReport($scope.event)) return;
          $scope.saving = true;

          ApiService.createEvent($scope.buildPayload($scope.event)).then(function (res) {
            ToastService.success(res.message);
            $window.location.hash = '#!/events/' + res.data.event_id;
          }).catch(function (err) {
            const handled = ApiService.errorOf(err);
            $scope.submitError = handled.message;
            if (handled.errors) $scope.fieldErrors = handled.errors;
          }).finally(function () {
            $scope.saving = false;
          });
        };

        $scope.resetForm = function () {
          $scope.event = $scope.blankEvent();
          $scope.fieldErrors = {};
          $scope.submitError = null;
        };
      }]);

  /* ------------------------------------------------------------------------ */
  /* EDIT                                                                     */
  /* ------------------------------------------------------------------------ */
  angular.module('adminApp').controller('AdminEventEditController',
    ['$scope', '$routeParams', '$window', 'ApiService', 'ToastService', 'Fmt',
      function ($scope, $routeParams, $window, ApiService, ToastService, Fmt) {
        $scope.mode = 'edit';
        $scope.fmt = Fmt;
        $scope.loading = true;
        $scope.event = null;
        $scope.registrations = [];
        attachFormHelpers($scope, ToastService, ApiService);

        ApiService.getCategories().then(function (res) { $scope.categories = res.data; });
        ApiService.getOrganisations().then(function (res) { $scope.organisations = res.data; });

        /**
         * The edit page also shows the registrations of the event so staff can
         * judge the impact of a change before saving (brief requirement).
         */
        function load(id) {
          $scope.loading = true;
          ApiService.getEvent(id).then(function (res) {
            const data = res.data;
            $scope.registrations = data.registrations || [];

            $scope.event = {
              event_id: data.event_id,
              event_name: data.event_name,
              description: data.description,
              eventDate: Fmt.toDate(data.event_date),
              location: data.location,
              org_id: data.org_id,
              category_id: data.category_id,
              ticket_price: Number(data.ticket_price),
              capacity: Number(data.capacity),
              charity_goal: Number(data.charity_goal),
              current_progress: Number(data.current_progress),
              latitude: data.latitude,
              longitude: data.longitude,
              is_suspended: !!data.is_suspended,
              event_image_url: data.event_image_url || ''
            };
            $scope.ticketsSold = data.tickets_sold;
            $scope.seatsRemaining = data.seats_remaining;
            $scope.loadError = null;
          }).catch(function (err) {
            $scope.loadError = ApiService.errorOf(err).message;
          }).finally(function () {
            $scope.loading = false;
          });
        }

        load($routeParams.id);

        $scope.save = function () {
          if (!$scope.validateAndReport($scope.event)) return;

          // Extra guard matching the API rule, so the staff member sees the
          // problem before the request is even sent.
          if ($scope.ticketsSold && Number($scope.event.capacity) < $scope.ticketsSold) {
            $scope.fieldErrors.capacity =
              'Capacity cannot be lower than the ' + $scope.ticketsSold + ' ticket(s) already sold.';
            $scope.submitError = 'Please fix the highlighted fields before saving.';
            return;
          }

          $scope.saving = true;
          ApiService.updateEvent($scope.event.event_id, $scope.buildPayload($scope.event))
            .then(function (res) {
              ToastService.success(res.message);
              load($scope.event.event_id);
            })
            .catch(function (err) {
              const handled = ApiService.errorOf(err);
              $scope.submitError = handled.message;
              if (handled.errors) $scope.fieldErrors = handled.errors;
            })
            .finally(function () {
              $scope.saving = false;
            });
        };

        $scope.reload = function () { load($routeParams.id); };

        $scope.goToList = function () { $window.location.hash = '#!/events'; };
      }]);
})();
