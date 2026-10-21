/**
 * app.config.js
 * ----------------------------------------------------------------------------
 * AngularJS 1.8 application bootstrap.
 *
 * Design notes
 *  - `charityApp` is a single AngularJS application shared by every page of
 *    the client site. Pages are separate HTML files that all load this file,
 *    which keeps the "multiple HTML pages" requirement of the brief while
 *    still using AngularJS controllers, services, directives and routing.
 *  - ui.router is used for the two in-app sub-views (event list, weather) so
 *    deep links such as index.html#!/weather work from any page.
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  angular
    .module('charityApp', ['ngRoute'])

    /** Base URL of the Express API (same origin for dev and production). */
    .constant('API_CONFIG', {
      baseUrl: (function () {
        // Both the local Express dev server and the cPanel deployment serve
        // the pages and the API from the same origin, so the relative path is
        // always correct. A hard-coded absolute URL here would break the
        // deployment, where the origin is the cPanel domain instead of
        // localhost:3000. window.CHARITY_API_BASE remains as an escape hatch
        // for cross-origin testing.
        const configured = window.CHARITY_API_BASE;
        if (configured) return configured;
        return '/api';
      })()
    })

    /** Route table. Every route is a template in src/views (no build step). */
    .config(['$routeProvider', '$locationProvider', '$httpProvider',
      function ($routeProvider, $locationProvider, $httpProvider) {
        $httpProvider.defaults.timeout = 20000;

        /*
         * The pages read ?id= from the query string (event-detail.html?id=1,
         * register.html?id=1). ngRoute normally clears the search parameters
         * during a route change, which would erase that id before the
         * controller reads it, so query-string reloads are disabled here.
         */
        $locationProvider.html5Mode(false);

        $routeProvider
          .when('/', { redirectTo: '/events' })
          .when('/events', {
            templateUrl: 'src/views/event-list.html',
            controller: 'RouteEventListController',
            reloadOnSearch: false
          })
          .when('/weather', {
            templateUrl: 'src/views/weather-forecast.html',
            controller: 'RouteWeatherController',
            reloadOnSearch: false
          })
          .otherwise({ redirectTo: '/events' });
      }])

    /**
     * Application-wide formatters: dates, currency and progress helpers that
     * are used by both the client and the admin single-page applications.
     */
    .run(['$rootScope', function ($rootScope) {
      $rootScope.siteName = 'Community Hope Foundation';
      $rootScope.tagline = 'Charity events that bring people together';
    }]);

  /* ------------------------------------------------------------------------ */
  /* Shared utility service                                                  */
  /* ------------------------------------------------------------------------ */
  angular.module('charityApp').factory('UtilService', [function () {
    return {
      /** "2026-11-15 08:00:00" -> Date object (local time, no TZ surprises). */
      toDate: function (value) {
        if (!value) return null;
        return new Date(String(value).replace(' ', 'T'));
      },

      /** "15 Nov 2026" */
      formatDate: function (value) {
        const d = this.toDate(value);
        if (!d || isNaN(d.getTime())) return '—';
        return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
      },

      /** "15 Nov 2026, 08:00 am" */
      formatDateTime: function (value) {
        const d = this.toDate(value);
        if (!d || isNaN(d.getTime())) return '—';
        return d.toLocaleString('en-AU', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });
      },

      /** "$1,250.00" */
      money: function (value) {
        const n = Number(value);
        if (!isFinite(n)) return '$0.00';
        return '$' + n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      },

      /** Whole-dollars currency for compact figures: "$12,500" */
      moneyShort: function (value) {
        const n = Number(value);
        if (!isFinite(n)) return '$0';
        return '$' + Math.round(n).toLocaleString('en-AU');
      },

      /** True when the event date is before "now". */
      isPast: function (event) {
        const d = this.toDate(event && event.event_date);
        return !!d && d.getTime() < Date.now();
      },

      /** "in 12 days" / "3 days ago" / "today" */
      relative: function (value) {
        const d = this.toDate(value);
        if (!d) return '';
        const diff = Math.round((d.getTime() - Date.now()) / 86400000);
        if (diff === 0) return 'today';
        if (diff > 0) return `in ${diff} day${diff === 1 ? '' : 's'}`;
        return `${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} ago`;
      },

      /** Escape HTML so user-supplied text cannot break the markup. */
      escape: function (text) {
        return String(text === null || text === undefined ? '' : text)
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      },

      /** Initials for the avatar circle: "Amelia Nguyen" -> "AN". */
      initials: function (name) {
        return String(name || '?').trim().split(/\s+/).slice(0, 2)
          .map(function (p) { return p.charAt(0).toUpperCase(); }).join('');
      },

      /**
       * Read a value from the real browser query string.
       * The standard URLSearchParams API is used instead of $location because
       * ngRoute rewrites $location.search() during navigation while the physical
       * URL (window.location.search) still holds the original parameters.
       */
      queryParam: function (name) {
        try {
          return new URLSearchParams(window.location.search).get(name);
        } catch (e) {
          return null;
        }
      }
    };
  }]);
})();
