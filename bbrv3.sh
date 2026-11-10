#!/usr/bin/env bash

# =========================================================
#  Debian 12+ BBR v3 一键安装与配置脚本 (基于 XanMod 内核)
# =========================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
PLAIN='\033[0m'

# 检查是否为 Root 用户
check_root() {
    if [[ $EUID -ne 0 ]]; then
        echo -e "${RED}错误：必须使用 root 权限运行此脚本！${PLAIN}"
        exit 1
    fi
}

# 检查系统版本
check_sys() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [[ "${ID}" != "debian" && "${ID_LIKE}" != *"debian"* ]]; then
            echo -e "${YELLOW}警告：本脚本专为 Debian 12 及以上系统设计。当前系统为 ${NAME}。${PLAIN}"
            read -rp "是否继续安装？(y/n): " confirm
            [[ "${confirm}" != "y" && "${confirm}" != "Y" ]] && exit 1
        fi
    else
        echo -e "${RED}无法识别当前操作系统类型。${PLAIN}"
        exit 1
    fi
}

# CPU x86-64 微架构等级检测
detect_cpu_level() {
    local flags
    flags=$(cat /proc/cpuinfo)
    
    local level=1
    if echo "$flags" | grep -q "cx16" && echo "$flags" | grep -q "popcnt" && echo "$flags" | grep -q "sse4_1" && echo "$flags" | grep -q "sse4_2" && echo "$flags" | grep -q "ssse3"; then
        level=2
    fi
    if echo "$flags" | grep -q "avx" && echo "$flags" | grep -q "avx2" && echo "$flags" | grep -q "bmi1" && echo "$flags" | grep -q "bmi2" && echo "$flags" | grep -q "fma"; then
        level=3
    fi
    if echo "$flags" | grep -q "avx512f" && echo "$flags" | grep -q "avx512bw" && echo "$flags" | grep -q "avx512cd" && echo "$flags" | grep -q "avx512dq" && echo "$flags" | grep -q "avx512vl"; then
        level=4
    fi
    echo "$level"
}

# 安装 BBR v3 内核 (XanMod)
install_bbrv3() {
    echo -e "${GREEN}==> 正在准备安装依赖项...${PLAIN}"
    apt-get update -y
    apt-get install -y wget curl gnupg lsb-release ca-certificates

    echo -e "${GREEN}==> 添加 XanMod APT 存储库密钥...${PLAIN}"
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://dl.xanmod.org/archive.key | gpg --dearmor -o /etc/apt/keyrings/xanmod-archive-keyring.gpg --yes

    echo -e "${GREEN}==> 添加 XanMod 存储库列表...${PLAIN}"
    echo 'deb [signed-by=/etc/apt/keyrings/xanmod-archive-keyring.gpg] http://deb.xanmod.org releases main' | tee /etc/apt/sources.list.d/xanmod-release.list

    apt-get update -y

    local auto_level
    auto_level=$(detect_cpu_level)

    echo -e "${YELLOW}检测到的 CPU 架构等级为: v${auto_level}${PLAIN}"
    echo "请选择要安装的 XanMod 内核版本 (BBRv3):"
    echo "1) linux-xanmod-x64v1 (适用于较旧 CPU)"
    echo "2) linux-xanmod-x64v2 (推荐大部分旧款 VPS)"
    echo "3) linux-xanmod-x64v3 (推荐主流近几年的 VPS/服务器)"
    echo "4) linux-xanmod-x64v4 (支持 AVX-512 的高性能 CPU)"
    echo "5) 自动匹配 (推荐: v${auto_level})"
    read -rp "请输入选项 [1-5] (默认 5): " kernel_choice
    kernel_choice=${kernel_choice:-5}

    case $kernel_choice in
        1) pkg="linux-xanmod-x64v1" ;;
        2) pkg="linux-xanmod-x64v2" ;;
        3) pkg="linux-xanmod-x64v3" ;;
        4) pkg="linux-xanmod-x64v4" ;;
        5) pkg="linux-xanmod-x64v${auto_level}" ;;
        *) pkg="linux-xanmod-x64v${auto_level}" ;;
    esac

    echo -e "${GREEN}==> 正在安装内核软件包: ${pkg} ...${PLAIN}"
    apt-get install -y "$pkg"

    # 应用 sysctl 配置
    enable_bbr_sysctl

    echo -e "${GREEN}=====================================================${PLAIN}"
    echo -e "${GREEN} BBR v3 内核安装完成！<sup></sup>${PLAIN}"
    echo -e "${YELLOW} 注意：系统需要重启才能生效新内核。${PLAIN}"
    echo -e "${GREEN}=====================================================${PLAIN}"
    read -rp "是否立即重启系统？(y/n): " reboot_now
    if [[ "$reboot_now" == "y" || "$reboot_now" == "Y" ]]; then
        reboot
    fi
}

# 开启 BBR 网络参数配置
enable_bbr_sysctl() {
    echo -e "${GREEN}==> 正在配置 /etc/sysctl.conf ...${PLAIN}"
    
    # 移除已有的相关配置
    sed -i '/net.core.default_qdisc/d' /etc/sysctl.conf
    sed -i '/net.ipv4.tcp_congestion_control/d' /etc/sysctl.conf
    sed -i '/net.ipv4.tcp_ecn/d' /etc/sysctl.conf

    # 写入新参数
    cat >> /etc/sysctl.conf <<EOF
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
EOF

    sysctl -p >/dev/null 2>&1
    echo -e "${GREEN}==> BBR 配置写入成功。${PLAIN}"
}

# 检查当前 BBR 运行状态
check_status() {
    echo -e "\n${GREEN}=== 当前系统状态检测 ===${PLAIN}"
    
    # 内核版本
    local kernel_ver
    kernel_ver=$(uname -r)
    echo -e "当前运行内核: ${YELLOW}${kernel_ver}${PLAIN}"

    # 拥塞控制算法
    local cc
    cc=$(sysctl -n net.ipv4.tcp_congestion_control 2>/dev/null)
    echo -e "当前 TCP 拥塞控制算法: ${YELLOW}${cc}${PLAIN}"

    # 队列调度算法
    local qdisc
    qdisc=$(sysctl -n net.core.default_qdisc 2>/dev/null)
    echo -e "当前队列调度算法: ${YELLOW}${qdisc}${PLAIN}"

    # 检查 BBR 模块加载
    if lsmod | grep -q bbr; then
        echo -e "BBR 模块状态: ${GREEN}已加载 (Loaded)${PLAIN}"
    else
        echo -e "BBR 模块状态: ${RED}未加载${PLAIN}"
    fi

    if [[ "$kernel_ver" == *"xanmod"* ]]; then
        echo -e "BBR 版本检测: ${GREEN}运行中 (XanMod 内核内置 BBRv3 支持)${PLAIN}"
    else
        echo -e "BBR 版本检测: ${YELLOW}非 XanMod 内核 (若为系统原生内核则通常为 BBRv1)${PLAIN}"
    fi
    echo ""
}

# 菜单界面
show_menu() {
    clear
    echo -e "${GREEN}=========================================${PLAIN}"
    echo -e "${GREEN}  Debian 12+ 一键安装与配置 BBR v3 脚本  ${PLAIN}"
    echo -e "${GREEN}=========================================${PLAIN}"
    echo -e " 1. 安装 XanMod 内核并开启 BBR v3"
    echo -e " 2. 仅应用 BBR 参数配置 (sysctl)"
    echo -e " 3. 查看当前内核与 BBR 运行状态"
    echo -e " 0. 退出脚本"
    echo -e "${GREEN}=========================================${PLAIN}"
    read -rp "请输入数字 [0-3]: " num
    case "$num" in
        1)
            check_root
            check_sys
            install_bbrv3
            ;;
        2)
            check_root
            enable_bbr_sysctl
            check_status
            ;;
        3)
            check_status
            ;;
        0)
            exit 0
            ;;
        *)
            echo -e "${RED}请输入正确的数字 [0-3]${PLAIN}"
            sleep 1
            show_menu
            ;;
    esac
}

show_menu