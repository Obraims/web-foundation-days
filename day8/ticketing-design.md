# TicketHub System Design & Scaling Architecture

This document presents the full system architecture, traffic estimations, API design, data model, concurrency controls, and trade-offs for **TicketHub**—a high-concurrency event ticketing platform built to handle high-demand ticket sales for popular concerts without crashing or double-booking seats.

---

## 1. System Requirements

### Functional Requirements
- **Browse Events:** Users can browse available concerts and view event details.
- **View Seat Maps:** Users can view real-time seat availability for an event.
- **Hold Seats:** Users can temporarily hold a seat for 10 minutes to complete checkout.
- **Purchase Tickets:** Users can securely process payment and finalize ticket purchases.
- **View Purchased Tickets:** Users can view their active and past ticket purchases.

### Non-Functional Requirements
- **Speed & Availability:** The platform must withstand massive traffic spikes during high-demand sales without crashing or slowing down.
- **Correctness (Zero Double-Booking):** Absolute consistency for seat allocations—preventing two users from purchasing or holding the exact same seat under any circumstances.
- **Fairness:** A strict first-come, first-served mechanism for high-demand ticket releases to guarantee equal opportunity for all buyers.

---

## 2. Traffic Estimates (Normal vs. Big Sale)

### Baseline Facts
- **Registered Users:** 2,000,000 (2 million registered users).
- **Normal Day Traffic:** 50,000 daily active users (DAU), viewing an average of 10 pages each.
- **Normal Day Sales:** 5,000 tickets sold per day.
- **Big Sale Event:** 200,000 users attempt to purchase 20,000 available seats within the first 10 minutes (600 seconds) of release, viewing 10 pages each.

---

### A. Normal Day Traffic Estimates
- **Read Operations per Day:** 50,000 users × 10 pages = 500,000 page reads/day.
- **Average Read Throughput:**
  - Exact calculation: 500,000 reads / 86,400 seconds = **~5.8 reads/sec**
- **Average Write Throughput:**
  - Exact calculation: 5,000 tickets / 86,400 seconds = **~0.06 writes/sec**

---

### B. Peak Traffic Estimates ("Big Sale" On-Sale Event)
- **Timeframe:** 10 minutes = 600 seconds.
- **Peak Read Operations:** 200,000 users × 10 pages = 2,000,000 page reads.
- **Peak Read Throughput:**
  - Exact calculation: 2,000,000 reads / 600 seconds = **~3,333 reads/sec**
- **Peak Write Throughput:**
  - Exact calculation: 20,000 tickets / 600 seconds = **~33.3 writes/sec**

---

### C. Comparison Summary
- **Read Throughput Spike:** Peak reads jump from **5.8 reads/sec** to **3,333 reads/sec**—a **~574x increase (nearly 600x)** in read load.
- **Write Throughput Spike:** Peak writes jump from **0.06 writes/sec** to **33.3 writes/sec**—a **~555x increase (over 500x)** in write traffic.

---

## 3. API Design

The TicketHub REST API provides the following core endpoints:

| Method | Endpoint Path | Description | Success Status |
| :--- | :--- | :--- | :--- |
| `GET` | `/events` | Browse all upcoming concerts and events | `200 OK` |
| `GET` | `/events/{id}/seats` | View seat map and availability (`available`, `held`, `booked`) | `200 OK` |
| `POST` | `/seats/{id}/hold` | Temporarily hold a seat for 10 minutes during checkout | `200 OK` |
| `POST` | `/orders` | Complete payment processing and finalize ticket purchase | `201 Created` |
| `GET` | `/users/{id}/tickets` | Retrieve all active and historical tickets owned by the user | `200 OK` |

---

## 4. Data Model & Double-Booking Prevention

### Tables & Relationships
- **`users`:** `id` (PK), `name`, `email` (UNIQUE), `created_at`
- **`events`:** `id` (PK), `title`, `date`, `venue`, `created_at`
- **`seats`:** `id` (PK), `event_id` (FK -> `events.id`), `seat_number`, `status` (`available`, `held`, `booked`), `user_id` (FK -> `users.id`)
- **`orders`:** `id` (PK), `user_id` (FK -> `users.id`), `event_id` (FK -> `events.id`), `total_price`, `status`, `created_at`

#### Entity Relationships
- `events` has a **1:N (One-to-Many)** relationship with `seats`.
- `users` has a **1:N (One-to-Many)** relationship with `orders`.
- `users` has a **1:N (One-to-Many)** relationship with `seats` when seats are held or purchased.

---

### Preventing Double-Booking via Database Concurrency & ACID Transactions

Preventing two users from purchasing or holding the exact same seat relies on relational database **ACID Transactions**, strict unique constraints, and row-level locking controls. When a user requests to hold or purchase a seat, the application executes a conditional atomic update inside an isolated transaction:

```sql
UPDATE seats 
SET status = 'held', user_id = 42, updated_at = NOW() 
WHERE id = 1001 AND status = 'available';
```

Alternatively, the system employs row-level pessimistic locking via `SELECT ... FOR UPDATE`:

```sql
BEGIN TRANSACTION;
SELECT * FROM seats WHERE id = 1001 AND status = 'available' FOR UPDATE;
-- If seat is available, mark as held:
UPDATE seats SET status = 'held', user_id = 42 WHERE id = 1001;
COMMIT;
```

Because of the relational database's strict concurrency controls, if two users click "Buy" on the exact same seat at the identical millisecond, the database serializes the incoming requests. The first transaction acquires a row lock on seat `1001`, changes its status from `'available'` to `'held'`, and commits successfully. When the second transaction executes, the row status is no longer `'available'`, causing the conditional update to return zero affected rows. The second user receives an immediate message stating that the seat has already been taken, ensuring absolute correctness and zero double-booking.

---

## 5. System Architecture & Surviving the Big Sale

### Architecture Diagram

```text
                              +--------------------------+
                              | Client (Browser / App)   |
                              +------------+-------------+
                                    |            |
                      Static Assets |            | API Requests
                      (HTML/CSS/JS) v            v
                        +---------------+    +---------------+
                        |      CDN      |    | Load Balancer |
                        +---------------+    +-------+-------+
                                                     |
                                                     v
                                         +-----------------------+
                                         | Virtual Waiting Room  |
                                         | (Fairness Queue)      |
                                         +-----------+-----------+
                                                     |
                                                     v
                                         +-----------------------+
                                         | Stateless App Servers |
                                         +---+-------+-------+---+
                                             |       |       |
                                             v       |       v
                                     +---------------+ | +---------------+
                                     | Cache (Redis) | | | Message Queue |
                                     +---------------+ | +-------+-------+
                                                       v         |
                                             +-----------------+ |
                                             | Primary DB      |<+
                                             | (Writes)        |
                                             +--------+--------+
                                                      |
                                                      v
                                             +-----------------+
                                             | Read Replicas   |
                                             | (Reads)         |
                                             +-----------------+
```

---

### Component Explanations (One Sentence Per Component)

- **Client (Browser / Mobile App):** Delivers the interactive user interface for browsing concerts, picking seats, queuing in the waiting room, and submitting ticket payments.
- **CDN (Content Delivery Network):** Caches and serves static page assets globally to minimize server load and deliver fast page loads.
- **Load Balancer:** Evenly distributes incoming web traffic across the application tier to prevent individual server crashes during high traffic surges.
- **Virtual Waiting Room (Queue):** Admits users into the ticketing system at a controlled rate on a first-come, first-served basis to protect backend databases from traffic overload.
- **Stateless App Servers:** Executes core business logic, user authentication, seat holding, and order processing without storing session state locally.
- **In-Memory Cache (Redis):** Caches seat maps and event metadata in RAM to deliver ultra-fast read responses and protect the primary database from read spikes.
- **Message Queue (RabbitMQ / Kafka):** Buffers background asynchronous tasks like confirmation email delivery and payment processing during high-volume releases.
- **Primary Database (Writes):** Serves as the single source of truth for write transactions, enforcing data integrity, row locks, and zero double-booking.
- **Database Read Replicas (Reads):** Asynchronously replicates data from the primary database to handle high read volume without interfering with write transactions.

---

### Surviving the Big Sale

1. **Virtual Waiting Room (Queue):** When 200,000 users hit the platform at once, allowing all of them direct database access would immediately crash the application. The Virtual Waiting Room intercepts all incoming users, assigns them a randomized queue position upon opening, and throttles access by admitting only 500 users per second into the checkout flow. This protects downstream databases while maintaining a fair, first-come, first-served purchasing process.
2. **Redis Caching for Seat Maps:** The 3,333 reads/sec generated by users repeatedly viewing seat maps are served entirely from an in-memory **Redis Cache** cluster rather than hitting the primary database. By caching seat availability graphs in memory with high throughput, the primary relational database remains idle and fully dedicated to handling critical write transactions (`POST /seats/{id}/hold` and `POST /orders`).

---

## 6. Architectural Trade-offs

1. **Caching Seat Maps vs. Stale Read Window:**
   - *Trade-off:* Serving seat availability from Redis enables the system to handle 3,333 reads/sec with sub-10ms response times. The trade-off is eventual consistency: a user might see a seat displayed as available for a split second after another user held it, leading to occasional "seat taken" errors during checkout.

2. **Virtual Waiting Room vs. Immediate User Experience:**
   - *Trade-off:* Implementing a virtual waiting room guarantees 100% backend stability and absolute fairness during major ticket releases. The trade-off is user experience friction, as users are forced to wait in a virtual queue line rather than immediately selecting their seats.