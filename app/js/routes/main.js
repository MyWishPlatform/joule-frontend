'use strict';
var module = angular.module('app');
module.config(function($stateProvider, $locationProvider, $urlRouterProvider) {

    var templatesPath = '/templates/pages/';
    $stateProvider.state('main', {
        abstract: true,
        template: '<div ui-view></div>'
    }).state('main.invoke', {
        url: '/',
        templateUrl: templatesPath + 'mining.html',
        resolve: {
            walletsList: function(jouleService) {
                return jouleService.getAccounts();
            },
            activeWallet: function(walletsList, jouleService) {
                var currentWallet = jouleService.getActiveWallet();
                if (!currentWallet || (currentWallet.type === 'infura')) return;
                return jouleService.getWalletBalance(currentWallet.wallet).then(function(result) {
                    currentWallet.balance = Web3.utils.fromWei(result.balance, 'ether');
                });
            },
            invokeSignature: function(jouleService) {
                return jouleService.getSignature('invoke');
            }
        },
        controller: 'miningController'
    }).state('main.registration', {
        url: '/registration',
        templateUrl: templatesPath + 'registration.html',
        resolve: {
            walletsList: function(jouleService) {
                return jouleService.getAccounts();
            },
            activeWallet: function(walletsList, jouleService) {
                var currentWallet = jouleService.getActiveWallet();
                if (!currentWallet || (currentWallet.type === 'infura')) return;
                return jouleService.getWalletBalance(currentWallet.wallet).then(function(result) {
                    currentWallet.balance = Web3.utils.fromWei(result.balance, 'ether');
                });
            }
        },
        controller: 'registrationController'
    });

    $locationProvider.html5Mode({
        enabled: true,
        requireBase: false
    });
    $urlRouterProvider.otherwise('/');
});
