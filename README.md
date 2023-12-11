# Smart Contracts for Cross-Chain Investment Platform

This repository contains the smart contracts for a cross-chain investment platform that leverages Chainlink technology for seamless blockchain investments. The platform is designed to enable project founders to launch Initial DEX Offerings (IDOs) and receive investments across various blockchains.

## Diagram
![image](https://github.com/SpaceUY/cc-launchpad-contracts/assets/86085168/dfbc4dad-f183-47aa-9b83-2ef0fa6adbdb)

## Contract Overview

#### IDO.sol
This file contains the IDO contract. It serves as the destination point for all investments, as well as a vesting contract and it’s deployed on the destination chain of the project. A user interested in creating an offering for their token can create an IDO, fund the contract with the tokens they want to offer, set a price (in USD), and define the vesting tranche. Limits can be set as well, such as the minimum/maximum that can be vested (in USD), and the soft and hard caps for the offering (in USD also) to determine failure (which includes a refund process), success, and early success (surpassing the max expected to sell). When the offering is successful, the IDO will then distribute its tokens over the period defined by the vesting schedule.


#### **LinkFunds.sol**
This file contains two abstract classes LinkFunder and LinkFundee. Because IDOs and their cross-chain relays are instantiated for every offering, each set of contracts would need LINK to fund the cross-chain communication. This becomes inconvenient for users creating an IDO, as they’d need to supply their own LINK for each chain they’re running on. The aforementioned contracts allow defining a funder/fundee relationship, where the contract factories function as a single source of LINK, covered by us, and then any contracts instantiated from the factory will be able to request LINK to pay for cross-chain message fees. The LinkFunder contract also maintains a tally of funds requested by each instantiated contract.

#### **TokenInvestment.sol**
This file contains a single abstract class TokenInvestment. This contract contains all the logic required to allow investors to deposit any of the permitted tokens, convert the deposited amounts to a single value (currently implemented to use Chainlink’s price feed to convert token values into USD), track the tokens deposited by every investor, and allow the release of the tokens either back to the investors, or to the IDO creator. Essentially, it functions as a multi-token escrow. The logic was abstracted into its own contract because it needs to be present both in the relays, as well as the IDO. Through cross-chain messages, the release status can be synchronized.

#### **Relay.sol**
This file contains the InvestmentRelayer contract. We wanted to allow investors to contribute to an IDO with tokens in a chain outside of the IDO’s chain. For this, we needed relays that are capable of receiving tokens from a source chain and updating the IDO contract. Originally we had planned on using cross-chain token transfers, but the feature is heavily limited. Instead, we opted to have each relay store the tokens it receives and update the IDO contract with the corresponding amounts. The idea here is that when the IDO is successful, the owner will be able to check the IDO contract to see which relays received funds and call each relay directly to withdraw the funds. This is made possible by two-way communication between relays and the IDO. Due to the fire-and-forget nature of cross-chain messages (we can’t wait for a response to determine if a call was successful or not), care had to be taken to ensure fault tolerance. One such case is when deposited tokens exceed the hard cap, in which case we have the IDO contract send a message to the relay to notify it has to return a certain amount of tokens to the investor.





