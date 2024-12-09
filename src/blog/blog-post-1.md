---
layout: blog
title: Postgres Bulk Insertion and Deduplication
tags: blog
---

This blog post is still a work in progress.
---

Consider the following example problem for the Solana blockchain. We want to be maintain a Postgres database that mirrors the state of token accounts (and others) of the Solana blockchain. We want to keep this database up to date with the Solana blockchain as it grows and updates. Before we consider updating it, we need to consider initialization to the state it currently 'is'. Solana kindly provides us with a GCS bucket of snapshots of the blockchain, which we can download and parse to initialize our database.

We choose to represent this data in the following way:

```sql
CREATE TABLE token_accounts (
    pubkey NUMERIC(78,0),
    ...
    slot NUMERIC(20,0) NOT NULL,
    CONSTRAINT pk_system_accounts_pubkey PRIMARY KEY(pubkey)
);
```

(We are using the `NUMERIC(78,0)` type to represent the `UInt256` Rust type, which doesn't have a great Postgres analog. We could further restrict this with a custom domain that checks for sign and maximum value, but we'll keep it simple for now).

We use `pubkey` to represent the public key of the account, and `slot` to represent the slot at which the account was last updated (so we can ensure any update applied is newer than the current state, making it easier to parallelize updates). We might have similar tables for `token_accounts`, `token_mints`, or whatever else we want to keep track of.

When we decompress and parse the snapshot, we end up with a *lot* of data- about 50m accounts per table and a whopping 350m rows for the `token_accounts` table. 

We want to insert this into Postgres as quickly as possible, so if large chunks of data are missed, we can restore quickly from a recent snapshot and ensure no updates are missed.

We might imagine a naive implementation with something like this:


```sql
INSERT INTO token_accounts (pubkey, ..., slot)
    ...
    ON CONFLICT (pubkey) DO UPDATE 
    SET x = excluded.x, y = excluded.y, ...
WHERE excluded.slot > system_accounts.slot;
```

This performs very badly, as it requires a lookup and index update for every row inserted, and it progressively gets worse as the table grows. It's probably fine for updating a few thousand rows per second (which we would expect for live updating), but `350m/1000 = 350k seconds = 4 days` is not acceptable for initialization.

---

1. Inserting without indexes, deduplicating the data, and then adding the indexes back in.
2. Inserting without indexes using a `COPY` stream, deduplicating the data, and then adding the indexes back in.

For deduplication, we will compare the following strategies:

- Deduplication in Postgres through insertion into a temporary table.
- Deduplication in Postgres through direct DELETEs.
- Deduplication in Clickhouse through insertion into a temporary table.
- Deduplication in Clickhouse using ReplacingMergeTree.
- Deduplication in Rust through a BTreeMap.
- Deduplication in Rust through a memory-mapped BTreeMap (or similar).