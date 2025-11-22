// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";


contract DeployMockTokenScript is Script {
    MockERC20 public token;

    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);        
        token = new MockERC20();
        token.mint(msg.sender, 1000000000 ether);
        console.log("Token address:", address(token));
        vm.stopBroadcast();
    }

}
