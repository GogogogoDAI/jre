#!/usr/bin/env bash

# =========================================================
#  Debian 12+ 编译与安装 Google 官方 BBRv3 内核源码脚本
# =========================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
PLAIN='\033[0m'

check_root() {
    if [[ $EUID -ne 0 ]]; then
        echo -e "${RED}错误：必须使用 root 权限运行此脚本！${PLAIN}"
        exit 1
    fi
}

check_sys() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [[ "${ID}" != "debian" && "${ID_LIKE}" != *"debian"* ]]; then
            echo -e "${YELLOW}警告：本脚本专为 Debian 12 设计。当前系统为 ${NAME}。${PLAIN}"
            read -rp "是否继续？(y/n): " confirm
            [[ "${confirm}" != "y" && "${confirm}" != "Y" ]] && exit 1
        fi
    fi
}

# 增加临时 Swap 内存防止编译时因内存不足 (OOM) 导致中断
setup_swap() {
    local mem_total
    mem_total=$(free -m | awk '/Mem:/ {print $2}')
    if [ "$mem_total" -lt 4090 ]; then
        echo -e "${YELLOW}检测到系统内存少于 4GB ($mem_total MB)，正在创建 4GB 临时 Swap 防编译溢出...${PLAIN}"
        dd if=/dev/zero of=/swapfile-bbrv3 bs=1M count=4096 status=progress
        chmod 600 /swapfile-bbrv3
        mkswap /swapfile-bbrv3
        swapon /swapfile-bbrv3
        echo -e "${GREEN}==> 临时 Swap 创建并加载成功。${PLAIN}"
    fi
}

remove_swap() {
    if [ -f /swapfile-bbrv3 ]; then
        echo -e "${GREEN}==> 正在清理临时 Swap 文件...${PLAIN}"
        swapoff /swapfile-bbrv3 2>/dev/null
        rm -f /swapfile-bbrv3
    fi
}

compile_and_install_google_bbrv3() {
    echo -e "${GREEN}==> 1/5 正在安装编译依赖工具套件...${PLAIN}"
    apt-get update -y
    apt-get install -y git build-essential libncurses-dev bison flex libssl-dev \
                       libelf-dev bc rsync debhelper dwarfsrcfiles pahole ca-certificates \
                       cpio kmod

    setup_swap

    local src_dir="/usr/src/google-bbr-v3"
    echo -e "${GREEN}==> 2/5 正在克隆 Google 官方 BBRv3 源码库 (https://github.com/google/bbr.git)...${PLAIN}"
    rm -rf "$src_dir"
    git clone -b v3 --depth 1 https://github.com/google/bbr.git "$src_dir" || {
        echo -e "${RED}克隆 Google 官方 BBR 仓库失败，请检查网络联通性。${PLAIN}"
        remove_swap
        exit 1
    }

    cd "$src_dir" || exit 1

    echo -e "${GREEN}==> 3/5 正在生成内核编译配置文件 (.config)...${PLAIN}"
    if [ -f "/boot/config-$(uname -r)" ]; then
        cp "/boot/config-$(uname -r)" .config
    else
        make defconfig
    fi

    # 自动化修剪与启用 BBR 配置
    scripts/config --enable CONFIG_TCP_CONG_BBR
    scripts/config --enable CONFIG_NET_SCH_FQ
    scripts/config --set-str CONFIG_SYSTEM_TRUSTED_KEYS ""
    scripts/config --set-str CONFIG_SYSTEM_REVOCATION_KEYS ""

    make olddefconfig

    local cores
    cores=$(nproc)
    echo -e "${GREEN}==> 4/5 开始编译 Google 官方 BBRv3 内核 (使用 ${cores} 核心)...${PLAIN}"
    echo -e "${YELLOW}提示：内核编译耗时较长（依 CPU 性能约 15~45 分钟），请耐性等待。${PLAIN}"

    make -j"$cores" bindeb-pkg || {
        echo -e "${RED}内核编译失败！${PLAIN}"
        remove_swap
        exit 1
    }

    echo -e "${GREEN}==> 5/5 正在安装编译生成的 Debian 官方 DEB 内核包...${PLAIN}"
    cd ..
    dpkg -i linux-image-*.deb linux-headers-*.deb

    # 清理临时文件
    remove_swap

    # 写入 sysctl 配置
    sed -i '/net.core.default_qdisc/d' /etc/sysctl.conf
    sed -i '/net.ipv4.tcp_congestion_control/d' /etc/sysctl.conf
    echo "net.core.default_qdisc = fq" >> /etc/sysctl.conf
    echo "net.ipv4.tcp_congestion_control = bbr" >> /etc/sysctl.conf
    sysctl -p >/dev/null 2>&1

    # 更新 GRUB 引导
    if [ -f /etc/default/grub ]; then
        sed -i 's/GRUB_DEFAULT=.*/GRUB_DEFAULT=0/' /etc/default/grub
    fi
    update-grub

    echo -e "${GREEN}=====================================================${PLAIN}"
    echo -e "${GREEN} Google 官方 BBRv3 内核源码编译与安装完成！${PLAIN}"
    echo -e "${GREEN}=====================================================${PLAIN}"
    read -rp "系统需要重启才能生效新内核，是否立即重启？(y/n): " reboot_now
    if [[ "$reboot_now" == "y" || "$reboot_now" == "Y" ]]; then
        reboot
    fi
}

check_status() {
    echo -e "\n${GREEN}=== 系统内核与 BBR 运行检测 ===${PLAIN}"
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
        echo -e "BBR 模块状态: ${GREEN}已加载${PLAIN}"
    else
        echo -e "BBR 模块状态: ${RED}未加载${PLAIN}"
    fi
    echo ""
    read -rp "按回车键返回主菜单..."
}

show_menu() {
    while true; do
        clear
        echo -e "${GREEN}=====================================================${PLAIN}"
        echo -e "${GREEN}  Debian 12+ 编译安装 Google 官方 BBRv3 源码脚本     ${PLAIN}"
        echo -e "${GREEN}=====================================================${PLAIN}"
        echo -e " 1. 从 Google 官方仓库克隆、编译并安装 BBRv3 内核"
        echo -e " 2. 查看当前系统内核与 BBR 运行状态"
        echo -e " 0. 退出脚本"
        echo -e "${GREEN}=====================================================${PLAIN}"
        read -rp "请输入数字 [0-2]: " num
        case "$num" in
            1)
                check_root
                check_sys
                compile_and_install_google_bbrv3
                ;;
            2)
                check_status
                ;;
            0)
                exit 0
                ;;
            *)
                echo -e "${RED}请输入正确的选项 [0-2]${PLAIN}"
                sleep 1
                ;;
        esac
    done
}

show_menu