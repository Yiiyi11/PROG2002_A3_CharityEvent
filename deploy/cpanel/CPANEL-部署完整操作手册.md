# Charity Events A3 — cPanel 完整部署操作手册

_版本：2026-10-21（整合了今天实际遇到的所有问题）_
_适用：团队两位成员各自部署到自己账号（yzhou58 / jshen317），步骤完全相同_

> **总览：整个部署 = 7 个阶段。** 顺利的话 30–45 分钟。
> 每个阶段末尾有 ✅ 检查点，没过检查点不要进下一阶段。

---

## 阶段 0：准备（2 分钟）

| 要确认的 | 说明 |
|---|---|
| cPanel 能登录 | 查收 SCU 邮箱获取账号，每人一个，**不能共用** |
| 部署包在手 | `Yiiyi11A3-cpanel-v2.zip`（注意是 **v2**，不是旧的） |
| 记下你的 cPanel 用户名 | 例如 `yzhou58`、`jshen317`——后面所有路径都要用到 |

> 本文统一用 `<user>` 代表你的 cPanel 用户名。**看的时候替换成自己的。**

---

## 阶段 1：上传代码（5 分钟）

1. cPanel → **File Manager**
2. 进入 `/home/<user>/`（就是登录后默认的位置）
3. 点左上角 **+ Folder**，新建文件夹：`charityevent`
4. 进入 `charityevent/` → 点 **Upload** → 上传 `Yiiyi11A3-cpanel-v2.zip`
5. 回到 File Manager → 右键 zip → **Extract** → 解压到 `/home/<user>/charityevent`
6. **删除**解压完的 zip 文件（省磁盘配额）

### ✅ 检查点 1（防止 500 的第一道关）

解压后 `charityevent/` 的**第一层**必须直接看到这些：

```
app.js                       ← 必须在这一层，不能多套一层文件夹
package.json
charityevents_db-cpanel.sql
MANIFEST.txt                 ← v2 包新增
api/    client/    admin/
```

然后打开 `MANIFEST.txt` 核对文件数：

- `api` = **9** 个文件
- `client` = **42** 个文件
- `admin` = **19** 个文件

> ⚠️ 如果 `app.js` 在类似 `charityevent/Yiiyi11A3-cpanel-v2/` 的子文件夹里，
> 进去全选 → **Move** 到 `charityevent/` 第一层。
> 文件数对不上就重新解压，缺文件是后面 500 报错的第一大原因。

---

## 阶段 2：创建数据库并导入数据（10 分钟）

> cPanel **不允许**用 SQL 建库，所以必须先在这里手动建。
> `charityevents_db-cpanel.sql` 特意不带 `CREATE DATABASE`，就是为了这一步。

1. cPanel → **MySQL Databases**
2. **Create New Database**：名字填 `charityevents`
   → 实际创建为 **`<user>_charityevents`**（前缀自动加）
   → **把完整名字抄下来**
3. 同页 **Add New User**：用户名填 `charityadm`，密码用 **Password Generator**
   → 实际创建为 **`<user>_charityadm`**
   → **把用户名和密码抄下来**
4. 同页 **Add User To Database**：选用户 + 选库 → **Add** → 勾 **ALL PRIVILEGES** → **Make Changes**
5. cPanel → **phpMyAdmin**
   → 左侧栏**点选** `<user>_charityevents`（⚠️ 必须先点选再导入）
   → **Import** 标签 → **Choose File** → `charityevents_db-cpanel.sql` → 拉到底 → **Go**

### ✅ 检查点 2

- 提示 *"Import has been successfully finished, 32 queries executed."*
- 左侧出现 4 张表，行数核对：

| 表 | 行数 |
|---|---|
| categories | 6 |
| charity_organisations | 3 |
| events | 13 |
| registrations | 18 |

> **#1044 Access denied** → 导入前没点选数据库，点左库名再 Import
> **#1273 Unknown collation** → 记事本打开 .sql，`utf8mb4_unicode_ci` 全替换为 `utf8mb4_general_ci` 再导

---

## 阶段 3：创建 Node.js 应用（5 分钟）

cPanel → **Setup Node.js App** → **Create Application**，按下表填写：

| 字段 | 填什么 | 为什么 |
|---|---|---|
| Node.js version | **18.20.8** | 与 package.json engines 一致 |
| Application mode | **Production** | 只影响 NODE_ENV，但按规范来 |
| Application root | `charityevent` | 相对于 /home/<user>/ |
| **Application URL** | 域名，**路径一格留空！** | ❌ 填 `api` 会把应用挂到 /api 子路径，网站全丢（实际踩过） |
| Application startup file | **`app.js`** | ❌ 不要填 api/server.js，Passenger 要求导出 app |
| Passenger log file | `/home/<user>/passenger.log` | 可选但强烈建议，出错时看得见日志 |

点 **Create**。

---

## 阶段 4：配置环境变量（3 分钟）

进入刚建的应用详情页 → **Environment variables** 区块，加 5 条：

| Name | Value |
|---|---|
| `DB_HOST` | `localhost` |
| `DB_NAME` | `<user>_charityevents` ← 阶段 2 抄下来的完整库名 |
| `DB_USER` | `<user>_charityadm` ← 完整用户名 |
| `DB_PASSWORD` | 阶段 2 生成的密码 |
| `NODE_ENV` | `production` |

填完 **SAVE**。

> 说明：用 UI 配置就**不需要**再建 `.env` 文件，两种方式代码都支持，不要同时配
> 两份不一样的值。
> ⚠️ 别把带密码的页面截图发到群里。

---

## 阶段 5：安装依赖并启动（5 分钟）

在应用详情页，**严格按顺序、每个按钮只按一次**：

```
① Run NPM Install     → 等 "npm install completed"（转圈时不要碰任何按钮）
② RESTART             → 一次
```

> 🚫 **绝对不要点 "Run JS script" 或 "Run NPM Script → start"**。
> `app.js` 是常驻服务不会退出，点了它 cPanel 会永远等待并留下 `.lock` 锁文件，
> 之后所有按钮全部报 `Can't acquire lock for app`（实际踩过，修复见附录 A）。

---

## 阶段 6：验证部署（5 分钟）

把 `<domain>` 换成你的域名（如 `24833219.it.scu.edu.au`），**按顺序**开：

| # | 地址 | 应该看到 | 失败说明 |
|---|---|---|---|
| 1 | `https://<domain>/api/health` | JSON `"status":"up"` | 应用没起来 → 附录 B |
| 2 | `https://<domain>/api/events/home` | JSON，含 12 条活动 | 库/账号问题 → 附录 C（**health 不查库，这条才真正测数据库**） |
| 3 | `https://<domain>/` | 首页 13 张活动卡片 | 空白但接口正常 → 清浏览器 localStorage 的 `charityApiBase` 后 Ctrl+F5 |
| 4 | `https://<domain>/admin/` | 管理后台仪表盘 | 同上 |
| 5 | `https://<domain>/weather.html` | 7 天天气预报 | 空白多为外网不可达，不影响评分主体 |

### ✅ 最终检查点

1–4 全部通过 = 部署完成。把这个地址交到 Blackboard（每人交自己那套）。

---

## 阶段 7：以后更新代码（3 分钟）

1. 本地改完 → push 到 GitHub
2. File Manager 里把改动的文件夹（`client/` / `admin/` / `api/`）上传覆盖旧版（选 Overwrite）
3. Setup Node.js App → **RESTART**

代码更新不动数据库，数据不会丢。

---
---

# 附录：故障速查（都是实际遇到过的）

## A. `Can't acquire lock for app: xxx`（或 `%(app)s`）

**原因**：点了 Run JS script / Run NPM Script → start，常驻进程永不退出，锁没释放。
（`%(app)s` 是 cPanel 模板没替换变量，本质同一把锁。）

**修复**：

1. File Manager → Settings → 勾 **Show Hidden Files**
2. 到 `/home/<user>/nodevenv/charityevent/` 和它的 `18.20.8/` 子目录，
   删掉所有 `.lock` 文件
3. Setup Node.js App → **Stop App** → **Start App**

有 **Terminal** 的话更快：

```bash
pkill -9 -u $USER -f node 2>/dev/null
find ~/nodevenv -name "*.lock" -delete
```

清不掉 → 发工单给 SCU IT Service Desk，说明应用名 + 域名 + 报错原文。

## B. 装完模块后报 500（"check availability of application has failed"）

含义：Node 进程起来了，但请求时崩了。按嫌疑排查：

1. **文件不完整/层级不对** → 回检查点 1 核对 MANIFEST（9/42/19 + app.js 在第一层）
2. **磁盘配额满** → cPanel 首页看 Disk Usage，满了清空间后重新 Run NPM Install
3. 都正常还 500 → 看日志：应用列表里的 **Log / stderr.log** 链接，第一行就是答案：
   - `Cannot find module 'express'` → 依赖没装全 → 重新 Run NPM Install
   - `Cannot find module './routes/events'` → api/ 文件缺 → 重新上传覆盖
4. 日志看不懂 → 截图发给能看代码的人（或我）

## C. health 正常但 `/api/events/home` 报错

数据库问题，逐项核对：

| 报错 | 原因 | 解决 |
|---|---|---|
| `ER_ACCESS_DENIED_ERROR` | 用户没授权到库 | MySQL Databases → Add User To Database → ALL PRIVILEGES |
| `ER_BAD_DB_ERROR` | DB_NAME 少了 `<user>_` 前缀 | 抄 MySQL Databases 页面上的完整名字 |
| `ER_NO_SUCH_TABLE` | SQL 没导入/导错库 | phpMyAdmin 先点选库再 Import |

## D. 页面能开但不显示数据，控制台一堆 `localhost:3000`

浏览器缓存了旧地址：DevTools → Application → Local Storage → 删 `charityApiBase`
→ Ctrl+F5 强刷。（v2 包已彻底修掉这个逻辑，新部署不会再出现，只在升级旧部署时可能见到。）

---

## 部署完成后还剩什么（对照 submission checklist）

- [ ] **另一位成员**按本手册把自己的那套也部署完（两套都要能公开访问）
- [ ] 演示视频（≤15 分钟，传 SCU OneDrive）
- [ ] Peer evaluation form（各自单独发邮件给 tutor，标题 `PROG2002_A3_[TeamID]_[姓名]`）
- [ ] GenAI 使用声明
- [ ] Blackboard 提交：3 个代码 zip + GitHub 链接 + 视频链接 + 两个 cPanel 地址
