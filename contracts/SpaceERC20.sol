/* SPDX-License-Identifier: MIT */

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title A Capped ERC20 Token for internal SpaceDev use.
 * @notice Implements a mintable, capped, and burnable ERC20 token with 18 decimals by default.
 * @dev Extends ERC20Capped, ERC20Burnable, and Ownable from OpenZeppelin's contract suite.
 */
contract SpaceERC20 is ERC20Capped, ERC20Burnable, Ownable {
    
    /**
     * @dev Sets the values for {name} and {symbol}, initializes {cap} for the capped token supply.
     * All three of these values are immutable: they can only be set once during construction.
     * @param _cap The cap on the token's supply.
     */
    constructor(
        uint256 _cap
    ) ERC20("SpaceERC20", "S20") ERC20Capped(_cap) Ownable(msg.sender) {}

    /**
     * @dev Creates `amount` tokens and assigns them to `account`, increasing
     * the total supply.
     *
     * Requirements:
     * - `to` cannot be the zero address.
     * - Must only be called by the contract owner.
     * - Total supply must not exceed the set cap.
     * @param to The address to mint tokens to.
     * @param amount The amount of tokens to be minted.
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Hook that is called before any transfer of tokens. This includes minting
     * and burning.
     *
     * Calling conditions:
     * - when `from` and `to` are both non-zero, `amount` of ``from``'s tokens
     * will be transferred to `to`.
     * - when `from` is zero, `amount` tokens will be minted for `to`.
     * - when `to` is zero, `amount` of ``from``'s tokens will be burned.
     * - `from` and `to` are never both zero.
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal virtual override(ERC20, ERC20Capped) {
        super._update(from, to, value);
    }
}
