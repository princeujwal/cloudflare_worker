# Cloudflare Workers Collection

<a href="https://github.ujwalamsal.com.np" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/Developer-Hub-blue?style=for-the-badge" alt="Developer Hub"></a>

A centralized repository containing lightweight serverless backend APIs hosted on Cloudflare Workers. These scripts power live tools and web services across <a href="https://www.ujwalamsal.com.np/" target="_blank" rel="noopener noreferrer">ujwalamsal.com.np</a>.

---

## 🛠️ Live Applications

<a href="https://github.ujwalamsal.com.np" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/Live%20Web%20Tools-brightgreen?style=for-the-badge" alt="Live Web Tools"></a>

> 🚀 **Explore All Tools:** You can access and test all live web applications powered by these Cloudflare Worker scripts on the Developer Hub at <a href="https://github.ujwalamsal.com.np" target="_blank" rel="noopener noreferrer">github.ujwalamsal.com.np</a>.

---

## 📂 Repository Structure

Each backend worker script resides in its own dedicated subfolder:

```text
📂 cloudflare-workers/
├── 📂 nepalidateconverter/
│   └── index.js             # BS to AD / AD to BS conversion logic
├── 📂 nepse/
│   └── index.js             # Real-time stock prices & index updates
├── 📂 nepalweather/
│   └── index.js             # Real-time DHM Nepal weather & forecast API
└── README.md                # Main repository documentation & setup guide
```

---

## 🚀 How to Host Your Own Copy (Free Step-by-Step Guide)

You can easily deploy your own instance of any worker script in this repository to your Cloudflare account without using CLI tools or terminal commands.

### Prerequisites
- A free <a href="https://dash.cloudflare.com/sign-up" target="_blank" rel="noopener noreferrer">Cloudflare Account</a>.

---

### Installation Steps

1. **Log in to Cloudflare**
   * Go to the <a href="https://dash.cloudflare.com/" target="_blank" rel="noopener noreferrer">Cloudflare Dashboard</a> and navigate to **Workers & Pages**.

2. **Create a New Worker**
   * Click the **Create Application** button.
   * Select **Create Worker**.
   * Give your worker a custom name (e.g., `my-custom-tool`) and click **Deploy**.

3. **Paste the Code**
   * On the worker overview page, click **Edit code** (or **Quick Edit**).
   * Delete any default placeholder code inside the Cloudflare editor.
   * Open the desired worker script from this repository (for example, [`/nepalidateconverter/index.js`](./nepalidateconverter/index.js), [`/nepse/index.js`](./nepse/index.js), or [`/nepalweather/index.js`](./nepalweather/index.js)), copy all the code, and paste it into the Cloudflare editor.

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

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page or open a pull request if you would like to improve any of the existing workers or add new serverless scripts to this collection.

---

## 🙏 Acknowledgements & Data Sources

Special thanks and credit to the public data providers that make these APIs possible:
* **Department of Hydrology and Meteorology (DHM Nepal):** For official weather observations and forecast data.
* **Nepal Stock Exchange (NEPSE):** For market index updates and stock summary data.
* **Cloudflare Workers:** For providing a fast, global serverless platform.

---

## 📄 License
[MIT License](LICENSE) — Feel free to use, modify, and distribute as you wish!
