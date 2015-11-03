'use strict';

angular.module('lformsWidget')
  .controller('MainCtrl', function ($scope, $http, selectedFormData) {

      /**
       * Return the included template name in 'ng-include'
       * @returns {string}
       */
      $scope.getTemplateUrl = function () {

        return $scope.selectedTemplate;

      };

      $scope.$on('$viewContentLoaded', function () {
              console.log("in main.js, template compiled");
      });
      $scope.$on('$includeContentLoaded', function () {
              console.log("in main.js, includeContentLoaded");
      });


      /**
       * Update the form with data when the template included in 'ng-include'
       * is loaded. It happens after the template name is reset.
       * This function name appears in 'onload' attribute of 'ng-include'.
       *
       */
      $scope.updateFormData = function () {
        //      console.log("in main.js, updateFormData")
        selectedFormData.updateFormData();
      };

      /**
       * Reset the template name included in 'ng-include'
       * by listening on a broadcast event
       */
      $scope.$on('NewTemplate', function (event, panelData) {

        if (panelData) {
          switch (panelData.template) {
            case "panelTable":
            case "panelTableV":
            case "form-view-a":
              $scope.selectedTemplate = "views/partials/form-view-a.html";
              break;
            case "panelTableH":
            case "form-view-b":
              $scope.selectedTemplate = "views/partials/form-view-b.html";
              break;
            default:
              $scope.selectedTemplate = "views/partials/form-view-a.html";
          }
          selectedFormData.updateFormData();
        }

      });

      $scope.totalWatchers = function () {
        var watchers = ($scope.$$watchers) ? $scope.$$watchers.length : 0;
        var child = $scope.$$childHead;
        while (child) {
          watchers += (child.$$watchers) ? child.$$watchers.length : 0;
          child = child.$$nextSibling;
        }
        return watchers;
      }


      // get the total number of ng watchers on the page
      $scope.getTotalWatchers = function () {

        var root = jQuery(document.getElementsByTagName('body'));
        var watchers = 0;

        var f = function (element) {
          if (element.data().hasOwnProperty('$scope')) {
            watchers += (element.data().$scope.$$watchers || []).length;
          }

          angular.forEach(element.children(), function (childElement) {
            f(jQuery(childElement));
          });
        };

        f(root);

        return watchers;
      }
    });
