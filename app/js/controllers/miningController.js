angular.module('app').controller('miningController', function($scope, $timeout, $interval, jouleService, walletsList, invokeSignature, $state) {


    var getItemsLength = 15;

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
            jouleService.getContractsList(getItemsLength).then(checkJouleContracts);
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

        var allGas = new BigNumber($scope.transactionFormData.gas);

        while (index < readyContracts.length) {
            var invokeTxGas = new BigNumber(readyContracts[index].invokeGas);
            usedGas = usedGas.plus(invokeTxGas);

            if (allGas.minus(usedGas) >= 0) {
                rewardAmount = rewardAmount.plus(Web3.utils.toWei(readyContracts[index].reward, 'ether'));
            } else {
                break;
            }
            index++;
        }

        $scope.isRewardAmount = rewardAmount > 0;
        var supposedAmount = rewardAmount.minus(allGas.times(Web3.utils.toWei(String($scope.transactionFormData.gasPrice), 'gwei'))).toString(10);
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


    var checkContractsReady = function(newRegistrations) {
        var now = (new Date()).getTime();
        var newSoonReadyContracts = newRegistrations.filter(function(contract) {
            return (readyContracts.indexOf(contract) === -1) && (contract.timestamp <= (now + 24 * 3600000));
        });
        newSoonReadyContracts.map(function(contract) {
            contract.soonReady = true;
            checkSoonReadyContract(contract);
        });
        soonReadyContracts = soonReadyContracts.concat(newSoonReadyContracts);
    };


    var updateRegistrationsList = function(registration, count) {
        var index = $scope.contractsInfo.data.indexOf(registration);
        jouleService.getNext(count, registration).then(function(response) {
            checkContractsReady(response.result);
            var part1 = $scope.contractsInfo.data.slice(0, index + 1);
            var part2 = $scope.contractsInfo.data.slice(index + 1);
            $scope.contractsInfo.data = part1.concat(response.result, part2);
        });
    };

    var addNewRegistrations = function(registeredList) {

        /* Добавлены в начало списка */
        var newRegisteredOnBegin = registeredList.filter(function(event) {
            return event.returnValues._timestamp * 1000 < $scope.contractsInfo.data[0].timestamp;
        });
        registeredList = registeredList.filter(function(event) {
            return newRegisteredOnBegin.indexOf(event) === -1;
        });
        if (newRegisteredOnBegin.length) {
            jouleService.getContractsList(newRegisteredOnBegin.length).then(function(response) {
                $scope.contractsInfo.data = response.concat($scope.contractsInfo.data);
                checkContractsReady(response);
            });
        }

        if (!registeredList.length) return;
        var index = 0;

        /* Добавлены в середину списка */
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

        /* Добавлены в конец списка */
        if (registeredList.length) {

            jouleService.getNext(registeredList.length, $scope.contractsInfo.data[$scope.contractsInfo.data.length - 1]).then(function(response) {
                if (!(response.result && response.result.length)) return;
                response.result = response.result.filter(function(nextRegistration) {
                    return registeredList.filter(function(event) {
                        return (event.returnValues._timestamp * 1000 === nextRegistration.timestamp) && (event.returnValues._address === nextRegistration.address)
                    }).length;
                });
                checkContractsReady(response.result);
                $scope.contractsInfo.data = $scope.contractsInfo.data.concat(response.result);
            });
        }
    };

    var checkRegistrationsList = function(eventsList) {

        var registeredList = eventsList.filter(function(event) {
            return (event.event === 'Registered') && ($scope.contractsInfo.data.filter(function(registration) {
                    return !((registration.address === event.returnValues._address) && (registration.timestamp === event.returnValues._timestamp))
                }));
        });

        var invokedList = eventsList.filter(function(event) {
            return event.event === 'Invoked';
        });
        invokedList = invokedList.filter(function(event) {
            return event.returnValues._status;
        });

        if (invokedList.length) {
            if (registeredList.length) {
                jouleService.getContractsList(1).then(function(contractsList) {
                    var firstRegistration = contractsList[0];
                    var oldEventsCount = registeredList.length;
                    registeredList = registeredList.filter(function(registeredEvent) {
                        return registeredEvent.returnValues._timestamp * 1000 > firstRegistration.timestamp;
                    });
                    if (oldEventsCount < (registeredList.length + invokedList.length)) {
                        $scope.contractsInfo.data = $scope.contractsInfo.data.slice(invokedList.length - (oldEventsCount - registeredList.length));
                    }
                    addNewRegistrations(registeredList);
                });
            } else {
                $scope.contractsInfo.data = $scope.contractsInfo.data.slice(invokedList.length);
                addNewRegistrations(registeredList);
            }
        } else {
            addNewRegistrations(registeredList);
        }
    };

    var lastTransactionBlock;
    var oldTransactionsList = [];
    var checkEventsInterval;

    var getAllEvents = function() {
        jouleService.getAllEvents(lastTransactionBlock).then(function(response) {
            checkNextEvents();
            if (response.error || !response.result.length || !checkEventsInterval) return;
            lastTransactionBlock = response.result[response.result.length - 1]['blockNumber'];
            response.result = response.result.filter(function(event) {
                return oldTransactionsList.indexOf(event.transactionHash) === -1;
            });
            response.result.map(function(event) {
                oldTransactionsList.push(event.transactionHash);
            });
            checkRegistrationsList(response.result);
        });
    };
    var checkNextEvents = function() {
        checkEventsInterval = $timeout(getAllEvents, 10000);
    };

    var checkSoonReadyContract = function(contract) {
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
    };
    var checkSoonReadyTimer = function() {
        if (!soonReadyContracts.length) {
            return;
        }
        $scope.nowTime = (new Date()).getTime();
        soonReadyContracts.map(checkSoonReadyContract);
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
            if (response.error) return;
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
                        $timeout.cancel(checkEventsInterval);
                        getAllEvents();
                        setWalletBalance();
                        break;
                }
            });
        });
    };

    var getNextProgress = false;
    var getNextRegistrationsList = function() {
        if (getNextProgress) return;
        getNextProgress = true;
        jouleService.getCount().then(function(response) {
            if (response.error) return;
            var newRegistrationsCount = Math.min(getItemsLength, response.result - $scope.contractsInfo.data.length);
            if (!newRegistrationsCount) {
                return;
            }
            jouleService.getNext(newRegistrationsCount, $scope.contractsInfo.data[$scope.contractsInfo.data.length - 1]).then(function(response) {
                if (!(response.result && response.result.length)) return;
                response.result = response.result.slice(0);
                console.log(response.result);
                checkContractsReady(response.result);
                $scope.contractsInfo.data = $scope.contractsInfo.data.concat(response.result);
                getNextProgress = false;
            });
        });

    };

    $scope.registrationsListOptions = {
        parent: '.table-from-blocks_content',
        updater: getNextRegistrationsList,
        offset: 20
    };

    $scope.$on('$destroy', function() {
        soonReadyTimer ? $interval.cancel(soonReadyTimer) : false;
    });


});
