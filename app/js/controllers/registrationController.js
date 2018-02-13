angular.module('app').controller('registrationController', function($scope, $timeout, jouleService, walletsList, $state) {

    $scope.durationList = [
        {
            value: 1,
            name: 'hour'
        }, {
            value: 24,
            name: 'day'
        }, {
            value: 720,
            name: 'month'
        }, {
            value: 8760,
            name: 'year'
        }
    ];
    var dueDateTime = moment().add(1, 'days').add(1, 'hours');
    var startDateTime = moment().add(1, 'days');

    $scope.contractAddress = jouleService.getContractAddress();

    $scope.contract = {
        gasPrice: 30,
        checkPeriod: 1,
        checkPeriodSelect: $scope.durationList[0].value,
        due_date_time: dueDateTime.format('X') * 1,
        start_date_time: startDateTime.format('X') * 1
    };

    $scope.dueDateTime = {
        date: dueDateTime,
        time: {
            hours: dueDateTime.hours(),
            minutes: dueDateTime.minutes()
        }
    };
    $scope.startDateTime = {
        date: startDateTime,
        time: {
            hours: startDateTime.hours(),
            minutes: startDateTime.minutes()
        }
    };

    $scope.minStartDate = moment().seconds(0);
    $scope.maxStartDate = moment().seconds(0).minutes(28).hours(9).date(7).month(1).year(2106);

    var checkRegistrationCount = function() {
        var multiHoursCount = Math.floor(($scope.contract.due_date_time - $scope.contract.start_date_time) / 3600);
        var registrationCount = Math.floor(multiHoursCount / ($scope.contract.checkPeriod * $scope.contract.checkPeriodSelect));
        // console.log(registrationCount);
    };

    $scope.checkRegistrations = checkRegistrationCount;

    var setDueDateTime = function() {
        if (!$scope.dueDateTime.date) {
            $scope.dueDateTime.date = moment($scope.contract.due_date_time * 1000);
        }
        $scope.dueDateTime.date.hours($scope.dueDateTime.time.hours).minutes($scope.dueDateTime.time.minutes);
        if ($scope.dueDateTime.date < $scope.minStartDate) {
            $scope.dueDateTime.date = $scope.minStartDate.clone();
        }
        if ($scope.dueDateTime.date > $scope.maxStartDate) {
            $scope.dueDateTime.date = $scope.maxStartDate.clone();
        }
        $scope.contract.due_date_time = $scope.dueDateTime.date.clone().hours($scope.dueDateTime.time.hours).minutes($scope.dueDateTime.time.minutes).format('X') * 1;
        $timeout(function() {
            $scope.$broadcast('pickerUpdate', ['dueDateTime'], {});
        });
        checkRegistrationCount();
    };
    
    $scope.onChangeDueDate = setDueDateTime;
    $scope.onChangeDueTime = setDueDateTime;

    var setStartDateTime = function() {
        if (!$scope.startDateTime.date) {
            $scope.startDateTime.date = moment($scope.contract.start_date_time * 1000);
        }
        $scope.startDateTime.date.hours($scope.startDateTime.time.hours).minutes($scope.startDateTime.time.minutes);

        if ($scope.startDateTime.date < $scope.minStartDate) {
            $scope.startDateTime.date = $scope.minStartDate.clone();
        }
        if ($scope.startDateTime.date > $scope.maxStartDate) {
            $scope.startDateTime.date = $scope.maxStartDate.clone();
        }
        $scope.contract.start_date_time = $scope.startDateTime.date.clone().hours($scope.startDateTime.time.hours).minutes($scope.startDateTime.time.minutes).format('X') * 1;
        $timeout(function() {
            $scope.$broadcast('pickerUpdate', ['startDateTime'], {});
        });
        if ($scope.contract.multiple) {
            checkRegistrationCount();
        }
    };

    $scope.onChangeStartDate = setStartDateTime;
    $scope.onChangeStartTime = setStartDateTime;

    $scope.pageContent = {
        wallets: [{
            type: 'infura',
            wallet: 'Other wallet'
        }]
    };

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
        if (currentWallet.type !== 'infura') {
            $scope.contract.registrant = currentWallet.wallet;
        }
    } else {
        $scope.selectedWallet = $scope.pageContent.wallets[0];
    }

    jouleService.setProviderForWallet($scope.selectedWallet);
    jouleService.getMinGasPrice().then(function(response) {
        $scope.minGasPrice = Web3.utils.fromWei(response.result, 'gwei');
    });

    $scope.checkEstimateGas = function() {
        var getEstimateGas = function() {
            if (!$scope.contract.address) return;
            jouleService.getEstimateGas($scope.contract.address).then(function(result) {
                if (result.error) {
                    $scope.addressIsError = true;
                    $scope.checkContractAddress = false;
                } else {
                    $scope.addressIsError = false;
                    $scope.checkContractAddress = true;
                }
                $scope.contract.gasLimit = Math.min(result.result, 4000000);
                $scope.checkRegistrationAmount();
            });
        };
        jouleService.checkCode($scope.contract.address).then(function(result) {
            if (!result.error && (result.result * 1)) {
                $scope.addressIsError = false;
                $scope.checkContractAddress = true;
                getEstimateGas();
            } else {
                $scope.addressIsError = true;
                $scope.checkContractAddress = false;
            }
        });
        if (!$scope.contract.address) {
            $scope.checkContractAddress = false;
            return;
        }
    };

    $scope.onSelectWallet = function() {
        $scope.contract.registrant = $scope.selectedWallet.wallet;
        jouleService.setProviderForWallet($scope.selectedWallet);
        setWalletBalance();
    };

    var validGasSettings = false;
    $scope.checkRegistrationAmount = function() {
        $scope.transactionStatusError = false;
        if (!($scope.contract.gasPrice && $scope.contract.gasLimit)) {
            $scope.checkRegistrationInfo = false;
            validGasSettings = false;
            return;
        }
        validGasSettings = true;
        var gasPrice = Web3.utils.toWei(String($scope.contract.gasPrice), 'gwei');

        var methodInterface = jouleService.getMethodInterface('register');

        $scope.registerSignature = (new Web3).eth.abi.encodeFunctionCall({
            name: methodInterface.name,
            type: methodInterface.type,
            inputs: methodInterface.inputs
        }, [
            // $scope.contract.registrant,
            $scope.contract.address,
            $scope.contract.start_date_time,
            $scope.contract.gasLimit,
            gasPrice
        ]);

        jouleService.getContractPrice($scope.contract.gasLimit, gasPrice).then(function(result) {
            if (validGasSettings && result) {
                $scope.checkRegistrationInfo = {
                    amount: Web3.utils.fromWei(String(result), 'ether')
                };
            }
        });
    };


    $scope.registerContract = function() {
        var gasPrice = $scope.contract.gasPrice;
        jouleService.register(
            $scope.contract.registrant,
            $scope.contract.address,
            $scope.contract.start_date_time,
            $scope.contract.gasLimit,
            gasPrice,
            Web3.utils.toWei($scope.checkRegistrationInfo.amount, 'ether')
        ).then(function(response) {
            if (response.error) {
                return;
            }
            $scope.transactionInProgress = true;
            var transactionHash = response.result;
            $scope.transactionStatusError = false;
            jouleService.checkTransaction(transactionHash).then(function(response) {
                $scope.transactionInProgress = false;
                var result = response.result;
                var status = Web3.utils.hexToNumber(result.status);
                switch (status) {
                    case 0:
                        $scope.transactionAddress = transactionHash;
                        $scope.transactionStatusError = true;
                        // if (result.gasUsed == $scope.contract.gasLimit) {
                        //     $scope.transactionStatusError = 1;
                        // } else {
                        //     $scope.transactionStatusError = 2;
                        // }
                        break;
                    case 1:
                        $state.go('main.registered');
                        break;
                }
            });
        });
    };
});
