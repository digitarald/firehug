window.bootstrapApp = function(payload) {
  'use strict';

  // Call only once
  window.bootstrapApp = function() {};

  var app = angular.module('summit', ['ngRoute']);

  app.config(['$routeProvider', '$locationProvider',
    function($routeProvider, $locationProvider) {
      $routeProvider
        .when('/', {
          controller: 'HomeCtrl',
          controllerAs: 'home',
          templateUrl: '/partials/home.html'
        })
        .when('/login', {
          controller: 'LoginCtrl',
          controllerAs: 'login',
          templateUrl: '/partials/login.html'
        })
        .when('/logout', {
          controller: 'LogoutCtrl',
          controllerAs: 'logout',
          templateUrl: '/partials/logout.html'
        })
        .when('/schedule', {
          controller: 'ScheduleCtrl',
          controllerAs: 'schedule',
          templateUrl: '/partials/schedule.html'
        })
        .when('/around', {
          controller: 'AroundCtrl',
          controllerAs: 'around',
          templateUrl: '/partials/todo.html'
        })
        .when('/questions', {
          controller: 'QuestionsCtrl',
          controllerAs: 'questions',
          templateUrl: '/partials/todo.html'
        })
        .when('/dialog', {
          controller: 'DialogCtrl',
          controllerAs: 'dialog',
          templateUrl: '/partials/todo.html'
        })
        .otherwise({
          redirectTo: '/'
        });

      $locationProvider.html5Mode(false).hashPrefix('!');
    }
  ]);


  app.factory('persona', function($q, $rootScope, $http) {

    function load() {
      if (loading) {
        return loading.promise;
      }
      loading = $q.defer();

      // Include Persona if needed
      if (navigator.mozId) {
        navigator.id = navigator.mozId;
        loading.resolve();
      } else {
        $.getScript('https://login.persona.org/include.js', function() {
          loading.resolve();
        });
      }
      return loading.promise;
    }
    var loading = null;

    function verify(assertion) {
      var verifying = $q.defer();
      $http({
        url: '/verify',
        method: 'POST',
        data: {
          assertion: assertion
        }
      }).then(function(data) {
        verifying.resolve(data.profile);
      }, function(data, status) {
        verifying.reject(data.error);
      });
      return verifying.promise;
    }

    function start(email) {
      if (starting) {
        return starting.promise;
      }
      starting = $q.defer();

      load().then(function() {
        // Persona watch
        navigator.id.watch({
          loggedInUser: email || undefined, // trigger logout
          onlogin: function onLogin(assertion) {
            console.log('persona.onLogin', !!$rootScope.user, assertion);
            if ($rootScope.user) {
              return starting.resolve();
            }
            verify(assertion).then(function(user) {
              $rootScope.user = user;
              $rootScope.$broadcast('persona:login', user);
              starting.resolve();
            }, function() {
              starting.resolve();
            });
          },
          onlogout: function onLogout() {
            console.log('persona.onLogout', !!$rootScope.user);
            if (!$rootScope.user) {
              return starting.resolve();
            }
            $http({
              url: '/logout',
              method: 'POST'
            }).finally(function() {
              $rootScope.user = null;
              $rootScope.$broadcast('persona:logout');
              starting.resolve();
            });
          }
        });
        if (!email) {
          starting.resolve();
        }
      });
      return starting.promise;
    }
    var starting = null;

    function request() {
      load().then(function() {
        navigator.id.request({
          siteName: 'Mozilla Summit',
          backgroundColor: '#D7D3C8',
          termsOfService: 'https://www.mozilla.org/en-US/persona/terms-of-service/',
          privacyPolicy: 'https://www.mozilla.org/en-US/privacy/policies/websites/'
        });
      });
    }

    function logout() {
      console.log('persona.logout');
      start().then(function() {
        console.log('navigator.id.logout');
        navigator.id.logout();
      });
    }

    return {
      load: load,
      start: start,
      request: request,
      logout: logout
    };

  });

  app.controller('AppCtrl', ['$scope', 'persona', '$rootScope', '$location',
    function AppCtrl($scope, persona, $rootScope, $location) {
      if (payload.user) {
        $rootScope.user = payload.user;
        $rootScope.ready = true;
      } else {
        $scope.beforeLogin = $location.path();
        $location.path('/login');
      }

      $rootScope.$on('persona:login', function(user) {
        // TODO: Validate assertion
        $rootScope.user = user;
        localStorage.setItem('email', user.email);
        $location.path('/');
      });
      $rootScope.$on('persona:logout', function() {
        localStorage.removeItem('email');
        // Refresh page to reset all data
        location.href = '/#!/login';
      });

      // Watch login and redirect as needed
      $rootScope.$watch(function() {
        return $location.path();
      }, function(newValue) {
        if (!$rootScope.user && newValue != '/login') {
          $location.path('/login');
        }
        $rootScope.path = newValue;
      });

      // Remove splash screen
      $scope.message = 'Welcome';
    }
  ]);

  app.controller('LoginCtrl', ['$scope', '$rootScope', 'persona', '$location',
    function LoginCtrl($scope, $rootScope, persona, $location) {
      console.log('LoginCtrl');

      if ($rootScope.user) {
        return $location.path('/');
      }

      // Load persona
      var email = localStorage.getItem('email');

      persona.load().then(function() {
        return persona.start(email);
      }).then(function() {
        $rootScope.ready = true;
        // Persona loaded, check if it fired login before
        if ($rootScope.user) {
          // Persona provided a user
          console.log('LoginCtrl: Auto-login via persona');
          $location.path($scope.beforeLogin || '/');
        }
      });

      $scope.authenticate = function() {
        persona.request();
      };
    }
  ]);

  app.controller('LogoutCtrl', ['$scope', '$rootScope', 'persona',
    function LogoutCtrl($scope, $rootScope, persona) {
      if (!$rootScope.user) {
        return $location.path('/');
      }
      console.log('Logout', $rootScope.user.email);
      persona.logout();
    }
  ]);

  app.controller('HomeCtrl', ['$scope',
    function($scope) {
      console.log('Home');
    }
  ]);

  app.controller('ScheduleCtrl', ['$scope',
    function($scope) {
      console.log('Schedule');
    }
  ]);

  app.controller('AroundCtrl', ['$scope',
    function($scope) {
      console.log('Around');
    }
  ]);

  app.controller('DialogCtrl', ['$scope',
    function($scope) {
      console.log('Dialog');
    }
  ]);

  app.controller('QuestionsCtrl', ['$scope',
    function($scope) {
      console.log('Questions');
    }
  ]);

};