# Nepali Date Converter Worker

A lightweight serverless tool hosted on Cloudflare Workers.

---

## 🚀 How to Host Your Own Copy (Free Step-by-Step Guide)

You can easily deploy your own instance of this worker on your Cloudflare account without using any CLI tools or terminal commands.

### Prerequisites
* A free [Cloudflare Account](https://dash.cloudflare.com/sign-up).

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
   * Delete any default placeholder code inside the editor.
   * Open the [`index.js`](./index.js) file from this GitHub repository, copy all the code, and paste it into the Cloudflare editor.

4. **Save and Deploy**
   * Click **Save and Deploy** in the top right corner.
   * Your tool is now live at your worker's `.workers.dev` URL!

---

## ⚙️ Environment Variables / Secrets (If Applicable)

If this worker requires any secret keys, API tokens, or configurations:

1. Go to your Worker's **Settings** tab in the Cloudflare Dashboard.
2. Select **Variables and Secrets**.
3. Under **Variables**, click **Add** to set any necessary environment variables or secrets manually.

---

## 📄 License
[MIT License](LICENSE) — Feel free to use, modify, and distribute as you wish!
