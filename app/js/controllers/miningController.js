angular.module('app').controller('miningController', function($scope, $timeout, $interval, jouleService, walletsList, invokeSignature, $state) {

    $scope.pageContent = {
        wallets: [{
            type: 'infura',
            wallet: 'Other wallet'
        }]
    };

    $scope.contractsInfo = {};
    $scope.transactionFormData = {};
    $scope.invokeSignature = invokeSignature;
    $scope.contractAddress = jouleService.getContractAddress();
    /* Адреса всех кошельков всех клиентов */
    var setWalletBalance = function() {
        if ($scope.selectedWallet.type === 'infura') return;
        jouleService.getWalletBalance($scope.selectedWallet.wallet).then(function(result) {
            $scope.selectedWallet.balance = Web3.utils.fromWei(result.balance, 'ether');
        });
    };
    $scope.pageContent.wallets = $scope.pageContent.wallets.concat(walletsList);
    var currentWallet = jouleService.getActiveWallet();
    if (currentWallet) {
        $scope.selectedWallet = currentWallet;
    } else {
        $scope.selectedWallet = $scope.pageContent.wallets[0];
    }

    var checkJouleContracts = function(contractsList) {
        $scope.contractsInfo.data = contractsList;
        checkReadyContracts();
    };

    var iniJouleContractsList = function() {
        jouleService.setProviderForWallet($scope.selectedWallet);
        jouleService.getContractsList(15).then(checkJouleContracts);
    };
    iniJouleContractsList();


    $scope.onSelectWallet = function() {
        iniJouleContractsList();
        setWalletBalance();
    };

    $scope.isReadyContract = false;
    var readyContracts, soonReadyContracts, soonReadyTimer;

    var readyContractCheckReward = function(contract) {
        $scope.transactionFormData.gas =
            $scope.transactionFormData.gas ? Math.max($scope.transactionFormData.gas, contract.invokeGas) : contract.invokeGas;
        $scope.transactionFormData.gasPrice =
            $scope.transactionFormData.gasPrice ? Math.min($scope.transactionFormData.gasPrice, contract.gasPrice) : contract.gasPrice;
        contract.isReady = true;
        $scope.recommendedGas = $scope.transactionFormData.gas;

    };

    var checkSoonReadyTimer = function() {
        if (!soonReadyContracts.length) {
            $interval.cancel(soonReadyTimer);
            return;
        }
        $scope.nowTime = (new Date()).getTime();
        soonReadyContracts.map(function(contract) {
            if ((contract.timestamp <= $scope.nowTime) && !contract.isReady) {
                contract.soonReady = false;
                readyContracts.push(contract);
                readyContractCheckReward(contract);
            } else {
                var rightTime = Math.floor((contract.timestamp - $scope.nowTime) / 1000);
                var hours = Math.floor(rightTime / 3600);
                hours = ((hours < 10) ? '0': '') + hours;
                var minutes = Math.floor((rightTime % 3600) / 60);
                minutes = ((minutes < 10) ? '0': '') + minutes;
                var seconds = rightTime % 60;
                seconds = ((seconds < 10) ? '0': '') + seconds;
                contract.rightTime = {
                    hours: hours,
                    minutes: minutes,
                    seconds: seconds
                };
            }
        });
        $scope.isReadyContract = !!readyContracts.length;
        soonReadyContracts = soonReadyContracts.filter(function(contract) {
            return contract.soonReady;
        });
    };

    var checkReadyContracts = function() {
        var now = (new Date()).getTime();

        readyContracts = $scope.contractsInfo.data.filter(function(contract) {
            return (contract.timestamp <= (new Date()).getTime())
        });
        readyContracts.map(readyContractCheckReward);
        $scope.isReadyContract = !!readyContracts.length;


        soonReadyContracts = $scope.contractsInfo.data.filter(function(contract) {
            return (readyContracts.indexOf(contract) === -1) && (contract.timestamp <= (now + 24 * 3600000));
        });

        soonReadyContracts.map(function(contract) {
            contract.soonReady = true;
        });

        $scope.fieldsMinValues = {
            gasLimit: $scope.transactionFormData.gas,
            gasPrice: $scope.transactionFormData.gasPrice
        };

        checkSoonReadyTimer();
        soonReadyTimer ? $interval.cancel(soonReadyTimer) : false;
        soonReadyTimer = $interval(checkSoonReadyTimer, 250);
    };

    $scope.sendTransaction = function() {
        jouleService.invoke({
            gas: $scope.transactionFormData.gas,
            gasPrice: $scope.transactionFormData.gasPrice,
            from: $scope.selectedWallet.wallet
        }).then(function(response) {
            $scope.transactionInProgress = true;
            var transactionHash  = response.result;
            jouleService.checkTransaction(response.result).then(function(response) {
                $scope.transactionInProgress = false;
                var result = response.result;
                var status = Web3.utils.hexToNumber(result.status);
                switch (status) {
                    case 0:
                        $scope.transactionAddress = transactionHash;
                        $scope.transactionStatusError = true;
                        break;
                    case 1:
                        $state.transitionTo($state.current, {}, {
                            reload: true,
                            inherit: false,
                            notify: true
                        });
                        break;
                }
            });
        });
    };

    $scope.$on('$destroy', function() {
        soonReadyTimer ? $interval.cancel(soonReadyTimer) : false;
    });


});
