# Charity Events A3 — cPanel 部署步骤（中文版）

_更新时间：2026-10-21 ｜ 团队：Yiiyi11 & zhou123445_

这个文件夹是**打包好、可直接上传的 cPanel 部署版**（`Yiiyi11A3-cpanel.zip`）。
不需要编译、没有构建步骤 —— AngularJS 页面就是普通静态文件，由 Node 进程直接托管。

```
部署包内容
├── app.js                          Passenger 启动入口（导出 Express 应用）
├── package.json                    仅生产依赖
├── .env.example                    → 改名 .env 并填入数据库信息
├── charityevents_db-cpanel.sql     phpMyAdmin 导入文件（建表 + 种子数据）
├── api/                            Express RESTful API
├── client/                         公开网站（托管在 / ）
├── admin/                          员工后台（托管在 /admin/ ）
└── README-DEPLOY-CPANEL.md         英文原版说明
```

> ⚠️ **作业要求：每位成员都要把项目部署到自己的 SCU cPanel**，
> 不允许共用账号凭据。下面的步骤每个人都要完整做一遍。

---

## 0. 开始前需要准备什么

| 需要的东西 | 在哪里找 |
| --- | --- |
| cPanel 登录账号 | 查收你的 SCU 邮箱（unit 会发给你） |
| **Setup Node.js App** 图标 | cPanel → Software 区块 |
| **MySQL Databases** 图标 | cPanel → Databases 区块 |
| **phpMyAdmin** 图标 | cPanel → Databases 区块 |
| 你的 cPanel 账户名 | cPanel 页面左上角，例如 `scu1234567` |

本指南中账户名统一写作 `cpuser` —— **请把你自己的账户名替换进去**。
（cPanel 会自动给数据库和用户名加前缀，所以最后真实名称都会带 `cpuser_` 开头。）

---

## 1. 上传代码

1. 打开 cPanel → **File Manager**（文件管理器）。
2. 决定应用放在哪。推荐：**建在 `public_html` 之外**，例如：

   ```
   /home/cpuser/charityapp
   ```

   放在 `public_html` 外面的好处：源代码、`.env` 文件和数据库密码
   **不会**被别人通过浏览器 URL 直接下载。
3. 把 `Yiiyi11A3-cpanel.zip` 上传到这个文件夹，然后右键 → **Extract**（解压）。
4. 解压后检查 `app.js` 是否**直接**位于 `charityapp/` 下面，而不是多套了一层
   文件夹（有些解压工具会多建一层 —— 如果有，把里面的文件移上来）。

---

## 2. 创建数据库并导入数据

cPanel **不允许**通过 SQL 语句创建数据库 —— 这正是
`charityevents_db-cpanel.sql` 里故意不写 `CREATE DATABASE` 的原因。

1. cPanel → **MySQL Databases** → *Create New Database*
   - 数据库名填：`charity` → cPanel 实际创建为 **`cpuser_charity`**
   - **把完整名称记下来**，`.env` 里要用。
2. 同一页面 → *Add New User*
   - 用户名填：`charityadm` → 实际创建为 **`cpuser_charityadm`**
   - 密码：点 **Password Generator** 生成强密码，复制保存好。
3. 同一页面 → *Add User To Database* → 选中刚才的用户和数据库 →
   **Add** → 勾选 **ALL PRIVILEGES** → *Make Changes*。
4. cPanel → **phpMyAdmin**
   → 在**左侧栏点选数据库 `cpuser_charity`**（⚠️ 必须先点选，再导入）
   → **Import** 标签 → **Choose File** → 选 `charityevents_db-cpanel.sql`
   → 拉到页面底部 → **Go**。
5. 成功后应看到
   *"Import has been successfully finished, 32 queries executed."*
   左侧栏出现 4 张表：`categories`、`charity_organisations`、`events`、`registrations`。

**导入后各表应有行数（可用来核对）**

| 表 | 行数 |
| --- | --- |
| `categories` | 6 |
| `charity_organisations` | 3 |
| `events` | 13 |
| `registrations` | 18 |

> **常见报错：**
> - **#1273 Unknown collation**：服务器是老版本 MariaDB。
>   用记事本打开 .sql 文件，把 `utf8mb4_unicode_ci` 全部替换为
>   `utf8mb4_general_ci`，保存后重新导入。
> - **#1044 Access denied**：导入前没有先点选数据库。
>   回到 phpMyAdmin 左侧栏点一下数据库名，再用 Import 标签。

---

## 3. 创建 .env 文件

1. File Manager 右上角 **Settings → Show Hidden Files**（显示隐藏文件）打勾。
2. 把 `.env.example` 改名为 **`.env`**。
3. 右键 `.env` → **Edit**，填入第 2 步得到的四项数据库信息：

```ini
DB_HOST=localhost
DB_PORT=3306
DB_USER=cpuser_charityadm
DB_PASSWORD=第2步生成的密码
DB_NAME=cpuser_charity

PORT=3000
CLIENT_ORIGIN=*
```

> `DB_HOST` 在 cPanel 上保持 `localhost` —— 数据库和网站在同一台服务器上。
> 注意 `DB_USER` 和 `DB_NAME` **都必须带 `cpuser_` 前缀**，少写前缀是最常见的报错原因。

---

## 4. 创建 Node.js 应用

1. cPanel → **Setup Node.js App** → **Create Application**。
2. 按下表填写：

| 字段 | 填什么 |
| --- | --- |
| Node.js version | **18.x**（或列表里最新的 18/20） |
| Application mode | **Production** |
| Application root | `charityapp` |
| Application URL | 你的域名，路径留**空**（即挂在 `/`） |
| Application startup file | **`app.js`** |

3. 点 **Create**。
4. 应用出现在列表里后，点 **Run NPM Install**，等它显示
   *"npm install completed"*。这一步会把 `express`、`mysql2`、`cors`、`dotenv`
   装进应用的虚拟环境。
5. 点 **Restart**（必须重启才能读到 `.env`）。

> ⚠️ **启动文件必须填 `app.js`，不要填 `api/server.js`。**
> Passenger 会加载启动文件并要求它导出 Express 应用，`app.js` 就是干这个的；
> `api/server.js` 会自己监听端口，在 Passenger 下反而起不来。

---

## 5. 验证部署

把下面的域名换成你自己的，逐个打开：

| 地址 | 应该看到 |
| --- | --- |
| `https://你的域名/api/health` | JSON：`{"success":true,"data":{"status":"up",...}}` |
| `https://你的域名/api/events/home` | JSON，含 12 条精选活动 |
| `https://你的域名/` | 公开网站首页，13 张活动卡片 |
| `https://你的域名/admin/` | 员工后台仪表盘 |
| `https://你的域名/weather.html` | Open-Meteo 7 天天气预报 |

如果 `/api/health` 返回 JSON 但页面空白，看下面的故障排查表 ——
最常见原因是本地测试时浏览器缓存了旧的 API 地址。

---

## 6. 故障排查表

| 现象 | 原因 | 解决办法 |
| --- | --- | --- |
| **503 Service Unavailable** | Passenger 没能启动 Node | cPanel → Setup Node.js App → 点错误日志链接；通常是忘了 npm install 或代码有语法错误 |
| **502 / 页面空白、没有 CSS** | Application root 填错 | `app.js`、`api/`、`client/`、`admin/` 必须在同一层级 |
| 页面能打开但**不显示活动**，控制台出现 `localhost:3000` | 浏览器缓存了旧 API 地址 | DevTools → Application → Local Storage → 删掉 `charityApiBase` 这个键，然后 Ctrl+F5 强刷 |
| 日志里 **`ER_ACCESS_DENIED_ERROR`** | 数据库用户名或密码错 | 核对 `.env`；用户必须被添加到**那个具体的数据库**（第 2 步第 3 小步） |
| **`ER_BAD_DB_ERROR`** | `DB_NAME` 少了 `cpuser_` 前缀 | 到 MySQL Databases 页面复制完整名称 |
| **`ER_NO_SUCH_TABLE`** | SQL 导进了别的库 | 重新导入，导入前先在 phpMyAdmin 左侧点选数据库 |
| 活动图片 **404** | `client/src/assets/img/` 没传上去 | 重新上传 `client` 文件夹，保留子文件夹 |
| **`Cannot find module 'express'`** | 没跑过 npm install | 点 **Run NPM Install**，然后 **Restart** |
| 天气页空白 | 服务器无法访问外网或 Open-Meteo 被墙 | 先在浏览器打开 `https://api.open-meteo.com/v1/forecast?latitude=-27.47&longitude=153.02&daily=weather_code` 验证 |
| **`Can't acquire lock for app: xxx`** | 有个残留的 `.lock` 锁文件 | 见下面第 6.1 节 |

**怎么看日志**：cPanel → Setup Node.js App → 你的应用 → `stderr.log` 链接。
每个 API 请求都会记录成 `[api] GET /api/events/home -> 200 (12ms)`，
方便证明接口真的被访问到了。

---

## 6.1 报错 `Can't acquire lock for app: charityevent` 怎么解决

### 为什么会出现

cPanel 的 Node.js 选择器（CloudLinux / Passenger）在每次执行「启动、停止、重启、
安装依赖」之前，都会在应用的虚拟环境目录里建一个 `.lock` 文件，防止两个操作同时改
同一个应用。**操作正常结束后它会自动删掉。**

问题出在：**它只会在操作"结束"后释放锁**。而我们的 `app.js` 是常驻服务 ——
一旦通过 **"Run JS script"** 或 **"Run NPM Script → start"** 按钮去启动它，
cPanel 会一直等这个命令结束，但 `node app.js` 是永远不结束的（它在监听端口），
于是：

```
cPanel 等待 → 永远等不完 → .lock 一直留着 → 之后每个按钮都报 "Can't acquire lock"
```

所以这个错误**不是代码坏了**，是操作方法用错了 + 锁没被清掉。

### 三步解决（不需要 SSH）

**第 1 步：删掉残留的锁文件**

1. cPanel → **File Manager**
2. 右上角 **Settings** → 勾选 **Show Hidden Files**（显示隐藏文件）
3. 锁文件在**虚拟环境目录**里。cPanel 页面顶部蓝色横幅会显示它的位置，
   结构是 `/home/用户名/nodevenv/<应用root>/<Node版本>/`，例如：

   ```
   /home/yzhou58/nodevenv/charityevent/          ← 先看这一层有没有 .lock
   /home/yzhou58/nodevenv/charityevent/18.20.8/  ← 再看版本子目录里有没有
   ```

   两层都找一下，凡是名字叫 `.lock`（或 `*.lock`）的文件都删掉。
4. 右键 `.lock` → **Delete**（删这个文件不会影响你的代码和环境，它只是一个临时标记）

> 找不到的话，File Manager 右上角搜索框直接搜 `lock` 也行。

**第 2 步：用正确的按钮重启**

回到 cPanel → **Setup Node.js App** → 选中你的应用：

```
先点 Stop App  →  再点 Start App
（或者直接点 Restart）
```

**第 3 步：以后只用这三个按钮**

| 想做什么 | 用哪个按钮 | ❌ 千万不要用 |
| --- | --- | --- |
| 代码改了要生效 | **Restart** | Run JS script |
| 加了新依赖 | **Run NPM Install** → 再 **Restart** | Run NPM Script → start |
| 临时停掉 | **Stop App** | — |

> **核心原则**：`npm start`（= `node app.js`）是**常驻进程**，
> 在任何"会等待命令结束"的地方跑它都会卡死。
> cPanel 的 **Start / Stop / Restart** 按钮知道怎么处理常驻进程，
> 而 "Run JS script" / "Run NPM Script" 只会傻等。

### 如果删了锁还是立刻再报错

说明那个卡住的进程还活着，一边跑一边把锁又建回来：

1. 先看网站是不是还能打开 —— 如果 **页面正常**，说明只是管理界面卡住，
   把浏览器标签关掉重开 cPanel 页面即可，**不影响网站运行**。
2. 还是不行的话，用 cPanel 的 **Terminal**（或 SSH）执行：

   ```bash
   # ① 杀掉你账号下所有卡住的 node / npm 进程（应用已停的话这样做是安全的）
   pkill -9 -u $USER -f node 2>/dev/null

   # ② 找出并删掉所有锁文件
   find ~/nodevenv -name "*.lock" -print
   find ~/nodevenv -name "*.lock" -delete
   rm -f ~/nodevenv/.lock ~/.nodevenv.lock 2>/dev/null
   ```

   然后回 Setup Node.js App → Stop App → Start App。

3. 自己搞不定就开工单给主机商，把 **应用名、域名、报错原文** 一起发过去，
   请他们清一下 Passenger 的锁（这属于服务端操作）。
   SCU 的话就是联系 **IT Service Desk**（服务由学校统一托管）。

### 变体：报错显示成 `Can't acquire lock for app: %(app)s`

`%(app)s` 是 cPanel 的错误模板占位符**没被替换掉**，属于界面层的显示 bug，
**本质还是同一把锁**，只是这次连应用名都没解析出来（通常发生在
"应用列表 / 全局操作"这一层，而不是某个具体应用内部）。

这种情况锁文件往往不在应用子目录里，而是散落在 `nodevenv` 各处，用这条命令一次找全：

```bash
find ~/nodevenv -name ".lock" -print        # 先看有哪些
find ~/nodevenv -name ".lock" -delete       # 确认后再删
rm -f ~/.nodevenv.lock ~/nodevenv/.lock 2>/dev/null
```

然后再 `Stop App` → `Start App`。

> 如果 `find` 一个 `.lock` 都找不到，说明锁是被**活着的进程**占着的（文件系统锁），
> 而不是残留文件 —— 直接跳到上面的第 2 步（`lsof` + `kill`）。
> 没有 SSH 权限、Terminal 也没有，就开支援工单，附上这句话：
> *"Please clear the Node.js Selector lock — I get 'Can't acquire lock for app: %(app)s'."*

**实在清不掉也不影响交作业**：只要网站还能访问，说明 Passenger 仍在正常提供服务，
坏的只是 cPanel 的管理按钮。可以先用着，更新代码时再处理。

---

## 7. 部署后如何更新代码

1. 本地改代码 → 照常 commit / push 到 GitHub。
2. File Manager 里把改动过的那个文件夹（`client/`、`admin/` 或 `api/`）
   上传覆盖旧版（提示时选 **Overwrite**）。
3. cPanel → Setup Node.js App → **Restart**。

代码更新不会动数据库，数据不会丢。

---

## 8. 给评分老师的说明（可直接引用）

* Node 进程在**同一个域名**下同时托管两个网站和 API，生产环境没有 CORS 问题。
* `charityevents_db-cpanel.sql` 是唯一需要的数据库文件：建 4 张表、
  全部外键、UNIQUE/CHECK 约束，并插入全部种子数据。
* API 是真正的 RESTful 风格（对 `/api/events` 和 `/api/registrations`
  使用 `GET/POST/PUT/DELETE`），状态码语义正确：创建成功 `201`、
  校验失败 `400`、资源不存在 `404`、业务规则冲突（重复邮箱 / 活动满员 /
  活动仍有报名时删除）返回 `409`。
