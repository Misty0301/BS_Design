# 使用官方Node.js LTS版本作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制依赖文件并安装依赖
COPY package.json package-lock.json ./
RUN apk add --no-cache python3 make g++ bash
RUN npm config set registry https://registry.npmmirror.com
RUN npm install --production

# 复制所有源代码
COPY . .

# 暴露后端服务端口（假设为5000，根据实际情况调整）
EXPOSE 5000

# 启动后端服务
CMD ["node", "server.js"]
