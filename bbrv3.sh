#!/usr/bin/env bash

# =========================================================
#  Debian 12+ BBR v3 一键交互式安装脚本 (基于 XanMod 内核)
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

# 检查系统与虚拟化支持
check_sys() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [[ "${ID}" != "debian" && "${ID_LIKE}" != *"debian"* ]]; then
            echo -e "${YELLOW}警告：本脚本专为 Debian 12 及以上系统设计。当前系统为 ${NAME}。${PLAIN}"
            read -rp "是否继续？(y/n): " confirm
            [[ "${confirm}" != "y" && "${confirm}" != "Y" ]] && exit 1
        fi
    fi

    # 虚拟化架构检测
    if command -v systemd-detect-virt >/dev/null 2>&1; then
        VIRT=$(systemd-detect-virt)
        if [[ "$VIRT" == "openvz" || "$VIRT" == "lxc" ]]; then
            echo -e "${RED}错误：当前系统为 ${VIRT} 容器环境，无法自定义更换内核，无法安装 BBRv3。${PLAIN}"
            exit 1
        fi
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

# 配置 sysctl 开启 BBR
enable_bbr_sysctl() {
    echo -e "${GREEN}==> 正在写入 sysctl 配置...${PLAIN}"
    sed -i '/net.core.default_qdisc/d' /etc/sysctl.conf
    sed -i '/net.ipv4.tcp_congestion_control/d' /etc/sysctl.conf

    cat >> /etc/sysctl.conf <<EOF
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
EOF
    sysctl -p >/dev/null 2>&1
    echo -e "${GREEN}==> BBR 配置写入成功。${PLAIN}"
}

# 刷新 GRUB 引导
update_grub_config() {
    echo -e "${GREEN}==> 正在更新 GRUB 启动配置文件...${PLAIN}"
    if [ -f /etc/default/grub ]; then
        sed -i 's/GRUB_DEFAULT=.*/GRUB_DEFAULT=0/' /etc/default/grub
    fi
    update-grub
    echo -e "${GREEN}==> GRUB 引导项更新完成。${PLAIN}"
}

# 模式 1：直连官方 DEB 安装（推荐，解决 APT 源 Release 报错）
install_deb_direct() {
    local auto_level
    auto_level=$(detect_cpu_level)

    echo -e "${YELLOW}当前检测到的 CPU 架构等级为: v${auto_level}${PLAIN}"
    echo "提示：KVM 云服务器/VPS 建议优先选择 1 (x64v1) 获得最佳兼容性。"
    echo "1) linux-xanmod-x64v1 (通用推荐，适用于绝大部分 VPS)"
    echo "2) linux-xanmod-x64v2"
    echo "3) linux-xanmod-x64v3"
    echo "4) linux-xanmod-x64v4"
    read -rp "请输入微架构选项 [1-4] (默认 1): " arch_choice
    arch_choice=${arch_choice:-1}

    local arch_tag="x64v1"
    case $arch_choice in
        1) arch_tag="x64v1" ;;
        2) arch_tag="x64v2" ;;
        3) arch_tag="x64v3" ;;
        4) arch_tag="x64v4" ;;
        *) arch_tag="x64v1" ;;
    esac

    echo -e "${GREEN}==> 正在检查并安装基础依赖...${PLAIN}"
    apt-get update -y && apt-get install -y wget curl dpkg

    local work_dir="/tmp/xanmod_install"
    rm -rf "$work_dir" && mkdir -p "$work_dir" && cd "$work_dir" || exit 1

    local xanmod_ver="6.6.78-xanmod1"
    local img_url="https://sourceforge.net/projects/xanmod/files/releases/main/${xanmod_ver}/linux-image-${xanmod_ver}-${arch_tag}_${xanmod_ver}-1_amd64.deb"
    local hdr_url="https://sourceforge.net/projects/xanmod/files/releases/main/${xanmod_ver}/linux-headers-${xanmod_ver}-${arch_tag}_${xanmod_ver}-1_amd64.deb"

    echo -e "${GREEN}==> 正在直连下载 XanMod 内核包 (${arch_tag})...${PLAIN}"
    wget --no-check-certificate -O linux-image.deb "$img_url" || { echo -e "${RED}下载内核镜像失败，请检查网络！${PLAIN}"; exit 1; }
    wget --no-check-certificate -O linux-headers.deb "$hdr_url" || { echo -e "${RED}下载头文件失败，请检查网络！${PLAIN}"; exit 1; }

    echo -e "${GREEN}==> 正在使用 dpkg 安装内核软件包...${PLAIN}"
    dpkg -i linux-image.deb linux-headers.deb

    enable_bbr_sysctl
    update_grub_config

    rm -rf "$work_dir"

    echo -e "${GREEN}=====================================================${PLAIN}"
    echo -e "${GREEN} XanMod (BBRv3) 内核安装成功！${PLAIN}"
    echo -e "${YELLOW} 系统必须重启后才能加载并生效新内核。${PLAIN}"
    echo -e "${GREEN}=====================================================${PLAIN}"
    read -rp "是否立即重启系统？(y/n): " reboot_now
    if [[ "$reboot_now" == "y" || "$reboot_now" == "Y" ]]; then
        reboot
    fi
}

# 模式 2：使用官方 APT 源安装
install_apt_repo() {
    echo -e "${GREEN}==> 清理旧版 XanMod 配置文件...${PLAIN}"
    rm -f /etc/apt/sources.list.d/xanmod*.list

    echo -e "${GREEN}==> 安装密钥与依赖项...${PLAIN}"
    apt-get update -y && apt-get install -y ca-certificates curl gnupg lsb-release

    mkdir -p /etc/apt/keyrings
    curl -fsSL https://dl.xanmod.org/archive.key | gpg --dearmor -o /etc/apt/keyrings/xanmod-archive-keyring.gpg --yes

    echo -e "${GREEN}==> 写入修补后的 XanMod APT 软件源...${PLAIN}"
    echo 'deb [signed-by=/etc/apt/keyrings/xanmod-archive-keyring.gpg] http://deb.xanmod.org releases main' | tee /etc/apt/sources.list.d/xanmod-release.list

    if ! apt-get update -y; then
        echo -e "${RED}APT 软件源更新失败，请退回主菜单选择选项 1（直连 DEB 包安装）。${PLAIN}"
        read -rp "按回车键返回主菜单..."
        return
    fi

    local auto_level
    auto_level=$(detect_cpu_level)

    read -rp "选择微架构版本 [1-4] (推荐 1 以保障 compatibility, 默认 1): " pkg_choice
    pkg_choice=${pkg_choice:-1}

    local pkg="linux-xanmod-x64v${pkg_choice}"
    echo -e "${GREEN}==> 正在通过 APT 安装 ${pkg} ...${PLAIN}"
    apt-get install -y "$pkg" || { echo -e "${RED}安装失败！${PLAIN}"; return; }

    enable_bbr_sysctl
    update_grub_config

    echo -e "${GREEN}=====================================================${PLAIN}"
    echo -e "${GREEN} XanMod (BBRv3) 内核安装完成！${PLAIN}"
    echo -e "${GREEN}=====================================================${PLAIN}"
    read -rp "是否立即重启系统？(y/n): " reboot_now
    if [[ "$reboot_now" == "y" || "$reboot_now" == "Y" ]]; then
        reboot
    fi
}

# 状态检测
check_status() {
    echo -e "\n${GREEN}=== 系统内核与 BBR 运行状态 ===${PLAIN}"
    local kernel_ver
    kernel_ver=$(uname -r)
    echo -e "当前运行内核: ${YELLOW}${kernel_ver}${PLAIN}"

    local cc
    cc=$(sysctl -n net.ipv4.tcp_congestion_control 2>/dev/null)
    echo -e "当前 TCP 拥塞控制算法: ${YELLOW}${cc}${PLAIN}"

    local qdisc
    qdisc=$(sysctl -n net.core.default_qdisc 2>/dev/null)
    echo -e "当前队列调度算法: ${YELLOW}${qdisc}${PLAIN}"

    if lsmod | grep -q bbr; then
        echo -e "BBR 模块状态: ${GREEN}已加载 (Loaded)${PLAIN}"
    else
        echo -e "BBR 模块状态: ${RED}未加载${PLAIN}"
    fi

    if [[ "$kernel_ver" == *"xanmod"* ]]; then
        echo -e "BBRv3 运行状态: ${GREEN}生效中 (当前内核内置支持 BBRv3)${PLAIN}"
    else
        echo -e "BBRv3 运行状态: ${RED}未生效 (当前运行非 XanMod 内核)${PLAIN}"
    fi
    echo ""
    read -rp "按回车键返回主菜单..."
}

# 主菜单
show_menu() {
    while true; do
        clear
        echo -e "${GREEN}=====================================================${PLAIN}"
        echo -e "${GREEN}   Debian 12+ XanMod (BBR v3) 一键安装交互脚本      ${PLAIN}"
        echo -e "${GREEN}=====================================================${PLAIN}"
        echo -e " 1. 直连下载安装 XanMod DEB 包 (推荐: 彻底避开 APT 报错)"
        echo -e " 2. 使用官方 APT 软件源安装"
        echo -e " 3. 开启/重置 BBR 及 FQ 系统参数"
        echo -e " 4. 强制刷新 GRUB 引导项 (解决重启未生效问题)"
        echo -e " 5. 查看系统内核与 BBR 运行状态"
        echo -e " 0. 退出脚本"
        echo -e "${GREEN}=====================================================${PLAIN}"
        read -rp "请输入数字 [0-5]: " num
        case "$num" in
            1)
                check_root
                check_sys
                install_deb_direct
                ;;
            2)
                check_root
                check_sys
                install_apt_repo
                ;;
            3)
                check_root
                enable_bbr_sysctl
                read -rp "按回车键返回主菜单..."
                ;;
            4)
                check_root
                update_grub_config
                read -rp "按回车键返回主菜单..."
                ;;
            5)
                check_status
                ;;
            0)
                exit 0
                ;;
            *)
                echo -e "${RED}请输入有效的选项 [0-5]${PLAIN}"
                sleep 1
                ;;
        esac
    done
}

show_menu