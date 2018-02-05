angular.module('app').controller('registeredController', function($scope, walletsList, jouleService, JOULE_ABI) {

    $scope.pageContent = {
        wallets: [{
            type: 'infura',
            wallet: 'Other wallet'
        }]
    };

    /* Адреса всех кошельков всех клиентов */

    $scope.onSelectWallet = function() {
        jouleService.setProviderForWallet($scope.selectedWallet);
        getRegisteredContracts();
    };

    $scope.pageContent.wallets = $scope.pageContent.wallets.concat(walletsList);
    var currentWallet = jouleService.getActiveWallet();
    if (currentWallet) {
        $scope.selectedWallet = currentWallet;
    } else {
        $scope.selectedWallet = $scope.pageContent.wallets[0];
    }

    jouleService.setProviderForWallet($scope.selectedWallet);



    var getRegisteredContracts = function() {
        jouleService.getRegisteredContracts($scope.selectedWallet.wallet).then(function(response) {
            console.log(response);
            if (response.error) {
                $scope.contractsList = [];
                return;
            }
            response.result.map(function(transaction) {
                jouleService.getBlock(transaction.blockHash).then(function(blockHashInfo) {
                    transaction.blockHashInfo = blockHashInfo;
                });
            });
            $scope.contractsList = response.result;
        });
    };
    getRegisteredContracts();

    $scope.unregisterContract = function(contract) {
        jouleService.unregisterContract(contract);
        console.log(contract);
    };

});