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

    var getUnregisteredContracts = function(contractsList, callback) {
        jouleService.getUnregisteredContracts($scope.selectedWallet.wallet).then(function(response) {
            if (response.error) {
                callback();
                return;
            }
            response.result.map(function(unregisteredTransaction) {
                var transactionFromList = contractsList.filter(function(transaction) {
                    return (transaction.returnValues._timestamp === unregisteredTransaction.returnValues._timestamp) && (transaction.returnValues._address === unregisteredTransaction.returnValues._address)
                })[0];
                if (transactionFromList) {
                    transactionFromList.unregistered = true;
                }
            });
            callback();
        });
    };

    var getRegisteredContracts = function() {
        jouleService.getRegisteredContracts($scope.selectedWallet.wallet).then(function(response) {
            if (response.error) {
                $scope.contractsList = [];
                return;
            }
            response.result.map(function(transaction) {
                jouleService.getBlock(transaction.blockHash).then(function(blockHashInfo) {
                    transaction.blockHashInfo = blockHashInfo;
                });
            });
            getUnregisteredContracts(response.result, function() {
                response.result.map(function(transaction) {
                    if ((!transaction.unregistered) && (transaction.returnValues._timestamp * 1000 < (new Date()).getTime())) {
                        transaction.expired = true;
                    }
                });
                $scope.contractsList = response.result;
            });
        });
    };
    getRegisteredContracts();

    $scope.unregisterContract = function(contract) {
        jouleService.unregisterContract(contract).then(function(response) {
            contract.transactionInProgress = true;
            $scope.transactionStatusError = false;
            if (response.error) {
                return;
            }
            jouleService.checkTransaction(response.result).then(function(response) {
                contract.transactionInProgress = false;
                var result = response.result;
                var status = Web3.utils.hexToNumber(result.status);
                switch (status) {
                    case 0:
                        $scope.transactionAddress = transactionHash;
                        $scope.transactionStatusError = true;
                        break;
                    case 1:
                        contract.unregistered = true;
                        break;
                }
            });
        });
    };

});