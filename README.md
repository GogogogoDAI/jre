# 🖥 ClusterMonitor - 轻量级集群服务器探针系统

[![Python](https://img.shields.io/badge/Python-3.7%2B-blue)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Linux%20%7C%20macOS%20%7C%20Windows-lightgrey)]()

纯 Python 标准库实现 | 仅 3 个文件 | NTFY 推送告警 | Web 管理面板

一个极简的集群服务器监控系统。服务端零第三方依赖，Agent 仅需 `psutil`。支持 **CPU、内存、磁盘、温度、网络** 实时监控，**NTFY 告警推送**，单文件 **Web 仪表盘**。

---

## ✨ 为什么选择 ClusterMonitor？

| 对比 | ClusterMonitor | Prometheus+Grafana | Netdata | Zabbix |
|------|---------------|-------------------|---------|--------|
| 部署文件 | 3 个 | 数十个 | 1 个 | 数十个 |
| 依赖 | psutil | Node.js + Go | 大量 C 库 | PHP + MySQL |
| 内存占用 | < 30MB | > 500MB | > 200MB | > 1GB |
| 配置难度 | 零配置 | 复杂 | 简单 | 复杂 |
| 告警推送 | NTFY | AlertManager | 内置 | 内置 |

---

## 🚀 30 秒快速部署

### 一键安装脚本

**服务端（监控主机）：**

```bash
curl -fsSL https://raw.githubusercontent.com/yourname/cluster-monitor/main/install.sh | bash -s server
```

**Agent（被监控节点）：**

```bash
curl -fsSL https://raw.githubusercontent.com/yourname/cluster-monitor/main/install.sh | bash -s agent --server 192.168.1.100:8000
```

将 `192.168.1.100:8000` 替换为你的服务端地址。

### 手动安装

```bash
# 克隆仓库
git clone https://github.com/yourname/cluster-monitor.git
cd cluster-monitor

# 安装依赖（仅 Agent 需要）
pip install psutil

# 启动服务端
python3 server.py

# 在其他节点启动 Agent
python3 agent.py -s http://服务端IP:8000
```

访问 `http://服务端IP:8000` 打开监控面板。

---

## 📊 监控指标

| 指标 | 显示内容 |
|------|----------|
| 🔥 CPU | 使用率百分比 + 核心数 |
| 🌡 温度 | CPU 温度 + 状态（⚠️高温 / 🌤正常 / ❄️低温） |
| 💾 磁盘 | 使用率 + 已用/总容量 |
| 🧠 内存 | 使用率 + 已用/总容量 |
| ⏱ 运行时间 | 系统启动时长（天/时/分） |
| 🌐 网络 | 实时上下行速率 |
| ⚡ 负载 | 1分钟 / 5分钟 / 15分钟平均负载 |

---

## 📁 项目结构

```
cluster-monitor/
├── server.py          # 服务端（纯标准库，单文件）
├── agent.py           # 探针（仅依赖 psutil）
├── dashboard.html     # Web 面板（单文件）
├── install.sh         # 一键安装脚本
├── config.json        # 服务端配置（自动生成）
├── agent_config.json  # Agent 配置（自动生成）
├── cluster.db         # SQLite 数据库（自动生成）
└── README.md
```

---

## ⚙️ 配置说明

### 服务端配置 (config.json)

首次启动自动生成，也可在 Web 面板「全局设置」中修改。

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
| `port` | 8000 | 服务端口（修改后需重启） |
| `ntfy_server` | https://ntfy.sh | NTFY 推送服务器地址 |
| `ntfy_default_topic` | cluster-alerts | 默认推送 Topic |
| `check_interval` | 30 | 告警检查间隔（秒） |
| `offline_timeout` | 120 | 离线判定超时（秒） |
| `alert_retention_days` | 30 | 告警保留天数（-1=永久） |

### Agent 配置 (agent_config.json)

Agent 首次运行自动生成。

```json
{
  "server": "http://localhost:8000",
  "node_id": "web-server-01",
  "interval": 10
}
```

---

## 🔔 NTFY 告警

支持 [NTFY](https://ntfy.sh/) 推送，每个节点可独立配置告警阈值和冷却时间。面板内提供测试推送功能。

**推送事件：**

| 事件 | 触发条件 |
|------|----------|
| 🟢 节点上线 | 新节点首次连接或离线恢复 |
| 🔴 节点离线 | 超过离线超时未上报 |
| 🚨 CPU 告警 | 使用率超过阈值 |
| 🚨 温度告警 | 温度超过阈值 |
| 🚨 磁盘告警 | 磁盘使用率超过阈值 |
| 🚨 内存告警 | 内存使用率超过阈值 |
| 🚨 网络告警 | 网络流量超过阈值 |

---

## 🛠 命令行参数

### server.py

| 参数 | 说明 |
|------|------|
| `--daemon, -d` | 后台守护进程运行 |
| `--stop` | 停止后台服务 |
| `--status` | 查看服务状态 |

### agent.py

| 参数 | 说明 |
|------|------|
| `-s, --server` | 服务端地址 |
| `-n, --node-id` | 节点 ID（默认主机名） |
| `-i, --interval` | 采集间隔（秒，默认 10） |
| `--daemon, -d` | 后台守护进程运行 |
| `--stop` | 停止 Agent |
| `--restart` | 重启 Agent |
| `--status` | 查看运行状态 |
| `--test` | 测试采集并输出 JSON |
| `--skip-check` | 跳过节点 ID 冲突检测 |

---

## 🔧 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/nodes` | 获取所有节点 |
| GET | `/api/nodes/{id}/exists` | 检查节点是否存在 |
| POST | `/api/nodes/{id}/metrics` | 上报指标 |
| POST | `/api/nodes/{id}/rename` | 重命名节点 |
| PUT | `/api/nodes/{id}/config` | 更新节点配置 |
| DELETE | `/api/nodes/{id}` | 删除节点 |
| GET | `/api/alerts` | 获取告警历史 |
| GET | `/api/alerts/count` | 告警总数 |
| POST | `/api/test-ntfy` | 测试 NTFY 推送 |
| GET/POST | `/api/config` | 全局配置 |

---

## 🐳 systemd 部署

安装脚本会自动创建 systemd 服务，也可手动创建：

**服务端** (`/etc/systemd/system/cluster-monitor.service`)：

```ini
[Unit]
Description=Cluster Monitor Server
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /opt/cluster-monitor/server.py
Restart=always

[Install]
WantedBy=multi-user.target
```

**Agent** (`/etc/systemd/system/cluster-agent.service`)：

```ini
[Unit]
Description=Cluster Monitor Agent
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /opt/cluster-monitor/agent.py -s http://192.168.1.100:8000
Restart=always

[Install]
WantedBy=multi-user.target
```

启用服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now cluster-monitor
sudo systemctl enable --now cluster-agent
```

---

## 📄 开源协议

MIT License © 2024

详见 [LICENSE](LICENSE) 文件。

---

## 🙏 鸣谢

- [psutil](https://github.com/giampaolo/psutil) - 跨平台系统监控库
- [NTFY](https://ntfy.sh/) - 开源推送通知服务
