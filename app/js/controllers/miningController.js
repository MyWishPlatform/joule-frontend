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
        checkNextEvents();
    };

    var iniJouleContractsList = function() {
        jouleService.setProviderForWallet($scope.selectedWallet);
        jouleService.getBlockNumber().then(function(block) {
            lastTransactionBlock = block;
            jouleService.getContractsList(15).then(checkJouleContracts);
        });

    };
    iniJouleContractsList();


    $scope.onSelectWallet = function() {
        iniJouleContractsList();
        setWalletBalance();
    };

    $scope.isReadyContract = false;
    var readyContracts, soonReadyContracts, soonReadyTimer;

    $scope.checkReward = function() {
        if (!($scope.transactionFormData.gas && $scope.transactionFormData.gasPrice)) return;
        var rewardAmount = new BigNumber('0'), usedGas = new BigNumber('0'), index = 0;

        var allGas = new BigNumber($scope.transactionFormData.gas).times(
            Web3.utils.toWei(new BigNumber($scope.transactionFormData.gasPrice).toString(10), 'gwei')
        );

        while (index < readyContracts.length) {
            var invokeTxGas = new BigNumber(readyContracts[index].invokeGas).times($scope.transactionFormData.gas);
            usedGas = usedGas.plus(invokeTxGas);
            if (allGas.minus(usedGas) >= 0) {
                rewardAmount = rewardAmount.plus(Web3.utils.toWei(readyContracts[index].reward, 'ether'));
            } else {
                break;
            }
            index++;
        }
        $scope.isRewardAmount = rewardAmount > 0;
        var supposedAmount = rewardAmount.minus(allGas).toString(10);
        $scope.supposedAmount = Web3.utils.fromWei(supposedAmount, 'ether');
    };

    var readyContractCheckReward = function(contract) {

        $scope.minGasLimit =
            $scope.minGasLimit ? Math.min($scope.minGasLimit, contract.invokeGas) : contract.invokeGas;

        $scope.transactionFormData.gas =
            ($scope.transactionFormData.gas || 0) + contract.invokeGas * 1;
        $scope.transactionFormData.gasPrice =
            $scope.transactionFormData.gasPrice ? Math.min($scope.transactionFormData.gasPrice, contract.gasPrice) : contract.gasPrice;

        contract.isReady = true;
        $scope.recommendedGas = $scope.transactionFormData.gas;

    };

    var updateRegistrationsList = function(registration, count) {
        console.log(new Date(registration.timestamp));
        var now = (new Date()).getTime();
        var index = $scope.contractsInfo.data.indexOf(registration);
        jouleService.getNext(count, registration).then(function(response) {

            console.log(new Date(response.result[0].timestamp));

            var newSoonReadyContracts = response.result.filter(function(contract) {
                return (readyContracts.indexOf(contract) === -1) && (contract.timestamp <= (now + 24 * 3600000));
            });

            newSoonReadyContracts.map(function(contract) {
                contract.soonReady = true;
            });

            soonReadyContracts = soonReadyContracts.concat(newSoonReadyContracts);

            var part1 = $scope.contractsInfo.data.slice(0, index + 1);
            var part2 = $scope.contractsInfo.data.slice(index + 1);
            
            console.log(new Date(response.result[0].timestamp));

            $scope.contractsInfo.data = part1.concat(response.result, part2);
        });
    };

    var checkRegistrationsList = function(eventsList) {
        console.log(eventsList);
        var registeredList = eventsList.filter(function(event) {
            return event.event === 'Registered';
        });
        var invokedList = eventsList.filter(function(event) {
            return event.event === 'Invoked';
        });

        invokedList = invokedList.filter(function(event) {
            return event.returnValues._status;
        });

        $scope.contractsInfo.data = $scope.contractsInfo.data.filter(function(registration) {
            return !invokedList.filter(function(event) {
                return (event.returnValues._timestamp * 1000 === registration.timestamp) && (event.returnValues._address === registration.address)
            }).length;
        });

        var newRegisteredOnBegin = registeredList.filter(function(event) {
            return event.returnValues._timestamp * 1000 < $scope.contractsInfo.data[0].timestamp;
        });

        registeredList = registeredList.filter(function(event) {
            return newRegisteredOnBegin.indexOf(event) === -1;
        });

        if (newRegisteredOnBegin.length) {
            jouleService.getContractsList(newRegisteredOnBegin.length).then(function(response) {
                $scope.contractsInfo.data = response.result.concat($scope.contractsInfo.data);
            });
        }

        if (!registeredList.length) return;

        var index = 0;

        while (registeredList.length && (index < $scope.contractsInfo.data.length)) {
            if (!registeredList.length) return;
            var getNewRegistrations = registeredList.filter(function(registration) {
                return registration.returnValues._timestamp * 1000 < $scope.contractsInfo.data[index].timestamp;
            });
            if (getNewRegistrations.length) {
                registeredList = registeredList.filter(function(registration) {
                    return getNewRegistrations.indexOf(registration) === -1;
                });
                if (index) {
                    updateRegistrationsList($scope.contractsInfo.data[index - 1], getNewRegistrations.length);
                }
            }
            index++;
        }

        // if (registeredList.length) {
        //     updateRegistrationsList($scope.contractsInfo.data[$scope.contractsInfo.data.length - 1], registeredList.length, true);
        // }
    };

    var lastTransactionBlock;

    var checkEventsInterval;
    var checkNextEvents = function() {
        checkEventsInterval = $timeout(function() {
            jouleService.getAllEvents(lastTransactionBlock).then(function(response) {
                checkNextEvents();
                if (response.error || !response.result.length || !checkEventsInterval) return;
                lastTransactionBlock = response.result[response.result.length - 1]['blockNumber'];
                checkRegistrationsList(response.result);
            });
        }, 10000);
    };

    var checkSoonReadyTimer = function() {
        if (!soonReadyContracts.length) {
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
        $scope.transactionFormData.gas = 0;
        $scope.transactionFormData.gasPrice = 0;
        readyContracts.map(readyContractCheckReward);
        $scope.isReadyContract = !!readyContracts.length;


        soonReadyContracts = $scope.contractsInfo.data.filter(function(contract) {
            return (readyContracts.indexOf(contract) === -1) && (contract.timestamp <= (now + 24 * 3600000));
        });

        soonReadyContracts.map(function(contract) {
            contract.soonReady = true;
        });

        $scope.checkReward();
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
                        // getLastEvents();
                        break;
                }
            });
        });
    };

    $scope.$on('$destroy', function() {
        soonReadyTimer ? $interval.cancel(soonReadyTimer) : false;
    });


});
