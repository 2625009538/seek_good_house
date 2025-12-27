"""
Pydantic 数据模式定义
用于API请求/响应的数据验证
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


# ========================================
# 标签相关
# ========================================
class TagBase(BaseModel):
    name: str
    color: str = "#52c41a"
    icon: Optional[str] = None


class TagResponse(TagBase):
    id: int

    class Config:
        from_attributes = True


# ========================================
# 房屋相关
# ========================================
class HouseCreate(BaseModel):
    """创建房屋的请求体"""
    name: str = Field(..., min_length=1, max_length=100, description="小区名称")
    address: Optional[str] = Field(None, max_length=255, description="详细地址")
    longitude: float = Field(..., ge=-180, le=180, description="经度")
    latitude: float = Field(..., ge=-90, le=90, description="纬度")
    building_no: Optional[str] = Field(None, max_length=20, description="楼号")
    unit_no: Optional[str] = Field(None, max_length=20, description="单元号")
    floor: Optional[int] = Field(None, ge=-5, le=200, description="楼层")
    total_floors: Optional[int] = Field(None, ge=1, le=200, description="总层数")
    area: Optional[float] = Field(None, ge=0, description="面积(平米)")
    price: Optional[float] = Field(None, ge=0, description="价格(万元)")
    beike_url: Optional[str] = Field(None, max_length=500, description="贝壳链接")
    notes: Optional[str] = Field(None, description="备注/评价")
    rating: Optional[int] = Field(0, ge=0, le=5, description="评分1-5")
    tag_ids: Optional[List[int]] = Field(default=[], description="标签ID列表")


class HouseUpdate(BaseModel):
    """更新房屋的请求体"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    address: Optional[str] = None
    longitude: Optional[float] = None
    latitude: Optional[float] = None
    building_no: Optional[str] = None
    unit_no: Optional[str] = None
    floor: Optional[int] = None
    total_floors: Optional[int] = None
    area: Optional[float] = None
    price: Optional[float] = None
    beike_url: Optional[str] = None
    notes: Optional[str] = None
    rating: Optional[int] = None
    tag_ids: Optional[List[int]] = None


class HouseImageResponse(BaseModel):
    """图片响应"""
    id: int
    file_path: str
    file_name: Optional[str]
    description: Optional[str]
    uploaded_at: datetime

    class Config:
        from_attributes = True


class HouseResponse(BaseModel):
    """房屋响应"""
    id: int
    name: str
    address: Optional[str]
    longitude: float
    latitude: float
    building_no: Optional[str]
    unit_no: Optional[str]
    floor: Optional[int]
    total_floors: Optional[int]
    area: Optional[float]
    price: Optional[float]
    beike_url: Optional[str]
    notes: Optional[str]
    rating: int
    created_at: datetime
    updated_at: datetime
    tags: List[TagResponse] = []
    images: List[HouseImageResponse] = []

    class Config:
        from_attributes = True


class HouseMarker(BaseModel):
    """地图标记点的简化数据"""
    id: int
    name: str
    longitude: float
    latitude: float
    building_no: Optional[str]
    unit_no: Optional[str]
    floor: Optional[int]
    rating: int
    tag_count: int = 0

    class Config:
        from_attributes = True
