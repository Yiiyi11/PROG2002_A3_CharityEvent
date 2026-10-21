/**
 * services/event.service.js
 * ----------------------------------------------------------------------------
 * Thin AngularJS wrapper around the Express API. Every method returns a
 * promise ($http), so the controllers only deal with .then() success and
 * error handlers. This file is the single place that knows the API URLs.
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  angular.module('charityApp').factory('EventService', ['$http', 'API_CONFIG',
    function ($http, API_CONFIG) {
      const url = API_CONFIG.baseUrl;

      /** Unwrap the common { success, data } envelope. */
      function unwrap(response) {
        return response.data;
      }

      /** Turn an HTTP failure into a friendly message for the UI. */
      function handleError(error) {
        const body = (error && error.data) || {};
        return {
          status: error ? error.status : 0,
          message: body.message || 'Unable to reach the server. Please try again.',
          errors: body.errors || null
        };
      }

      return {
        /** GET /api/events/home */
        getHomeEvents: function () {
          return $http.get(url + '/events/home').then(unwrap);
        },

        /** GET /api/events */
        getAllEvents: function (status) {
          return $http.get(url + '/events', { params: status ? { status: status } : {} }).then(unwrap);
        },

        /** GET /api/events/search */
        searchEvents: function (filters) {
          const params = {};
          Object.keys(filters || {}).forEach(function (key) {
            const value = filters[key];
            if (value !== null && value !== undefined && String(value).trim() !== '') {
              params[key] = value;
            }
          });
          return $http.get(url + '/events/search', { params: params }).then(unwrap);
        },

        /** GET /api/events/:id  (event + registrations, newest first) */
        getEventById: function (eventId) {
          return $http.get(url + '/events/' + eventId).then(unwrap);
        },

        /** POST /api/events */
        createEvent: function (payload) {
          return $http.post(url + '/events', payload).then(unwrap);
        },

        /** PUT /api/events/:id */
        updateEvent: function (eventId, payload) {
          return $http.put(url + '/events/' + eventId, payload).then(unwrap);
        },

        /** DELETE /api/events/:id */
        deleteEvent: function (eventId) {
          return $http.delete(url + '/events/' + eventId).then(unwrap);
        },

        /** POST /api/registrations */
        createRegistration: function (payload) {
          return $http.post(url + '/registrations', payload).then(unwrap);
        },

        /** GET /api/events/:id/registrations */
        getRegistrations: function (eventId) {
          return $http.get(url + '/events/' + eventId + '/registrations').then(unwrap);
        },

        /** GET /api/registrations */
        getAllRegistrations: function (eventId) {
          return $http.get(url + '/registrations', {
            params: eventId ? { event_id: eventId } : {}
          }).then(unwrap);
        },

        /** DELETE /api/registrations/:id */
        deleteRegistration: function (registrationId) {
          return $http.delete(url + '/registrations/' + registrationId).then(unwrap);
        },

        /** GET /api/categories */
        getCategories: function () {
          return $http.get(url + '/categories').then(unwrap);
        },

        /** GET /api/organisations */
        getOrganisations: function () {
          return $http.get(url + '/organisations').then(unwrap);
        },

        /** GET /api/stats */
        getStats: function () {
          return $http.get(url + '/stats').then(unwrap);
        },

        handleError: handleError
      };
    }]);
})();
