// SPDX-License-Identifier: BUSL-1.1
// pragma solidity 0.8.23;
pragma solidity >=0.8.8 <0.9.0;

interface IOwnableUpgradeable {
    function owner() external view returns (address);
}
