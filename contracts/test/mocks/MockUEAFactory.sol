// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title MockUEAFactory
 * @notice Mock implementation of UEA Factory for testing
 */
contract MockUEAFactory {
    struct UniversalAccountId {
        string chainNamespace;
        string chainId;
        bytes owner;
    }
    
    mapping(address => UniversalAccountId) private origins;
    mapping(address => bool) private isUEAMap;
    
    function setOrigin(
        address addr,
        string memory chainNamespace,
        string memory chainId,
        bytes memory owner,
        bool _isUEA
    ) external {
        origins[addr] = UniversalAccountId({
            chainNamespace: chainNamespace,
            chainId: chainId,
            owner: owner
        });
        isUEAMap[addr] = _isUEA;
    }
    
    function getOriginForUEA(address addr) 
        external 
        view 
        returns (UniversalAccountId memory account, bool isUEA) 
    {
        return (origins[addr], isUEAMap[addr]);
    }
}
