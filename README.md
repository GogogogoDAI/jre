# Server_Probe
服务器探针
# 🖥 ClusterMonitor - 轻量级集群服务器探针系统

[![Python](https://img.shields.io/badge/Python-3.7%2B-blue)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Linux%20%7C%20macOS%20%7C%20Windows-lightgrey)]()

一个极简的集群服务器监控系统，使用 Python 标准库开发，仅依赖 `psutil`。支持 CPU、内存、磁盘、温度、网络监控，NTFY 实时告警推送，Web 管理面板。

![Dashboard](https://via.placeholder.com/800x400/0d1117/58a6ff?text=ClusterMonitor+Dashboard)

## ✨ 特性

- 🚀 **极简轻量** - 服务端仅使用 Python 标准库，Agent 仅依赖 `psutil`
- 📊 **全面监控** - CPU使用率、温度、磁盘、内存、网络流量、系统负载
- 🔔 **实时告警** - 支持 [NTFY](https://ntfy.sh/) 推送，每个节点独立配置阈值和冷却时间
- 🌐 **Web面板** - 单文件 HTML 仪表盘，自动刷新，支持重命名节点
- 🟢🔴 **上下线通知** - 新节点上线、离线自动推送通知
- 📋 **告警历史** - 持久化存储，支持设置保留天数或永久保留
- 🔄 **自动发现** - Agent 首次运行自动生成配置，自动检测 node_id 冲突
- 🖥 **系统信息** - 自动识别 Linux 发行版、IP地址、CPU核心数
- 🎛️ **守护进程** - 服务端和 Agent 均支持后台运行
- 📦 **单文件部署** - 服务端 + 面板 + Agent 仅 3 个文件

## 📊 监控指标

| 指标 | 说明 |
|------|------|
| 🔥 CPU | 使用率百分比 + 核心数 |
| 🌡 温度 | CPU温度 + 状态（高温/正常/低温） |
| 💾 磁盘 | 使用率 + 已用/总容量 |
| 🧠 内存 | 使用率 + 已用/总容量 |
| ⏱ 运行时间 | 系统启动时长 |
| 🌐 网络 | 实时网络速率 |
| ⚡ 负载 | 1分钟/5分钟/15分钟平均负载 |

## 🚀 快速开始

### 环境要求

- Python 3.7+
- `psutil`（仅 Agent 需要）

### 一键安装 (推荐)

项目提供了一键安装脚本 `install.sh`，可在全新 Linux 服务器上自动部署服务端或 Agent，无需手动配置。

#### 安装服务端

```bash
curl -fsSL https://raw.githubusercontent.com/yourname/cluster-monitor/main/install.sh | bash -s server
```

#### 安装 Agent

```bash
curl -fsSL https://raw.githubusercontent.com/yourname/cluster-monitor/main/install.sh | bash -s agent --server 192.168.1.100:8000
```

将 `192.168.1.100:8000` 替换为你的服务端地址。

**自定义参数：**

```bash
# 指定节点名称和采集间隔
curl -fsSL https://.../install.sh | bash -s agent --server 192.168.1.100:8000 --name web-01 --interval 5
```

脚本会自动完成 Python 环境检测、依赖安装、文件下载、systemd 服务创建及启动。

### 手动安装

```bash
# 克隆仓库
git clone https://github.com/yourname/cluster-monitor.git
cd cluster-monitor

# 安装依赖（仅Agent需要）
pip install psutil
```

### 启动服务端

```bash
# 前台运行（查看日志）
python3 server.py

# 后台守护进程运行
python3 server.py --daemon

# 查看状态
python3 server.py --status

# 停止服务
python3 server.py --stop
```

访问 `http://服务器IP:8000` 打开监控面板。

### 启动 Agent（在各节点上运行）

```bash
# 首次运行自动生成配置，自动检测node_id冲突
python3 agent.py -s http://服务端IP:8000

# 后台运行
python3 agent.py -s http://服务端IP:8000 --daemon

# 指定节点ID和采集间隔
python3 agent.py -s http://192.168.1.100:8000 -n web-server-01 -i 5

# 测试采集
python3 agent.py --test

# 查看状态
python3 agent.py --status

# 停止
python3 agent.py --stop
```

### 一键脚本参数说明 (install.sh)

| 参数 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `server` | 二选一 | 安装服务端 | `bash install.sh server` |
| `agent` | 二选一 | 安装 Agent | `bash install.sh agent --server ...` |
| `--server` | Agent 必填 | 服务端地址 | `--server 192.168.1.100:8000` |
| `--name` | 可选 | 节点名称（默认主机名） | `--name web-01` |
| `--interval` | 可选 | 采集间隔秒数（默认 10） | `--interval 5` |

## 📁 项目结构

```
cluster-monitor/
├── server.py          # 服务端（纯标准库）
├── agent.py           # Agent探针（依赖psutil）
├── dashboard.html     # Web管理面板
├── install.sh         # 一键安装脚本
├── config.json        # 服务端配置文件（自动生成）
├── agent_config.json  # Agent配置文件（自动生成）
├── cluster.db         # SQLite数据库（自动生成）
└── README.md
```

## ⚙️ 配置说明

### 服务端配置 (config.json)

```json
{
  "port": 8000,
  "ntfy_server": "https://ntfy.sh",
  "ntfy_default_topic": "cluster-alerts",
  "check_interval": 30,
  "offline_timeout": 120,
  "alert_retention_days": 30
}
```

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `port` | 8000 | 服务端口 |
| `ntfy_server` | https://ntfy.sh | NTFY推送服务器 |
| `ntfy_default_topic` | cluster-alerts | 默认推送Topic |
| `check_interval` | 30 | 告警检查间隔（秒） |
| `offline_timeout` | 120 | 离线判定超时（秒） |
| `alert_retention_days` | 30 | 告警保留天数（-1=永久） |

### Agent配置 (agent_config.json)

```json
{
  "server": "http://localhost:8000",
  "node_id": "web-server-01",
  "interval": 10,
  "daemon": false,
  "log_file": "",
  "pid_file": "/tmp/cluster-agent.pid"
}
```

## 🔔 NTFY 告警配置

1. 在全局设置中配置 NTFY 服务器地址和默认 Topic
2. 每个节点可独立设置告警阈值和冷却时间
3. 支持告警类型：CPU、温度、磁盘、内存、网络
4. 点击"测试推送"验证配置

**NTFY 推送示例：**

```
🟢 web-server-01 上线
━━━━━━━━━━━━━━
节点ID: web-server-01
系统: Ubuntu 22.04.3 LTS
IP: 192.168.1.100
时间: 2024-01-15 10:30:00

🔴 web-server-01 离线
━━━━━━━━━━━━━━
节点ID: web-server-01
离线: 5分钟

🚨 web-server-01
CPU使用率: 95% (阈值: 90%)
```

## 🖥 面板功能

- **节点监控** - 实时指标卡片，按添加顺序排列
- **告警历史** - 查看所有告警记录
- **节点重命名** - 自定义显示名称
- **独立配置** - 每个节点独立设置告警阈值
- **立即刷新** - 手动刷新按钮
- **全局设置** - NTFY配置、服务参数、告警保留策略

## 🛠 命令行参数

### server.py

| 参数 | 说明 |
|------|------|
| `--daemon, -d` | 后台守护进程模式 |
| `--stop` | 停止后台服务 |
| `--status` | 查看服务状态 |

### agent.py

| 参数 | 说明 |
|------|------|
| `-s, --server` | 服务端地址 |
| `-n, --node-id` | 节点ID（默认自动识别） |
| `-i, --interval` | 采集间隔秒数（默认10） |
| `-l, --log-file` | 日志文件路径 |
| `--daemon, -d` | 后台守护进程模式 |
| `--stop` | 停止Agent |
| `--restart` | 重启Agent |
| `--status` | 查看运行状态 |
| `--test` | 测试采集并输出JSON |
| `--show-config` | 显示当前配置 |
| `--skip-check` | 跳过节点ID冲突检测 |

## 🔧 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/nodes` | 获取所有节点 |
| GET | `/api/nodes/{id}/exists` | 检查节点是否存在 |
| POST | `/api/nodes/{id}/metrics` | 上报指标数据 |
| POST | `/api/nodes/{id}/rename` | 重命名节点 |
| PUT | `/api/nodes/{id}/config` | 更新节点配置 |
| DELETE | `/api/nodes/{id}` | 删除节点 |
| GET | `/api/alerts` | 获取告警列表 |
| GET | `/api/alerts/count` | 获取告警总数 |
| POST | `/api/test-ntfy` | 测试NTFY推送 |
| GET/POST | `/api/config` | 全局配置 |

## 🐳 Docker 部署

```bash
# 服务端
docker run -d --name cluster-monitor \
  -p 8000:8000 \
  -v $(pwd)/data:/app \
  python:3-alpine \
  sh -c "pip install psutil && python /app/server.py"

# Agent
docker run -d --name cluster-agent \
  --net=host \
  --pid=host \
  -v $(pwd)/data:/app \
  python:3-alpine \
  sh -c "pip install psutil && python /app/agent.py -s http://服务端IP:8000"
```

## 📝 更新日志

### v1.0.0

- 初始版本
- 支持 CPU/内存/磁盘/温度/网络监控
- NTFY 告警推送
- Web 管理面板
- 守护进程模式
- 节点重命名
- 告警保留策略
- 一键安装脚本

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 开源协议

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 鸣谢

- [psutil](https://github.com/giampaolo/psutil) - 跨平台系统监控库
- [NTFY](https://ntfy.sh/) - 开源推送通知服务
