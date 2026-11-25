#!/usr/bin/env bash
# Chạy 1 lần trên EC2 mới (Amazon Linux 2023 hoặc Ubuntu 22.04/24.04): bash setup.sh
set -euo pipefail

COMPOSE_VERSION="v2.29.7"

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
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' EXIT
  base_url="https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}"
  bin="docker-compose-linux-${arch}"
  curl -fsSL "${base_url}/${bin}" -o "${tmp_dir}/${bin}"
  curl -fsSL "${base_url}/${bin}.sha256" -o "${tmp_dir}/${bin}.sha256"
  (cd "$tmp_dir" && sha256sum -c "${bin}.sha256")
  sudo mkdir -p /usr/local/lib/docker/cli-plugins
  sudo install -m 0755 "${tmp_dir}/${bin}" /usr/local/lib/docker/cli-plugins/docker-compose
elif command -v apt-get >/dev/null; then      # Ubuntu / Debian (cài qua kho APT chính thức có chữ ký GPG)
  # shellcheck source=/dev/null
  . /etc/os-release
  case "${ID:-}" in
    ubuntu|debian) ;;
    *) echo "Cảnh báo: chỉ hỗ trợ chính thức Ubuntu/Debian hoặc Amazon Linux 2023 (phát hiện ID=${ID:-unknown})." >&2; exit 1 ;;
  esac
  sudo apt-get update -qq
  sudo apt-get install -y ca-certificates curl gnupg git
  sudo install -m 0755 -d /etc/apt/keyrings
  sudo curl -fsSL "https://download.docker.com/linux/${ID}/gpg" -o /etc/apt/keyrings/docker.asc
  sudo chmod a+r /etc/apt/keyrings/docker.asc
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update -qq
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo systemctl enable --now docker
else
  echo "Không tìm thấy dnf hoặc apt-get. Hãy cài Docker và Docker Compose plugin thủ công." >&2
  exit 1
fi

sudo usermod -aG docker "$USER"
echo "Xong. Lưu ý: hãy đăng xuất và đăng nhập lại (hoặc chạy 'newgrp docker') để dùng docker không cần sudo."
