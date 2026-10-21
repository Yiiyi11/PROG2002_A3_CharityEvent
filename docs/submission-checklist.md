# PROG2002 A3 — 提交清单（Submission Checklist）

> 依据：`PROG2002 A3 Assessment Brief(2).pdf`（14 页）
> 权重 40% ｜ 小组 2 人 ｜ 截止 12 October 2026 11:59 pm AEST/AEDT
> 整理时间：2026-10-20

---

## 一、必须提交的 4 项（Blackboard 提交链接）

| # | 提交物 | 具体要求（brief 原文要点） | 当前状态 |
|---|---|---|---|
| 1 | **三个代码 zip** | `usernameA3-clientside.zip`、`usernameA3-adminside.zip`、`usernameA3-api.zip` | ✅ 已生成，在 `deliverables/` |
| 2 | **GitHub 仓库链接** | 必须可访问；提交记录要体现两人协作与工作进展 | ✅ https://github.com/Yiiyi11/PROG2002_A3_CharityEvent （18 个提交，双人交替） |
| 3 | **演示视频**（≤15 分钟） | 上传 SCU OneDrive，生成可分享链接提交 | ❌ 未录制 |
| 4 | **Peer evaluation form** | **每人单独、保密**填写，**直接发邮件给 tutor（不是 UA）** | ❌ 未填写（需从 Blackboard 下载） |

---

## 二、不在提交列表里但会单独扣分/评分的 3 项

| # | 项目 | 要求 | 当前状态 |
|---|---|---|---|
| 5 | **cPanel 部署** | **每位成员各自部署到自己的 SCU cPanel**，两个人都要能公开访问 | ⚠️ 部署包 `Yiiyi11A3-cpanel.zip` 已备好并本地实测通过，**尚未真正上传到 SCU cPanel**（缺账号） |
| 6 | **GenAI 使用声明** | 二选一，写进最终提交（声明 A 用了 / 声明 B 没用） | ❌ 未添加 |
| 7 | **组队邮件通知 UA** | 组队后发邮件给 UA，写明 **student IDs、姓名、cohort** | ❓ 需你确认是否已发 |

---

## 三、每项的具体做法

### 1️⃣ 三个 zip（已就绪）

```
deliverables/
├── Yiiyi11A3-clientside.zip   1.8 MB   公开网站（9 个页面）
├── Yiiyi11A3-adminside.zip     90 KB   管理后台（7 个路由）
└── Yiiyi11A3-api.zip           43 KB   后端 API + 数据库脚本 + 文档
```

⚠️ **命名注意**：brief 用的是 `username`。如果两个人各自在 Blackboard 交一份，理论上应各用各的 GitHub 用户名。
需要的话我可以再生成一套 `zhou123445A3-*.zip`。

---

### 2️⃣ GitHub 链接（已完成 ⚠️ 有一个矛盾点）

- 链接：`https://github.com/Yiiyi11/PROG2002_A3_CharityEvent`
- 18 个提交，Yiiyi11 10 个 / zhou123445 8 个，严格交替
- 两位作者邮箱都已关联到各自 GitHub 账号（点 commit 头像可验证）

⚠️ **brief 里的矛盾要求**（第 7 页）：

> *"Ensure you protect your GitHub so that other students will not be able to see that. You may invite your marker to be a collaborator."*
> *"Include your GitHub in the submission link. Ensure it is accessible."*

即：**"别让其他同学看到"** vs **"确保可访问"**。

| 方案 | 做法 | 风险 |
|---|---|---|
| **A. 保持 public（当前）** | 不动，直接交链接 | 同班同学可看到代码；但 tutor 一定能打开，最保险的评分路径 |
| **B. 改 private + 邀请 tutor** | Settings → 改 private → 邀请 tutor 的 GitHub 账号 | 需要知道 tutor 的 GitHub 用户名；邀请没被接受 = 老师打不开 = 直接丢分 |

👉 **建议**：先问 tutor 要 GitHub 用户名 / 或者课上确认；在没拿到之前**保持 public**。这样至少不会因为"老师打不开"而丢 30%+。

---

### 3️⃣ 演示视频（最大工作量，≤15 分钟）

brief 明确列了 3 个必答问题，**按这个结构讲最稳**：

| 段落 | 内容 | 建议时长 | 对应 ULO / 分值 |
|---|---|---|---|
| 开场 | 团队介绍、两人各自负责的模块 | 30 秒 | ULO2 |
| **① 数据库与 API 架构** | 讲 schema 设计（为什么单独建 `registrations` 表、UNIQUE(event_id, user_email) 怎么保证"一个活动只能报一次"、FK 的 `ON DELETE RESTRICT` 怎么保护数据完整性）；打开 `api/routes/events.js` 讲 SQL；**用 Postman/浏览器实测 search 筛选接口** | 4–5 分钟 | ULO3（5%+10%） |
| **② 数据流与交互** | 从 AngularJS `$http` 发请求 → Express 路由 → MySQL 查询 → JSON 封套 → `ng-repeat` 渲染。要**同时展示前端请求代码和后端响应代码** | 4 分钟 | ULO1 + ULO3 |
| **③ 网站功能演示** | Home / Search（演示筛选 + 校验）/ Event detail（演示报名列表按日期倒序）/ **Registration 页**（演示表单校验 + 成功后跳转）/ Admin（增删改查 + 删除被 409 拦截的提示）/ Weather 页 | 5 分钟 | ULO3（30%+30%） |

**重点**：brief 反复强调 *"Focus on your individual contributions"* —— 视频里要**明确说清哪部分是自己写的**，两人各自录自己的部分，或者一人录但明确分段标注。

📌 录制提示：提前 `npm start` 启动服务，录屏时数据库里保持 18 条报名数据（这样详情页的倒序列表有内容可看）。

---

### 4️⃣ Peer evaluation form（最容易忘，漏交影响 15%）

- 位置：Blackboard → Assessment 3 文件夹
- 规则：**每人单独填、保密**，不能让对方看到
- 提交方式：**直接发邮件给 tutor（不是 UA）**
- **邮件标题格式**（必须严格照抄）：

```
PROG2002_A3_[Team_ID]_[Member_name]
```

例如：`PROG2002_A3_GC1_NehemiahSugianto`
→ 你们的情况类似：`PROG2002_A3_[你们的TeamID]_Yiiyi11`

⚠️ 两个人要**各发一封**，用自己的 SCU 邮箱。

---

### 5️⃣ cPanel 部署（权重 60% 里的 "deploy" 部分）

brief 第 6 页写得很明确：

> *"**Each student** will deploy the applications to **their own SCU cPanel**."*
> *"Students are not allowed to share your credentials with others."*

即 **两个人都必须各自部署一套**（同一个代码，各自的 cPanel + 各自的数据库）。

已备好的包：`deliverables/Yiiyi11A3-cpanel.zip`，内含：

```
app.js                       cPanel 启动入口（Passenger 用）
package.json                 仅生产依赖
.env.example                 改名 .env 后填 cpuser_ 前缀的库名/用户名
charityevents_db-cpanel.sql  phpMyAdmin 可直接导入
README-DEPLOY-CPANEL.md      分步部署说明 + 9 行故障排查表
api/  client/  admin/
```

部署 6 步（详见 README）：

1. File Manager 解压到 `/home/用户名/charityapp`（**不要放 public_html**）
2. MySQL Databases 建库 + 建用户 + 授权 ALL PRIVILEGES
3. phpMyAdmin → **先点选数据库** → Import → 选 SQL
4. `.env.example` 改名 `.env`，填 `cpuser_` 前缀的真实库名/用户名
5. Setup Node.js App → **启动文件必须填 `app.js`** → Run NPM Install → Restart
6. 访问 `/api/health` 返回 JSON 即成功

📌 提交时建议在 Blackboard 的 comment 里附上**两个 cPanel 地址**（你和队友各一个），方便 tutor 直接点开验证。

---

### 6️⃣ GenAI 声明（一行字，漏了算学术诚信问题）

按实际情况二选一，放在提交内容里（报告首页 / Blackboard comment 都行）：

**A. 用过 GenAI：**
> I acknowledge that I have used GenAI tools to complete this assessment. I used `<工具名>` to `<具体用途>` within the parameters outlined in the Assessment Brief and by the Unit Assessor.

**B. 没用过：**
> I acknowledge that I have not knowingly used GenAI to complete this assessment.

⚠️ brief 规定 Level 2 只允许：头脑风暴、语法检查、改写润色、排版、参考文献格式、设计版式模板。
**不允许**：用 GenAI 生成报告正文、生成代码后复制粘贴。
如果用了 AI 辅助写代码，声明里要如实写（例如 "used Claude to review and debug the registration API validation logic"），并在视频里能讲清代码逻辑——brief 明确说可能被叫去 interview 解释代码。

---

### 7️⃣ 组队邮件（可能已经做过）

> *"Once your team is formed, inform UA by sending an email and mentioning your student IDs, names, and cohort."*

如果还没发，补一封。内容很简单：两个人学号、姓名、cohort。

---

## 四、建议执行顺序

```
① 确认组队邮件已发 UA                          ← 5 分钟
② 问 tutor 要 GitHub 用户名（决定仓库 public/private）  ← 5 分钟
③ 两人各自部署 cPanel（各 30–45 分钟）           ← 最关键，容易卡住
④ 录演示视频（按上面三段结构，各录各的部分）        ← 2–3 小时
⑤ 填 Peer evaluation，各自单独发邮件给 tutor      ← 15 分钟
⑥ 加 GenAI 声明                                ← 2 分钟
⑦ Blackboard 提交：3 个 zip + GitHub 链接 + 视频链接 + 两个 cPanel 地址
```

**为什么 cPanel 排在视频前**：部署是最容易出意外的一步（Node 版本、权限、`.env`、Passenger 启动文件），先搞定它，视频里才能直接演示**线上版本**——比演示 localhost 得分更高，也顺便证明了 deploy 这一项。

---

## 五、当前完成度

```
代码开发    ████████████████████ 100%   （数据库 / API / 双前端 / 天气 API 全部实测通过）
GitHub      ████████████████████ 100%   （public，18 个双人交替提交）
代码打包    ████████████████████ 100%   （3 个 zip + cPanel 包）
cPanel 部署 ░░░░░░░░░░░░░░░░░░░░   0%   （包已备好，待上传）
演示视频    ░░░░░░░░░░░░░░░░░░░░   0%
Peer eval   ░░░░░░░░░░░░░░░░░░░░   0%
GenAI 声明  ░░░░░░░░░░░░░░░░░░░░   0%
```

**代码部分（对应 rubric 的 5% + 10% + 30% + 30% = 75%）已经全部就绪**，剩下 25% 是
"概念理解 10%（含视频和 GitHub）+ 团队协作 15%（Peer eval）"——**这两块恰好全靠视频和表格**，别在这儿丢分。
