# Cloudflare Workers Collection

[![Developer Hub](https://img.shields.io/badge/Developer-Hub-blue?style=for-the-badge)](https://github.ujwalamsal.com.np)

A centralized repository containing lightweight serverless backend APIs hosted on Cloudflare Workers. These scripts power live tools and web services across [ujwalamsal.com.np](https://www.ujwalamsal.com.np/).

---

## 📂 Repository Structure

Each backend worker script resides in its own dedicated subfolder:

```text
📂 cloudflare-workers/
├── 📂 nepali-date-converter/
│   └── index.js             # BS to AD / AD to BS conversion logic
├── 📂 nepse-worker/
│   └── index.js             # Real-time stock prices & index updates
└── README.md                # Main repository documentation & setup guide
🛠️ Active Workers & Live ToolsWorker FolderDescriptionLive Frontend Appnepali-date-converter/REST API for converting dates between BS and AD.Launch Converternepse-worker/Fetches real-time NEPSE stock prices, index updates, and company data.Launch NEPSE Tool🚀 How to Host Your Own Copy (Free Step-by-Step Guide)You can easily deploy your own instance of any worker script in this repository to your Cloudflare account without using CLI tools or terminal commands.PrerequisitesA free Cloudflare Account.Installation StepsLog in to CloudflareGo to the Cloudflare Dashboard and navigate to Workers & Pages.Create a New WorkerClick the Create Application button.Select Create Worker.Give your worker a custom name (e.g., my-custom-tool) and click Deploy.Paste the CodeOn the worker overview page, click Edit code (or Quick Edit).Delete any default placeholder code inside the Cloudflare editor.Open the desired worker script from this repository (for example, /nepali-date-converter/index.js or /nepse-worker/index.js), copy all the code, and paste it into the Cloudflare editor.Save and DeployClick Save and Deploy in the top right corner.Your tool is now live at your worker's .workers.dev URL!⚙️ Environment Variables / Secrets (If Applicable)If a specific worker requires any secret keys, API tokens, or configurations:Go to your Worker's Settings tab in the Cloudflare Dashboard.Select Variables and Secrets.Under Variables, click Add to set any necessary environment variables or secrets manually.📄 LicenseMIT License — Feel free to use, modify, and distribute as you wish!
