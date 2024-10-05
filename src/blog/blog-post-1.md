---
layout: blog
title: Postgres Bulk Insertion and Deduplication
tags: blog
---

This blog post is still a work in progress.
---

To start, we want to initialize our database with a snapshot of the Solana blockchain. We can download it in compressed form from the Solana bucket **link**, parse it, and insert it into a Postgres database. After the initial snapshot, we can keep the database up to date by receiving new updates as they come in.

We want to represent this data in the following way:

```sql
CREATE TABLE system_accounts (
    pubkey NUMERIC(78,0),
    lamports NUMERIC(20,0) NOT NULL,
    slot NUMERIC(20,0) NOT NULL,
    CONSTRAINT pk_system_accounts_pubkey PRIMARY KEY(pubkey)
);
```

(We are using the `NUMERIC(78,0)` type to represent the `UInt256` Rust type, which doesn't have a great Postgres analog.)

We would have similar tables for `token_accounts`, `token_mints`, and so on.

When we decompress and parse the snapshot, we end up with a *lot* of data- about 50m accounts per table and a whopping 350m rows for the `token_accounts` table. 

We want to insert this into Postgres as quickly as possible, so if large chunks of data are missed, we can restore quickly from a recent snapshot and ensure no updates are missed.

We might imagine a naive implementation with something like this:


```sql
INSERT INTO system_accounts (pubkey, ..., slot)
    ...
    ON CONFLICT (pubkey) DO UPDATE 
    SET x = excluded.x, y = excluded.y, ...
WHERE excluded.slot > system_accounts.slot;
```

This performs very badly, as it requires a lookup and index update for every row inserted, and it progressively gets worse as the table grows.

