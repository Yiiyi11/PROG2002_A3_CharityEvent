/**
 * admin-category.controller.js
 * ----------------------------------------------------------------------------
 * Categories management (list + inline create + inline edit + delete).
 * Deleting a category that is still referenced by an event is refused by the
 * API with HTTP 409 and the reason is displayed to the staff member.
 * ----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  angular.module('adminApp').controller('AdminCategoryController', ['$scope', 'ApiService', 'ToastService',
    function ($scope, ApiService, ToastService) {
      $scope.loading = true;
      $scope.error = null;
      $scope.categories = [];

      $scope.newCategory = { category_name: '', description: '' };
      $scope.editing = null;
      $scope.formError = null;
      $scope.fieldErrors = {};

      function load() {
        $scope.loading = true;
        ApiService.getCategories().then(function (res) {
          $scope.categories = res.data;
          $scope.error = null;
        }).catch(function (err) {
          $scope.error = ApiService.errorOf(err).message;
        }).finally(function () {
          $scope.loading = false;
        });
      }

      function validate(cat) {
        const errors = {};
        if (!cat.category_name || cat.category_name.trim().length < 2) {
          errors.category_name = 'Category name is required (at least 2 characters).';
        }
        if (cat.description && cat.description.length > 255) {
          errors.description = 'Description must be 255 characters or fewer.';
        }
        return errors;
      }

      $scope.create = function () {
        $scope.fieldErrors = validate($scope.newCategory);
        $scope.formError = null;
        if (Object.keys($scope.fieldErrors).length) return;

        $scope.saving = true;
        ApiService.createCategory($scope.newCategory).then(function (res) {
          ToastService.success(res.message);
          $scope.newCategory = { category_name: '', description: '' };
          load();
        }).catch(function (err) {
          const handled = ApiService.errorOf(err);
          $scope.formError = handled.message;
          if (handled.errors) $scope.fieldErrors = handled.errors;
        }).finally(function () {
          $scope.saving = false;
        });
      };

      $scope.startEdit = function (category) {
        $scope.editing = angular.copy(category);
        $scope.fieldErrors = {};
        $scope.formError = null;
      };

      $scope.cancelEdit = function () {
        $scope.editing = null;
      };

      $scope.update = function () {
        $scope.fieldErrors = validate($scope.editing);
        if (Object.keys($scope.fieldErrors).length) return;

        ApiService.updateCategory($scope.editing.category_id, $scope.editing).then(function (res) {
          ToastService.success(res.message);
          $scope.editing = null;
          load();
        }).catch(function (err) {
          const handled = ApiService.errorOf(err);
          $scope.formError = handled.message;
          if (handled.errors) $scope.fieldErrors = handled.errors;
        });
      };

      $scope.remove = function (category) {
        if (!window.confirm('Delete the category "' + category.category_name + '"?')) return;

        ApiService.deleteCategory(category.category_id).then(function (res) {
          ToastService.success(res.message);
          load();
        }).catch(function (err) {
          ToastService.error(ApiService.errorOf(err).message);
        });
      };

      load();
    }]);
})();
