# SnapShare System Design & Scaling Plan

This document outlines the system architecture, capacity estimations, database design choices, text architecture diagram, step-by-step upload flow, and architectural trade-offs for **SnapShare**—a high-scale photo-sharing social platform.

---

## 1. Assumptions & Daily Active Users (DAU)

The capacity planning is based on the following core metrics and baseline operational parameters:

- **Total Registered Users:** 10,000,000 (10 million registered user accounts).
- **Daily Active Users (DAU):** 10% of 10,000,000 = **1,000,000 DAU (1 million active users/day)**.
- **Upload Activity per Active User:** 1 photo upload per day = **1,000,000 photo uploads/day**.
- **Feed Viewing Activity per Active User:** 50 feed page views per day = **50,000,000 feed views/day**.
- **Average Original Photo Size:** 2 MB (2,000 KB).
- **Thumbnail Image Size:** 50 KB (0.05 MB) per photo.
- **Total Storage Required per Photo:** 2 MB + 50 KB = **2.05 MB** (2,050 KB).
- **Time Conversions:** 1 day = 86,400 seconds (exact math) $\approx$ 100,000 seconds (back-of-the-envelope approximation).
- **Peak Traffic Multiplier:** **5x** average traffic.

---

## 2. Back-of-the-Envelope Estimates

### A. Uploads per Second (Writes)
- **Average Write Throughput:**
  $$\text{Average Uploads/sec} = \frac{1,000,000 \text{ uploads}}{86,400 \text{ seconds}} \approx \mathbf{11.57 \text{ uploads/sec}} \quad (\sim 10\text{--}12 \text{ uploads/sec})$$
  *(Using 100,000 seconds approximation: $1,000,000 / 100,000 = 10 \text{ uploads/sec}$)*

- **Peak Write Throughput (5x):**
  $$\text{Peak Uploads/sec} = 11.57 \times 5 \approx \mathbf{57.87 \text{ uploads/sec}} \quad (\sim 50\text{--}60 \text{ uploads/sec})$$

---

### B. Feed Views per Second (Reads)
- **Average Read Throughput:**
  $$\text{Average Feed Views/sec} = \frac{50,000,000 \text{ views}}{86,400 \text{ seconds}} \approx \mathbf{578.70 \text{ feed views/sec}} \quad (\sim 500\text{--}580 \text{ views/sec})$$
  *(Using 100,000 seconds approximation: $50,000,000 / 100,000 = 500 \text{ views/sec}$)*

- **Peak Read Throughput (5x):**
  $$\text{Peak Feed Views/sec} = 578.70 \times 5 \approx \mathbf{2,893.52 \text{ feed views/sec}} \quad (\sim 2,500\text{--}2,900 \text{ views/sec})$$

---

### C. Photo Storage Requirements per Year
- **Daily Storage Additions:**
  - **Original Photos:** $1,000,000 \times 2 \text{ MB} = 2,000,000 \text{ MB} = \mathbf{2 \text{ TB/day}}$.
  - **Thumbnails:** $1,000,000 \times 50 \text{ KB} = 50,000,000 \text{ KB} = 50 \text{ GB/day} = \mathbf{0.05 \text{ TB/day}}$.
  - **Total Daily Capacity Added:** $2 \text{ TB/day} + 0.05 \text{ TB/day} = \mathbf{2.05 \text{ TB/day}}$.

- **Annual Storage Capacity (365 days):**
  - **Original Photos:** $2 \text{ TB/day} \times 365 = \mathbf{730 \text{ TB/year}}$.
  - **Thumbnails:** $0.05 \text{ TB/day} \times 365 = \mathbf{18.25 \text{ TB/year}}$.
  - **Combined Total Storage per Year:** $2.05 \text{ TB/day} \times 365 = \mathbf{748.25 \text{ TB/year}} \quad (\sim 750 \text{ TB/year})$.

---

## 3. Read-Heavy vs. Write-Heavy Analysis

SnapShare is an overwhelmingly **read-heavy application**, with a **50:1 read-to-write ratio** (50 million feed views compared to 1 million photo uploads per day).

### Architectural Consequences for Read-Heavy Optimization:
1. **In-Memory Caching (Redis):** Frequently accessed user feeds, active user profiles, and hot photo metadata are cached in Redis to serve read requests in sub-milliseconds without querying the primary database.
2. **Content Delivery Network (CDN):** All static binary media (full-size photos and thumbnails) are cached at edge locations globally, taking 99%+ of bandwidth traffic off the core servers.
3. **Database Read Replicas:** Database reads are offloaded to multiple read-only database replicas. This keeps the primary database unburdened so it can process write transactions (uploads, comments, likes) with zero bottlenecking.

---

## 4. Why Photos Should Not Be Stored in the Database

Storing 2 MB binary raw image files (BLOBs) inside a relational database is a serious anti-pattern for large-scale systems:

- **Database Bloat & Memory Waste:** Storing large binaries rapidly expands database disk space, consumes valuable RAM buffer pools with binary chunks, and degrades index performance.
- **Slow Backups & Migration:** Database backups, replication, and disaster recovery operations take hours or days instead of minutes when handling hundreds of terabytes of binary data.
- **High Cost & Inefficient Scaling:** Database storage is vastly more expensive per gigabyte than dedicated object stores, and database CPU is wasted on IO operations streaming large file chunks.

### Preferred Solution:
- **Object Storage (Amazon S3 / Cloudflare R2):** All physical 2 MB image files and 50 KB thumbnails are stored in highly durable, low-cost Object Storage designed for massive blob storage.
- **Relational Database Metadata:** The relational database stores only lightweight structured metadata: `photo_id`, `user_id`, `caption`, `created_at`, `original_photo_url`, and `thumbnail_url`.

---

## 5. System Architecture Diagram

```
                              +--------------------------+
                              | Client (Browser / App)   |
                              +------------+-------------+
                                    |            |
                      Media Reads   |            | API Requests (Reads & Writes)
                     (Photos/Thumbs)|            v
                                    |    +---------------+
                                    |    | Load Balancer |
                                    |    +-------+-------+
                                    |            |
                                    |            v
                                    |    +-----------------------------+
                                    |    | Stateless App Servers Fleet |
                                    |    +----+-------+-----------+----+
                                    |         |       |           |
                                    v         |       |           v
                        +---------------+     |       |   +---------------+
                        |      CDN      |     |       |   | Cache (Redis) |
                        +-------+-------+     |       |   +---------------+
                                |             |       |
                                |             v       v
                                |     +---------------+   +----------------------+
                                |     | Primary DB    |   | Read Replica DB      |
                                |     | (Writes)      |   | (Reads)              |
                                |     +---------------+   +----------------------+
                                v
                     +---------------------+              +----------------------+
                     | Object Storage      |<-------------| Background Worker    |
                     | (S3 / R2)           |              | (Thumbnail Generator)|
                     +---------------------+              +----------+-----------+
                                                                     ^
                                  +-----------------------+          |
                                  | Message Queue         |----------+
                                  | (RabbitMQ / Kafka)    |
                                  +-----------------------+
```

---

## 6. Component Explanations

- **Client (Browser / Mobile App):** Provides the interactive user interface for uploading photos and scrolling through photo feeds.
- **CDN (Content Delivery Network):** Caches and serves static photo and thumbnail files from geographically distributed edge locations to minimize latency and reduce bandwidth costs.
- **Load Balancer:** Distributes incoming HTTP/HTTPS traffic evenly across the fleet of stateless application servers to prevent any single server from becoming overloaded.
- **Stateless App Servers:** Executes business logic, handles API requests, validates inputs, and coordinates storage/cache operations without storing session state locally.
- **In-Memory Cache (Redis):** Stores hot feed data, user session state, and metadata in RAM to deliver lightning-fast read operations and protect the database from read traffic spikes.
- **Primary Database (Writes):** Manages relational metadata (users, photo records, followers) as the authoritative source of truth for write transactions.
- **Database Read Replica (Reads):** Replicates data asynchronously from the primary database to serve read-only queries, ensuring high read throughput and query isolation.
- **Object Storage (Amazon S3 / R2):** Stores unstructured binary media files (original 2 MB photos and 50 KB thumbnails) with high durability and unlimited horizontal scalability.
- **Message Queue (RabbitMQ / Kafka):** Buffers background tasks asynchronously so long-running jobs (like image processing) do not block HTTP request threads.
- **Background Thumbnail Worker:** Consumes thumbnail generation jobs from the message queue, resizes uploaded images, and updates storage and database records asynchronously.

---

## 7. Step-by-Step Photo Upload Flow

1. **Upload Request:** The client sends an HTTP `POST /photos` upload request containing the original 2 MB image file and caption through the **Load Balancer** to an available stateless **App Server**.
2. **Object Storage Upload:** The **App Server** streams the original 2 MB photo file directly to **Object Storage** (Amazon S3 / R2) and receives a unique image key/URL.
3. **Metadata & Cache Write:** The **App Server** writes the new photo metadata row (`id`, `user_id`, `original_url`, `thumbnail_url: null`, `created_at`) to the **Primary Database** and updates/invalidates relevant feed entries in the **Redis Cache**.
4. **Asynchronous Job Enqueueing:** The **App Server** pushes a `create_thumbnail` job payload (containing `photo_id` and `original_url`) onto the **Message Queue** and immediately responds to the client with `201 Created`, providing an instant response without waiting for image resizing.
5. **Background Processing & CDN Delivery:** The **Background Thumbnail Worker** consumes the job from the **Message Queue**, downloads the 2 MB photo from **Object Storage**, generates a compressed 50 KB thumbnail, uploads it back to **Object Storage**, and updates `thumbnail_url` in the **Primary Database** (which replicates to the **Read Replicas** and is cached globally by the **CDN**).

---

## 8. Architectural Trade-offs

1. **Asynchronous Thumbnail Generation via Message Queue (Low Latency vs. Eventual Consistency):**
   - *Trade-off:* Offloading thumbnail creation to a message queue allows the `POST /photos` API response to return in milliseconds. The trade-off is eventual consistency: for a brief moment immediately after upload, the 50 KB thumbnail is not yet available, requiring the UI to temporarily display a placeholder or the full-size image until the worker completes processing.

2. **Caching & Read Replicas (Read Speed vs. Stale Data & Cache Invalidation Complexity):**
   - *Trade-off:* Caching feeds in Redis and using DB Read Replicas allows SnapShare to comfortably serve ~2,900 peak feed views/sec with sub-50ms latency. The trade-off is replication lag and cache invalidation complexity, where a follower might occasionally experience a slight delay before a newly published photo appears in their feed.

3. **Horizontal Scaling + Object Storage + CDN (Extreme Scalability vs. Infrastructure Cost & Operational Complexity):**
   - *Trade-off:* Decoupling storage, compute, edge delivery, and async queues allows the architecture to scale seamlessly to 748 TB/year and handle traffic surges without downtime. The trade-off is higher financial cost for cloud infrastructure and greater operational complexity in monitoring distributed services compared to a simple monolithic server.
