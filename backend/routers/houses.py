"""
房屋相关API路由
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from database import get_db
from models import House, Tag
from schemas import HouseCreate, HouseUpdate, HouseResponse, HouseMarker, TagResponse

router = APIRouter(prefix="/api/houses", tags=["houses"])


@router.get("/markers", response_model=List[HouseMarker])
def get_house_markers(db: Session = Depends(get_db)):
    """
    获取所有房屋标记点（简化数据，用于地图显示）
    """
    houses = db.query(House).all()
    markers = []
    for house in houses:
        markers.append(HouseMarker(
            id=house.id,
            name=house.name,
            longitude=float(house.longitude),
            latitude=float(house.latitude),
            building_no=house.building_no,
            unit_no=house.unit_no,
            floor=house.floor,
            rating=house.rating or 0,
            tag_count=len(house.tags)
        ))
    return markers


@router.get("/", response_model=List[HouseResponse])
def get_houses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    获取房屋列表
    """
    houses = db.query(House).offset(skip).limit(limit).all()
    return houses


@router.get("/{house_id}", response_model=HouseResponse)
def get_house(house_id: int, db: Session = Depends(get_db)):
    """
    获取单个房屋详情
    """
    house = db.query(House).filter(House.id == house_id).first()
    if not house:
        raise HTTPException(status_code=404, detail="房屋不存在")
    return house


@router.post("/", response_model=HouseResponse, status_code=status.HTTP_201_CREATED)
def create_house(house_data: HouseCreate, db: Session = Depends(get_db)):
    """
    创建新房屋
    """
    # 创建房屋对象
    house = House(
        name=house_data.name,
        address=house_data.address,
        longitude=house_data.longitude,
        latitude=house_data.latitude,
        building_no=house_data.building_no,
        unit_no=house_data.unit_no,
        floor=house_data.floor,
        total_floors=house_data.total_floors,
        area=house_data.area,
        price=house_data.price,
        beike_url=house_data.beike_url,
        notes=house_data.notes,
        rating=house_data.rating or 0
    )

    # 添加标签
    if house_data.tag_ids:
        tags = db.query(Tag).filter(Tag.id.in_(house_data.tag_ids)).all()
        house.tags = tags

    db.add(house)
    db.commit()
    db.refresh(house)
    return house


@router.put("/{house_id}", response_model=HouseResponse)
def update_house(house_id: int, house_data: HouseUpdate, db: Session = Depends(get_db)):
    """
    更新房屋信息
    """
    house = db.query(House).filter(House.id == house_id).first()
    if not house:
        raise HTTPException(status_code=404, detail="房屋不存在")

    # 更新非空字段
    update_data = house_data.dict(exclude_unset=True)
    
    # 单独处理标签
    tag_ids = update_data.pop('tag_ids', None)
    if tag_ids is not None:
        tags = db.query(Tag).filter(Tag.id.in_(tag_ids)).all()
        house.tags = tags

    # 更新其他字段
    for key, value in update_data.items():
        setattr(house, key, value)

    db.commit()
    db.refresh(house)
    return house


@router.delete("/{house_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_house(house_id: int, db: Session = Depends(get_db)):
    """
    删除房屋
    """
    house = db.query(House).filter(House.id == house_id).first()
    if not house:
        raise HTTPException(status_code=404, detail="房屋不存在")

    db.delete(house)
    db.commit()
    return None
