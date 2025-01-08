---
layout: blog
title: Postgres deadlocking
tags: blog
---

This blog post is still a work in progress.
---

Recently, we ran into a problem with a high-throughput Postgres database that repeatedly deadlocked on upsertion. 


Consider the two following tables:

```sql
CREATE TABLE token_accounts (
    pubkey NUMERIC(78,0),
    ...
    slot NUMERIC(20,0) NOT NULL,
    CONSTRAINT pk_token_accounts_pubkey PRIMARY KEY(pubkey)
);

CREATE TABLE system_accounts (
    pubkey NUMERIC(78,0),
    ...
    slot NUMERIC(20,0) NOT NULL,
    CONSTRAINT pk_system_accounts_pubkey PRIMARY KEY(pubkey)
);
```

We are receiving 10s of thousands of updates per second in account updates to send to either table. We can consider a few obvious optimizations:

1. **Batching**: We can batch updates to reduce the number of round trips to the database- Postgres prefers fewer, larger transactions.
2. **Fillfactor**: We can set a 90% fillfactor on the tables to allow Postgres to use hot updates to the table (avoiding some update overhead if there is space on a page).

We use the following query to insert (using Rust's `sqlx` library):

```sql
INSERT INTO token_accounts (pubkey, mint, owner, amount, slot)
SELECT * FROM UNNEST($1::NUMERIC(78)[], $2::NUMERIC(78)[], $3::NUMERIC(78)[], $4::NUMERIC(20)[], $5::BIGINT[])
ON CONFLICT (pubkey) DO UPDATE 
SET amount = excluded.amount,
    deleted = false,
    slot = excluded.slot
WHERE excluded.slot > token_accounts.slot;
```

This is all well and good, but when when we are running these queries concurrently, several times a second, with thousands of rows in each, we start to see deadlocks in both insertions to the `token_accounts` and `system_accounts` tables.

Obviously, we can implement some kind of exponential backoff to retry the transaction, but this is a band-aid solution, and deadlock detection is expensive. If we get enough of them, we can start to see performance degradation.

```TODO: Insert examples / screenshots of deadlock```

Why is this occurring?

Conventionally, we know a deadlock happens when when process A locks resource 1 and waits for resource 2, while process B locks resource 2 and waits for resource 1. In a database, this is usually a row-level lock, and the database will detect this and kill one of the transactions to resolve the deadlock.

In our case, we are not obviously calling for any locks (and certainly not in any inconsistent ordering), so what is Postgres locking?

Postgres, and any other ACID-compliant database, uses locks to ensure transactions are isolated from each other. 

Postgres uses a MVCC model to manage transactions. When we update a row, Postgres needs a lock on that row to prevent other transactions from modifying it. When we bulk update a lot of rows, Postgres acquires a lock on each row. If two transactions try to update the same row, one will be blocked until the other completes.

This means that if we are inserting two batches that so happen to hit the same row, but the batches are not already sorted by the primary key, we can deadlock.

`TODO: Insert example of deadlock`

We can solve this by sorting the rows before insertion, but this is not always easy or possible. 

An alternate pattern could be:

```sql
BEGIN;
SELECT pubkey FROM token_accounts WHERE pubkey = ANY($1::NUMERIC(78)[]) ORDER BY pubkey FOR UPDATE;

...

COMMIT;
```

The two key parts here are as follows:
- `SELECT ... FOR UPDATE` will lock the rows in the order they are returned, preventing deadlocks. This allows us to clearly control the timing and order of the locks. The locks will last for the entire transaction, until we `COMMIT` or `ROLLBACK`.
- `ORDER BY pubkey` will ensure that the rows are locked in the same order across transactions- making it entirely deterministic.


Another possible solution is `SKIP LOCKED`, which will skip rows that are already locked, but this is often not desirable.

What if this doesn't work?

In our case, we revisited our queries using multiple different strategies, but were still seeing
deadlocks in our logs on both tables. We were able to solve this by using a lock on both inserts with `SELECT pg_advisory_xact_lock(123456)`- however, this throttled our throughput by making our inserts no longer parallelizable.

As it turns out, we found that our two table were actually coupled in a way that we didn't realize- early on in our development, we created a trigger that would cause a modification in a row on a separate table, and this trigger was held by both tables. The roows being locked causing the deadlock were in this separate table, and the trigger was causing the deadlock.


