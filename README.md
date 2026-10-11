# Cloudflare Workers Collection

[![Developer Hub](https://img.shields.io/badge/Developer-Hub-blue?style=for-the-badge)](https://github.ujwalamsal.com.np)

A centralized repository containing lightweight serverless backend APIs hosted on Cloudflare Workers. These scripts power live tools and web services across [ujwalamsal.com.np](https://www.ujwalamsal.com.np/).

---

## 📂 Repository Structure

Each backend worker resides in its own dedicated subfolder:

```text
📂 cloudflare-workers/
├── 📂 nepali-date-converter/ [![Launch Tool](https://img.shields.io/badge/Launch-Live%20Web%20Tool-brightgreen?style=for-the-badge)](https://www.ujwalamsal.com.np/unit-converter)
│   └── index.js             # BS to AD / AD to BS conversion logic
├── 📂 nepse-worker/
│   └── index.js             # Real-time stock prices & index updates
└── README.md                # Repository overview & setup guide
