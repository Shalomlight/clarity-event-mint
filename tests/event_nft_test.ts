import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
  name: "Test event creation",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    
    let block = chain.mineBlock([
      // Owner creating event should succeed
      Tx.contractCall('event-nft', 'create-event', [
        types.ascii("ETH Denver 2024"),
        types.ascii("Annual Ethereum Developer Conference"),
        types.uint(1000),
        types.uint(2000),
        types.uint(1000)
      ], deployer.address),
      
      // Non-owner creating event should fail
      Tx.contractCall('event-nft', 'create-event', [
        types.ascii("Failed Event"),
        types.ascii("Should not create"),
        types.uint(1000),
        types.uint(2000),
        types.uint(1000)
      ], wallet1.address)
    ]);
    
    block.receipts[0].result.expectOk().expectUint(1);
    block.receipts[1].result.expectErr(types.uint(100));
  },
});

Clarinet.test({
  name: "Test NFT minting",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    
    // First create an event
    let setupBlock = chain.mineBlock([
      Tx.contractCall('event-nft', 'create-event', [
        types.ascii("Test Event"),
        types.ascii("Test Description"),
        types.uint(0),
        types.uint(2000),
        types.uint(10)
      ], deployer.address)
    ]);
    
    // Test minting
    let block = chain.mineBlock([
      Tx.contractCall('event-nft', 'mint-event-nft', [
        types.uint(1)
      ], wallet1.address)
    ]);
    
    block.receipts[0].result.expectOk().expectUint(1);
    
    // Verify token details
    let detailsBlock = chain.mineBlock([
      Tx.contractCall('event-nft', 'get-token-details', [
        types.uint(1)
      ], deployer.address)
    ]);
    
    const tokenDetails = detailsBlock.receipts[0].result.expectSome().expectTuple();
    assertEquals(tokenDetails['event-id'], types.uint(1));
    assertEquals(tokenDetails['owner'], wallet1.address);
  },
});

Clarinet.test({
  name: "Test NFT transfer",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;
    
    // Setup: Create event and mint NFT
    let setupBlock = chain.mineBlock([
      Tx.contractCall('event-nft', 'create-event', [
        types.ascii("Transfer Test Event"),
        types.ascii("Test Description"),
        types.uint(0),
        types.uint(2000),
        types.uint(10)
      ], deployer.address),
      Tx.contractCall('event-nft', 'mint-event-nft', [
        types.uint(1)
      ], wallet1.address)
    ]);
    
    // Test transfer
    let block = chain.mineBlock([
      Tx.contractCall('event-nft', 'transfer', [
        types.uint(1),
        types.principal(wallet1.address),
        types.principal(wallet2.address)
      ], wallet1.address)
    ]);
    
    block.receipts[0].result.expectOk().expectBool(true);
    
    // Verify new owner
    let ownerBlock = chain.mineBlock([
      Tx.contractCall('event-nft', 'get-owner', [
        types.uint(1)
      ], deployer.address)
    ]);
    
    ownerBlock.receipts[0].result.expectOk().expectSome().expectPrincipal(wallet2.address);
  },
});