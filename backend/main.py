"""
北京看房地图 - 后端主入口

第二阶段：增加数据库和房屋API
"""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import uvicorn

from routers import houses, tags

# ========================================
# 创建 FastAPI 应用
# ========================================
app = FastAPI(
    title="北京看房地图",
    description="一个基于地图的看房记录系统",
    version="0.2.0"
)

# ========================================
# CORS中间件（允许前端跨域请求）
# ========================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========================================
# 获取项目路径
# ========================================
BACKEND_DIR = Path(__file__).parent
PROJECT_DIR = BACKEND_DIR.parent
FRONTEND_DIR = PROJECT_DIR / "frontend"
UPLOADS_DIR = PROJECT_DIR / "uploads"

# 确保上传目录存在
UPLOADS_DIR.mkdir(exist_ok=True)

# ========================================
# 注册API路由
# ========================================
app.include_router(houses.router)
app.include_router(tags.router)

# ========================================
# 挂载静态文件
# ========================================
app.mount("/css", StaticFiles(directory=FRONTEND_DIR / "css"), name="css")
app.mount("/js", StaticFiles(directory=FRONTEND_DIR / "js"), name="js")
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# ========================================
# 页面路由
# ========================================
@app.get("/")
async def read_root():
    """返回主页面"""
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/api/health")
async def health_check():
    """健康检查接口"""
    return {"status": "ok", "message": "服务运行正常", "version": "0.2.0"}


# ========================================
# 启动服务
# ========================================
if __name__ == "__main__":
    print("=" * 50)
    print("🏠 北京看房地图 - 后端服务启动")
    print("=" * 50)
    print(f"📁 项目目录: {PROJECT_DIR}")
    print(f"📁 前端目录: {FRONTEND_DIR}")
    print(f"📁 上传目录: {UPLOADS_DIR}")
    print("=" * 50)
    print("🌐 访问地址: http://localhost:8000")
    print("📖 API文档: http://localhost:8000/docs")
    print("=" * 50)
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
