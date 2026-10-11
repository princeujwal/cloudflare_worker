# Cloudflare Workers Collection

[![Developer Hub](https://img.shields.io/badge/Developer-Hub-blue?style=for-the-badge)](https://github.ujwalamsal.com.np)

A centralized repository containing lightweight serverless backend APIs hosted on Cloudflare Workers. These scripts power live tools and web services across [ujwalamsal.com.np](https://www.ujwalamsal.com.np/).

---

## 🛠️ Live Applications
[![Live Web Tools](https://img.shields.io/badge/Live%20Web%20Tools-brightgreen?style=for-the-badge)](https://github.ujwalamsal.com.np)

> 🚀 **Explore All Tools:** You can access and test all live web applications powered by these Cloudflare Worker scripts on the Developer Hub at [Live Web Tools](https://www.ujwalamsal.com.np).

---

## 📂 Repository Structure

Each backend worker script resides in its own dedicated subfolder:

```text
📂 cloudflare-workers/
├── 📂 nepalidateconverter/
│   └── index.js             # BS to AD / AD to BS conversion logic
├── 📂 nepse/
│   └── index.js             # Real-time stock prices & index updates
└── README.md                # Main repository documentation & setup guide
```

---

## 🚀 How to Host Your Own Copy (Free Step-by-Step Guide)

You can easily deploy your own instance of any worker script in this repository to your Cloudflare account without using CLI tools or terminal commands.

### Prerequisites
- A free [Cloudflare Account](https://dash.cloudflare.com/sign-up).

---

### Installation Steps

1. **Log in to Cloudflare**
   * Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Workers & Pages**.

2. **Create a New Worker**
   * Click the **Create Application** button.
   * Select **Create Worker**.
   * Give your worker a custom name (e.g., `my-custom-tool`) and click **Deploy**.

3. **Paste the Code**
   * On the worker overview page, click **Edit code** (or **Quick Edit**).
   * Delete any default placeholder code inside the Cloudflare editor.
   * Open the desired worker script from this repository (for example, [`/nepalidateconverter/index.js`](./nepalidateconverter/index.js) or [`/nepse/index.js`](./nepse/index.js)), copy all the code, and paste it into the Cloudflare editor.

4. **Save and Deploy**
   * Click **Save and Deploy** in the top right corner.
   * Your tool is now live at your worker's `.workers.dev` URL!

---

## ⚙️ Environment Variables / Secrets (If Applicable)

If a specific worker requires any secret keys, API tokens, or configurations:

1. Go to your Worker's **Settings** tab in the Cloudflare Dashboard.
2. Select **Variables and Secrets**.
3. Under **Variables**, click **Add** to set any necessary environment variables or secrets manually.

---

## 📄 License
[MIT License](LICENSE) — Feel free to use, modify, and distribute as you wish!
