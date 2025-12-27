"""
数据库模型定义
"""

from sqlalchemy import Column, Integer, String, Text, DECIMAL, TIMESTAMP, Enum, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


# 房屋-标签关联表（多对多）
house_tags = Table(
    'house_tags',
    Base.metadata,
    Column('house_id', Integer, ForeignKey('houses.id', ondelete='CASCADE'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id', ondelete='CASCADE'), primary_key=True)
)


class User(Base):
    """用户表"""
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum('admin', 'user'), default='user')
    created_at = Column(TIMESTAMP, server_default=func.now())

    # 关联：用户创建的房屋
    houses = relationship("House", back_populates="creator")


class House(Base):
    """房屋表"""
    __tablename__ = 'houses'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, comment='小区名称')
    address = Column(String(255), comment='详细地址')
    longitude = Column(DECIMAL(10, 6), nullable=False, comment='经度')
    latitude = Column(DECIMAL(10, 6), nullable=False, comment='纬度')
    building_no = Column(String(20), comment='楼号')
    unit_no = Column(String(20), comment='单元号')
    floor = Column(Integer, comment='楼层')
    total_floors = Column(Integer, comment='总层数')
    area = Column(DECIMAL(10, 2), comment='面积(平米)')
    price = Column(DECIMAL(12, 2), comment='价格(万元)')
    beike_url = Column(String(500), comment='贝壳链接')
    notes = Column(Text, comment='备注/评价')
    rating = Column(Integer, default=0, comment='评分1-5')
    created_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # 关联
    creator = relationship("User", back_populates="houses")
    tags = relationship("Tag", secondary=house_tags, back_populates="houses")
    images = relationship("HouseImage", back_populates="house", cascade="all, delete-orphan")


class Tag(Base):
    """标签表"""
    __tablename__ = 'tags'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False, comment='标签名称')
    color = Column(String(7), default='#52c41a', comment='标签颜色')
    icon = Column(String(50), comment='图标')

    # 关联
    houses = relationship("House", secondary=house_tags, back_populates="tags")


class HouseImage(Base):
    """房屋图片表"""
    __tablename__ = 'house_images'

    id = Column(Integer, primary_key=True, autoincrement=True)
    house_id = Column(Integer, ForeignKey('houses.id', ondelete='CASCADE'), nullable=False)
    file_path = Column(String(500), nullable=False, comment='文件路径')
    file_name = Column(String(255), comment='原始文件名')
    description = Column(String(255), comment='图片描述')
    uploaded_at = Column(TIMESTAMP, server_default=func.now())

    # 关联
    house = relationship("House", back_populates="images")
