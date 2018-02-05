angular.module('Constants').constant('JOULE_ABI',
    [
        {"constant":true,"inputs":[],"name":"getVersion","outputs":[{"name":"","type":"bytes8"}],"payable":false,"stateMutability":"view","type":"function"},
        {"constant":true,"inputs":[],"name":"getTopOnce","outputs":[{"name":"contractAddress","type":"address"},{"name":"timestamp","type":"uint256"},{"name":"gasLimit","type":"uint256"},{"name":"gasPrice","type":"uint256"},{"name":"invokeGas","type":"uint256"},{"name":"rewardAmount","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},
        {"constant":true,"inputs":[{"name":"_count","type":"uint256"}],"name":"getTop","outputs":[{"name":"addresses","type":"address[]"},{"name":"timestamps","type":"uint256[]"},{"name":"gasLimits","type":"uint256[]"},{"name":"gasPrices","type":"uint256[]"},{"name":"invokeGases","type":"uint256[]"},{"name":"rewardAmounts","type":"uint256[]"}],"payable":false,"stateMutability":"view","type":"function"},
        {"constant":false,"inputs":[{"name":"_address","type":"address"},{"name":"_timestamp","type":"uint256"},{"name":"_gasLimit","type":"uint256"},{"name":"_gasPrice","type":"uint256"}],"name":"register","outputs":[{"name":"","type":"uint256"}],"payable":true,"stateMutability":"payable","type":"function"},
        {"constant":true,"inputs":[{"name":"_gasLimit","type":"uint256"},{"name":"_gasPrice","type":"uint256"}],"name":"getPrice","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},
        {"constant":true,"inputs":[{"name":"_address","type":"address"},{"name":"_timestamp","type":"uint256"},{"name":"_gasLimit","type":"uint256"},{"name":"_gasPrice","type":"uint256"}],"name":"findKey","outputs":[{"name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},
        {"constant":true,"inputs":[{"name":"_contractAddress","type":"address"},{"name":"_timestamp","type":"uint256"},{"name":"_gasLimit","type":"uint256"},{"name":"_gasPrice","type":"uint256"}],"name":"getNext","outputs":[{"name":"contractAddress","type":"address"},{"name":"timestamp","type":"uint256"},{"name":"gasLimit","type":"uint256"},{"name":"gasPrice","type":"uint256"},{"name":"invokeGas","type":"uint256"},{"name":"rewardAmount","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},
        {"constant":false,"inputs":[{"name":"_invoker","type":"address"}],"name":"invokeFor","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},
        {"constant":false,"inputs":[{"name":"_key","type":"bytes32"},{"name":"_address","type":"address"},{"name":"_timestamp","type":"uint256"},{"name":"_gasLimit","type":"uint256"},{"name":"_gasPrice","type":"uint256"}],"name":"unregister","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},
        {"constant":false,"inputs":[{"name":"_invoker","type":"address"}],"name":"invokeOnceFor","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},
        {"constant":false,"inputs":[],"name":"invokeOnce","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},
        {"constant":true,"inputs":[],"name":"getCount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},
        {"constant":false,"inputs":[],"name":"invoke","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},
        {"constant":false,"inputs":[{"name":"_registrant","type":"address"},{"name":"_address","type":"address"},{"name":"_timestamp","type":"uint256"},{"name":"_gasLimit","type":"uint256"},{"name":"_gasPrice","type":"uint256"}],"name":"registerFor","outputs":[{"name":"","type":"uint256"}],"payable":true,"stateMutability":"payable","type":"function"},
        {"anonymous":false,"inputs":[{"indexed":true,"name":"_invoker","type":"address"},{"indexed":true,"name":"_address","type":"address"},{"indexed":false,"name":"_status","type":"bool"},{"indexed":false,"name":"_usedGas","type":"uint256"}],"name":"Invoked","type":"event"},
        {"anonymous":false,"inputs":[{"indexed":true,"name":"_registrant","type":"address"},{"indexed":true,"name":"_address","type":"address"},{"indexed":false,"name":"_timestamp","type":"uint256"},{"indexed":false,"name":"_gasLimit","type":"uint256"},{"indexed":false,"name":"_gasPrice","type":"uint256"}],"name":"Registered","type":"event"},
        {"anonymous":false,"inputs":[{"indexed":true,"name":"_registrant","type":"address"},{"indexed":true,"name":"_address","type":"address"},{"indexed":false,"name":"_timestamp","type":"uint256"},{"indexed":false,"name":"_gasLimit","type":"uint256"},{"indexed":false,"name":"_gasPrice","type":"uint256"},{"indexed":false,"name":"_amount","type":"uint256"}],"name":"Unregistered","type":"event"}]

);
