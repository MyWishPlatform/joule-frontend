angular.module('Services').service('jouleService', function($q, JOULE_SETTINGS, JOULE_ABI, $rootScope, $interval) {

    var web3 = new Web3(), contract, _this = this;
    console.log(JOULE_ABI);
    /* Определение провайдеров клиентов */
    var web3Providers = {};
    var createWeb3Providers = function() {
        var metamask, parity, infura;
        try {
            web3Providers['metamask'] = Web3.givenProvider || new Web3.providers.WebsocketProvider("ws://localhost:8546");
        } catch(err) {
            console.log('Metamask not found');
        }
        try {
            web3Providers['parity'] = new Web3.providers.HttpProvider("http://localhost:8545");
        } catch(err) {
            console.log('Parity not found');
        }
        try {
            // web3Providers['infura'] = new Web3.providers.HttpProvider("https://mainnet.infura.io/MEDIUMTUTORIAL");
            web3Providers['infura'] = new Web3.providers.HttpProvider("https://ropsten.infura.io/MEDIUMTUTORIAL");
        } catch(err) {
            console.log('Infura not found');
        }
    };
    createWeb3Providers();
    /* Определение провайдеров клиентов */

    var currentProvider;
    this.setProvider = function(providerName, withoutJouleSettings) {
        if (currentProvider === web3Providers[providerName]) {
            if (!withoutJouleSettings && !contract) {
                setJouleContract();
            }
            return;
        }
        currentProvider = web3Providers[providerName];
        web3.setProvider(currentProvider);
        if (withoutJouleSettings) return;
        setJouleContract();
    };

    var activeWallet;
    this.setProviderForWallet = function(wallet) {
        activeWallet = wallet;
        this.setProvider(wallet['type']);
    };

    this.getMethodInterface = function(methodName) {
        return JOULE_ABI.filter(function(m) {
            return m.name === methodName;
        })[0];

    };

    this.getSignature = function(methodName) {
        var method = this.getMethodInterface(methodName);
        if (method) {
            return (new Web3).eth.abi.encodeFunctionCall(method);
        }
    };

    this.getActiveWallet = function() {
        if (activeWallet) {
            var wallet = accountsList.filter(function(walletInList) {
                return walletInList['wallet'] === activeWallet['wallet'];
            })[0];
            activeWallet = wallet;
        }
        return activeWallet;
    };

    this.getContractsList = function(contractsCount) {
        var defer = $q.defer();
        var contractsList = [];
        contract.methods.getTop(contractsCount).call(function(error, result) {
            result['addresses'].map(function(addr, index) {
                var gasLimit = result['gasLimits'][index];
                var gasPrice = result['gasPrices'][index];
                var contractInfo = {
                    address: result['addresses'][index],
                    gasPriceWei: gasPrice,
                    gasPrice: Web3.utils.fromWei(gasPrice, 'gwei'),
                    gasLimit: gasLimit,
                    timestamp: result['timestamps'][index] * 1000,
                    reward: Web3.utils.fromWei(result['rewardAmounts'][index], 'ether'),
                    rewardGwei: Web3.utils.fromWei(result['rewardAmounts'][index], 'gwei'),
                    invokeGas: result['invokeGases'][index]
                };
                contractsList.push(contractInfo);
            });
            
            defer.resolve(contractsList);
        });
        return defer.promise;
    };


    this.getBlockNumber = function() {
        var defer = $q.defer();
        web3.eth.getBlockNumber().then(function(data) {
            defer.resolve(data);
        });
        return defer.promise;
    };

    var setJouleContract = function() {
        contract = new web3.eth.Contract(JOULE_ABI);
        contract.options.address = JOULE_SETTINGS.JOULE.JOULE_ADDRESS;
        contract.methods.getVersion().call(function(error, result) {
            var versionBytes = web3.utils.hexToBytes(result);
            $rootScope.version = {
                version: web3.utils.hexToNumberString(web3.utils.bytesToHex([versionBytes[0]])),
                minor: web3.utils.hexToNumberString(web3.utils.bytesToHex([versionBytes[1]])),
                build: web3.utils.bytesToHex([versionBytes[2], versionBytes[3]]),
                gitHash: web3.utils.bytesToHex([versionBytes[4], versionBytes[5], versionBytes[6], versionBytes[7]])
            };
            $rootScope.$apply();
        });
    };

    var getAccounts = function(providerName) {
        var defer = $q.defer();
        _this.setProvider(providerName, true);
        web3.eth.getAccounts(function(err, addresses) {
            if (!addresses) {
                defer.resolve([]);
                return;
            }
            var accountsList = [];
            addresses.map(function(wallet) {
                var walletModel = {
                    type: providerName,
                    wallet: wallet
                };
                accountsList.push(walletModel);
            });
            defer.resolve(accountsList);
        });
        return defer.promise;
    };

    var accountsList;
    this.getAccounts = function() {
        accountsList = [];
        var defer = $q.defer();
        var countProviders = 0;
        for (var clientName in web3Providers) {
            countProviders++;
            getAccounts(clientName).then(function(result) {
                countProviders--;
                accountsList = accountsList.concat(result);

                if (!countProviders) {
                    defer.resolve(accountsList);
                }
            });
        }
        return defer.promise;
    };

    this.getContractPrice = function(gasLimit, gasPrice) {
        var defer = $q.defer();
        contract.methods.getPrice(gasLimit, gasPrice).call(function(error, data) {
            defer.resolve(data);
        });
        return defer.promise;
    };

    this.invoke = function(params) {
        var defer = $q.defer();
        params.gasPrice = Web3.utils.toWei(params.gasPrice + '', 'gwei');
        contract.methods.invoke().send(params, function(error, result) {
            defer.resolve({error: error, result: result});
        });
        return defer.promise;
    };

    this.register = function(registrant, address, timestamp, gasLimit, gasPrice, amount) {
        var defer = $q.defer();
        gasPrice = Web3.utils.toWei(String(gasPrice), 'gwei');
        contract.methods.register(address, timestamp, gasLimit, gasPrice).send({
            from: registrant,
            value: amount
        }, function(error, result) {
            defer.resolve({error: error, result: result});
        });
        return defer.promise;
    };

    this.registerFor = function(registrant, address, timestamp, gasLimit, gasPrice, amount) {
        var defer = $q.defer();

        gasPrice = Web3.utils.toWei(String(gasPrice), 'gwei');
        contract.methods.registerFor(registrant, address, timestamp, gasLimit, gasPrice).send({
            from: registrant,
            // gas: gasLimit,
            // gasPrice: gasPrice,
            value: amount
        }, function(error, result) {
            defer.resolve({error: error, result: result});
        });
        return defer.promise;
    };

    this.getAllEvents = function(fromBlock) {
        var defer = $q.defer();
        contract.getPastEvents('allEvents', {
            fromBlock: fromBlock || JOULE_SETTINGS.JOULE.FIRST_BLOCK,
            toBlock: 'latest',
            topics: []
        }, function(error, result) {
            defer.resolve({
                error: error,
                result: result
            });
        });
        return defer.promise;
    };

    this.getRegisteredContracts = function(userAddress) {
        var defer = $q.defer();
        contract.getPastEvents('Registered', {
            fromBlock: JOULE_SETTINGS.JOULE.FIRST_BLOCK,
            toBlock: 'latest',
            topics: [
                Web3.utils.sha3("Registered(address,address,uint256,uint256,uint256)"),
                Web3.utils.padLeft(userAddress, 64)
            ]
        }, function(error, result) {
            defer.resolve({
                error: error,
                result: result
            });
        });
        return defer.promise;
    };
    this.getUnregisteredContracts = function(userAddress) {
        var defer = $q.defer();
        contract.getPastEvents('Unregistered', {
            fromBlock: JOULE_SETTINGS.JOULE.FIRST_BLOCK,
            toBlock: 'latest',
            topics: [
                Web3.utils.sha3("Unregistered(address,address,uint256,uint256,uint256,uint256)"),
                Web3.utils.padLeft(userAddress, 64)
            ]
        }, function(error, result) {
            defer.resolve({
                error: error,
                result: result
            });
        });
        return defer.promise;
    };

    this.getPastEvents = function(eventName) {
        return contract.getPastEvents(eventName, {
            fromBlock: JOULE_SETTINGS.JOULE.FIRST_BLOCK,
            toBlock: 'latest',
            topics: [Web3.utils.sha3("Registered(address,address,uint256,uint256,uint256)")]
        }, function(error, result) {

        });
    };
    this.getWalletBalance = function(address) {
        var defer = $q.defer();
        web3.eth.getBalance(address, function(error, balance){
            defer.resolve({
                error: error,
                balance: balance
            });
        });
        return defer.promise;
    };
    this.checkCode =  function(contractAddress) {
        var defer = $q.defer();
        if (!contractAddress) {
            return defer.promise;
        }
        try {
            web3.eth.getCode(contractAddress).then(function (result) {
                defer.resolve({
                    result: result
                });
            });
        } catch (err) {
            defer.resolve({
                error: 'Checksum is failed'
            });
        }
        return defer.promise;
    };
    this.getEstimateGas = function(contractAddress) {
        var defer = $q.defer();
        try {
            web3.eth.estimateGas({
                to: contractAddress,
                data: '0x919840ad'
            }, function(error, result) {
                defer.resolve({
                    error: error,
                    result: result
                });
            });
        } catch (err) {
            defer.resolve({
                error: 'Contract address error'
            });
        }
        return defer.promise;
    };
    this.getContractAddress = function() {
        return JOULE_SETTINGS.JOULE.JOULE_ADDRESS;
    };
    this.getBlock = function(blockHash) {
        var defer = $q.defer();
        web3.eth.getBlock(blockHash).then(function(data) {
            defer.resolve(data);
        });
        return defer.promise;
    };




    this.unregisterContract = function(contractModel) {
        var defer = $q.defer();
        contract.methods.findKey(
            contractModel.returnValues._address,
            contractModel.returnValues._timestamp,
            contractModel.returnValues._gasLimit,
            contractModel.returnValues._gasPrice).call(function(error, value) {
                if (error) {
                    defer.resolve({
                        error: error
                    });
                    return;
                }
                contract.methods.unregister(
                    value,
                    contractModel.returnValues._address,
                    contractModel.returnValues._timestamp,
                    contractModel.returnValues._gasLimit,
                    contractModel.returnValues._gasPrice
                ).send({
                    from: contractModel.returnValues._registrant
                }, function(error, result) {
                    defer.resolve({
                        error: error,
                        result: result
                    });
                });
        });
        return defer.promise;
    };

    this.getCount = function() {
        var defer = $q.defer();
        contract.methods.getCount().call(function(error, result) {
            defer.resolve({
                error: error,
                result: result
            });
        });
        return defer.promise;
    };
    var checkTransaction = function(transactionHash, callback) {
        try {
            web3.eth.getTransactionReceipt(transactionHash, function (error, result) {
                if (error || result) {
                    callback({
                        error: error,
                        result: result
                    });
                }
            });
        } catch(error) {
            callback({
                error: 'Transaction error'
            });
        }
    };
    this.checkTransaction = function(transactionHash) {
        var defer = $q.defer();
        var interval = $interval(function() {
            checkTransaction(transactionHash, function(result) {
                defer.resolve(result);
                $interval.cancel(interval);
            });
        }, 5000);
        return defer.promise;
    };
    this.getTransactionInfo = function(transactionHash) {
        var defer = $q.defer();
        try {
            web3.eth.getTransactionReceipt(transactionHash, function (error, result) {
                if (error || result) {
                    defer.resolve({
                        error: error,
                        result: result
                    });
                }
            });
        } catch(error) {
            defer.resolve({
                error: 'Transaction error'
            });
        }
        return defer.promise;
    };

    this.getMinGasPrice = function() {
        var defer = $q.defer();
        contract.methods.getMinGasPrice().call(function(error, result) {
            defer.resolve({
                error: error,
                result: result
            });
        });
        return defer.promise;
    };

    this.getNext = function(count, currentRegistration) {
        var defer = $q.defer();
        contract.methods.getNext(
            count,
            currentRegistration.address,
            currentRegistration.timestamp / 1000,
            currentRegistration.gasLimit,
            currentRegistration.gasPriceWei).call(function(error, result) {
            var contractsList = [];
            result['addresses'].map(function(addr, index) {
                var gasLimit = result['gasLimits'][index];
                var gasPrice = result['gasPrices'][index];
                var contractInfo = {
                    address: result['addresses'][index],
                    gasPriceWei: gasPrice,
                    gasPrice: Web3.utils.fromWei(gasPrice, 'gwei'),
                    gasLimit: gasLimit,
                    timestamp: result['timestamps'][index] * 1000,
                    reward: Web3.utils.fromWei(result['rewardAmounts'][index], 'ether'),
                    rewardGwei: Web3.utils.fromWei(result['rewardAmounts'][index], 'gwei'),
                    invokeGas: result['invokeGases'][index]
                };
                contractsList.push(contractInfo);
            });
            defer.resolve({
                error: error,
                result: contractsList
            });
        });
        return defer.promise;
    };

});
