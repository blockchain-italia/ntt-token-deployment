// SPDX-License-Identifier: BUSL-1.1
// pragma solidity 0.8.23;
pragma solidity >=0.8.8 <0.9.0;

import { BaseNttToken } from "./BaseNttToken.sol";

contract SpokeNttToken is BaseNttToken {
    constructor(
        string memory _name,
        string memory _symbol,
        address _owner,
        address _minter
    ) BaseNttToken(_name, _symbol, _owner) {
        minter = _minter;
    }
}
