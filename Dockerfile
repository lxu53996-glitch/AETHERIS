# 使用国内镜像源加速
FROM docker.m.daocloud.io/library/node:20-alpine

WORKDIR /app

# 设置 npm 镜像源 (CRITICAL for CN network)
RUN npm config set registry https://registry.npmmirror.com/

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制项目文件
COPY . .

# 暴露端口
EXPOSE 3000

# 开发模式启动
CMD ["npm", "run", "dev"]
