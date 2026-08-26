import { pgTable, serial, text, numeric, timestamp, integer, index } from 'drizzle-orm/pg-core';

export const UserTokens = pgTable('user_tokens', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  balance: numeric('balance', { precision: 20, scale: 4 }).default('0').notNull(),
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  totalEarned: numeric('total_earned', { precision: 20, scale: 4 }).default('0').notNull(),
});

export const TokenTransactions = pgTable('token_transactions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  amount: numeric('amount', { precision: 20, scale: 4 }).notNull(),
  type: text('type').notNull(), // 'mint', 'spend'
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

export const Wallets = pgTable('wallets', {
  walletAddress: text('wallet_address').primaryKey(),
  pubkey: text('pubkey').notNull(),
  balance: numeric('balance', { precision: 20, scale: 4 }).default('0').notNull(),
  nonce: integer('nonce').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  addrIdx: index('wallet_addr_idx').on(t.walletAddress),
}));

export const Transactions = pgTable('transactions', {
  txHash: text('tx_hash').primaryKey(),
  sender: text('sender').notNull().references(() => Wallets.walletAddress),
  receiver: text('receiver').notNull().references(() => Wallets.walletAddress),
  amount: numeric('amount', { precision: 20, scale: 4 }).notNull(),
  signature: text('signature').notNull(),
  status: text('status').notNull(), // 'pending', 'confirmed', 'failed'
  blockIndex: integer('block_index').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
}, (t) => ({
  senderIdx: index('tx_sender_idx').on(t.sender),
  receiverIdx: index('tx_receiver_idx').on(t.receiver),
  txHashIdx: index('tx_hash_idx').on(t.txHash),
}));

export const StakingNodes = pgTable('staking_nodes', {
  nodeId: text('node_id').primaryKey(),
  stakedAmount: numeric('staked_amount', { precision: 20, scale: 4 }).notNull(),
  yieldRate: numeric('yield_rate', { precision: 5, scale: 4 }).notNull(),
});

export const ActionRewards = pgTable('action_rewards', {
  actionId: serial('action_id').primaryKey(),
  userId: text('user_id').notNull(),
  actionType: text('action_type').notNull(),
  rewardAmount: numeric('reward_amount', { precision: 20, scale: 4 }).notNull(),
}, (t) => ({
  userIdx: index('reward_user_idx').on(t.userId),
}));
