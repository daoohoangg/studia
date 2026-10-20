#!/usr/bin/env bash
# Chạy 1 lần trên EC2 mới (Amazon Linux 2023 hoặc Ubuntu 22.04/24.04): bash setup.sh
set -euo pipefail

# Swap 2 GB (bắt buộc nếu máy chỉ 1-2 GB RAM, tránh OOM khi xử lý PDF)
if ! swapon --show | grep -q /swapfile; then
  sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

if command -v dnf >/dev/null; then           # Amazon Linux 2023
  sudo dnf install -y docker git
  sudo systemctl enable --now docker
  case "$(uname -m)" in aarch64) arch=aarch64 ;; *) arch=x86_64 ;; esac
  sudo mkdir -p /usr/local/lib/docker/cli-plugins
  sudo curl -fsSL "https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-$arch" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
else                                          # Ubuntu / Debian
  curl -fsSL https://get.docker.com | sudo sh
  sudo apt-get install -y git
fi
sudo usermod -aG docker "$USER"
echo "Xong. Đăng xuất/đăng nhập lại để dùng docker không cần sudo."
