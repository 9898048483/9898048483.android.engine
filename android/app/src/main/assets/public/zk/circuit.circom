pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

template PrivateTransfer() {
    // Private inputs
    signal input senderSecret;
    signal input senderBalanceBefore;
    signal input amount;
    signal input recipientAddress;

    // Public inputs
    signal input senderCommitment;
    signal input recipientCommitment;
    signal input amountCommitment;
    signal input nullifier;

    // Balance positivity check
    signal senderBalanceAfter;
    senderBalanceAfter <-- senderBalanceBefore - amount;
    
    component comp = GreaterEqThan(64);
    comp.in[0] <== senderBalanceBefore;
    comp.in[1] <== amount;
    comp.out === 1;

    // Commitment verification
    component senderHasher = Poseidon(2);
    senderHasher.inputs[0] <== senderSecret;
    senderHasher.inputs[1] <== senderBalanceBefore;
    senderHasher.out === senderCommitment;

    // Nullifier uniqueness
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== senderSecret;
    nullifierHasher.inputs[1] <== amountCommitment;
    nullifierHasher.out === nullifier;
}

component main {public [senderCommitment, recipientCommitment, amountCommitment, nullifier]} = PrivateTransfer();
