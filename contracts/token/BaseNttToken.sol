// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Burnable } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import { ERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import { ERC20Votes } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import { Nonces } from "@openzeppelin/contracts/utils/Nonces.sol";
import { Time } from "@openzeppelin/contracts/utils/types/Time.sol";
import { Votes } from "@openzeppelin/contracts/governance/utils/Votes.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { INttToken } from "./INttToken.sol";

contract BaseNttToken is INttToken, ERC20, ERC20Burnable, ERC20Permit, ERC20Votes, Ownable {
    uint256 public constant MAX_SUPPLY = 10_000_000_000e18;

    event NewMinter(address newMinter);

    modifier onlyMinter() {
        if (msg.sender != minter) {
            revert CallerNotMinter(msg.sender);
        }
        _;
    }

    address public minter;

    constructor(
        string memory _name,
        string memory _symbol,
        address _owner
    ) ERC20Permit(_name) ERC20(_name, _symbol) Ownable(_owner) {}

    function clock() public view virtual override returns (uint48) {
        return Time.timestamp();
    }

    function CLOCK_MODE() public view virtual override returns (string memory) {
        // Check that the clock was not modified
        if (clock() != Time.timestamp()) {
            revert Votes.ERC6372InconsistentClock();
        }
        return "mode=timestamp";
    }

    function _maxSupply() internal pure override returns (uint256) {
        return MAX_SUPPLY;
    }

    function nonces(address _owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return Nonces.nonces(_owner);
    }

    function _update(address _from, address _to, uint256 _value) internal virtual override(ERC20, ERC20Votes) {
        return ERC20Votes._update(_from, _to, _value);
    }

    function mint(address _account, uint256 _amount) external onlyMinter {
        _mint(_account, _amount);
    }

    function setMinter(address newMinter) external onlyOwner {
        if (newMinter == address(0)) {
            revert InvalidMinterZeroAddress();
        }
        minter = newMinter;
        emit NewMinter(newMinter);
    }

    function burn(uint256 amount) public override(INttToken, ERC20Burnable) {
        ERC20Burnable.burn(amount);
    }
}
