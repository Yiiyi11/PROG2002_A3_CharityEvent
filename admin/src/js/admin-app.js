/**
 * admin-app.js
 * ----------------------------------------------------------------------------
 * Root module, routing and shared services for the ADMIN-side website.
 * This is a second, independent AngularJS application (module `adminApp`) that
 * talks to the same Express API as the client site.
 *
 * Pages
 *   /admin/#/dashboard     KPI overview and recent activity
 *   /admin/#/events        list of every event regardless of status + delete
 *   /admin/#/events/new    create a new charity event
 *   /admin/#/events/:id    edit an event and inspect its registrations
 *   /admin/#/categories    manage the categories table
 *   /admin/#/registrations browse and remove registrations
 *   /admin/#/weather       weather diagnostics for every venue
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  angular.module('adminApp', ['ngRoute'])

    .constant('API_CONFIG', {
      baseUrl: (function () {
        if (window.CHARITY_API_BASE) return window.CHARITY_API_BASE;
        const configured = localStorage.getItem('charityApiBase');
        if (configured) return configured;
        // Served by Express under /admin/ -> the API lives on the same origin.
        return '/api';
      })()
    })

    .config(['$routeProvider', '$locationProvider', '$httpProvider',
      function ($routeProvider, $locationProvider, $httpProvider) {
        $httpProvider.defaults.timeout = 20000;

        $routeProvider
          .when('/dashboard', {
            templateUrl: 'src/views/dashboard.html',
            controller: 'DashboardController',
            pageTitle: 'Dashboard'
          })
          .when('/events', {
            templateUrl: 'src/views/event-list.html',
            controller: 'AdminEventListController',
            pageTitle: 'Manage events'
          })
          .when('/events/new', {
            templateUrl: 'src/views/event-form.html',
            controller: 'AdminEventCreateController',
            pageTitle: 'Create event'
          })
          .when('/events/:id', {
            templateUrl: 'src/views/event-form.html',
            controller: 'AdminEventEditController',
            pageTitle: 'Edit event'
          })
          .when('/categories', {
            templateUrl: 'src/views/categories.html',
            controller: 'AdminCategoryController',
            pageTitle: 'Categories'
          })
          .when('/registrations', {
            templateUrl: 'src/views/registrations.html',
            controller: 'AdminRegistrationController',
            pageTitle: 'Registrations'
          })
          .when('/weather', {
            templateUrl: 'src/views/weather.html',
            controller: 'AdminWeatherController',
            pageTitle: 'Weather diagnostics'
          })
          .otherwise({ redirectTo: '/dashboard' });
      }])

    .run(['$rootScope', '$location', function ($rootScope, $location) {
      $rootScope.pageTitle = 'Admin';
      $rootScope.$on('$routeChangeSuccess', function (e, current) {
        $rootScope.pageTitle = (current && current.pageTitle) || 'Admin';
        window.scrollTo(0, 0);
      });
      $rootScope.isRoute = function (path) {
        return $location.path().indexOf(path) === 0;
      };
    }]);

  /* ------------------------------------------------------------------------ */
  /* Shared API service for the admin site                                    */
  /* ------------------------------------------------------------------------ */
  angular.module('adminApp').factory('ApiService', ['$http', 'API_CONFIG',
    function ($http, API_CONFIG) {
      const url = API_CONFIG.baseUrl;
      const unwrap = function (r) { return r.data; };

      return {
        getStats: function () { return $http.get(url + '/stats').then(unwrap); },

        getEvents: function (status) {
          return $http.get(url + '/events', { params: status ? { status: status } : {} }).then(unwrap);
        },
        getEvent: function (id) { return $http.get(url + '/events/' + id).then(unwrap); },
        createEvent: function (payload) { return $http.post(url + '/events', payload).then(unwrap); },
        updateEvent: function (id, payload) { return $http.put(url + '/events/' + id, payload).then(unwrap); },
        deleteEvent: function (id) { return $http.delete(url + '/events/' + id).then(unwrap); },

        getCategories: function () { return $http.get(url + '/categories').then(unwrap); },
        createCategory: function (payload) { return $http.post(url + '/categories', payload).then(unwrap); },
        updateCategory: function (id, payload) { return $http.put(url + '/categories/' + id, payload).then(unwrap); },
        deleteCategory: function (id) { return $http.delete(url + '/categories/' + id).then(unwrap); },

        getOrganisations: function () { return $http.get(url + '/organisations').then(unwrap); },

        getRegistrations: function (eventId) {
          return $http.get(url + '/registrations', { params: eventId ? { event_id: eventId } : {} }).then(unwrap);
        },
        deleteRegistration: function (id) { return $http.delete(url + '/registrations/' + id).then(unwrap); },

        errorOf: function (err) {
          const body = (err && err.data) || {};
          return {
            status: err ? err.status : 0,
            message: body.message || 'The server could not be reached. Please try again.',
            errors: body.errors || null
          };
        }
      };
    }]);

  /* ------------------------------------------------------------------------ */
  /* Toast notifications (admin feedback)                                      */
  /* ------------------------------------------------------------------------ */
  angular.module('adminApp').factory('ToastService', ['$rootScope', '$timeout',
    function ($rootScope, $timeout) {
      $rootScope.toasts = [];

      function push(text, type) {
        const toast = { text: text, type: type || 'success' };
        $rootScope.toasts.push(toast);
        $timeout(function () {
          const index = $rootScope.toasts.indexOf(toast);
          if (index > -1) $rootScope.toasts.splice(index, 1);
        }, 5000);
      }

      return {
        success: function (text) { push(text, 'success'); },
        error: function (text) { push(text, 'error'); },
        dismiss: function (toast) {
          const index = $rootScope.toasts.indexOf(toast);
          if (index > -1) $rootScope.toasts.splice(index, 1);
        }
      };
    }]);

  /* ------------------------------------------------------------------------ */
  /* Shared formatting helpers                                                 */
  /* ------------------------------------------------------------------------ */
  angular.module('adminApp').factory('Fmt', [function () {
    return {
      toDate: function (v) { return v ? new Date(String(v).replace(' ', 'T')) : null; },
      date: function (v) {
        const d = this.toDate(v);
        return d ? d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
      },
      dateTime: function (v) {
        const d = this.toDate(v);
        return d ? d.toLocaleString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
      },
      dateInput: function (v) {
        // <input type="datetime-local"> needs "YYYY-MM-DDTHH:mm"
        if (!v) return '';
        return String(v).replace(' ', 'T').slice(0, 16);
      },
      money: function (v) {
        const n = Number(v);
        return '$' + (isFinite(n) ? n : 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      },
      moneyShort: function (v) {
        const n = Number(v);
        return '$' + Math.round(isFinite(n) ? n : 0).toLocaleString('en-AU');
      },
      initials: function (name) {
        return String(name || '?').trim().split(/\s+/).slice(0, 2)
          .map(function (p) { return p.charAt(0).toUpperCase(); }).join('');
      }
    };
  }]);
})();
